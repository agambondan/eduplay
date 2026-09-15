package ws

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math/rand"
	"strings"
	"sync"
	"time"

	"github.com/agambondan/eduplay/services/api/config"
	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/internal/service"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

const redisPubSubChannel = "ws:pubsub"

type AchievementChecker interface {
	CheckMPFirstWin(userID string) error
	CheckMP10Wins(userID string) error
	CheckMPBotSlayer(userID string) error
}

type GhostBotProvider func(gameID, difficulty string, userScore int) (*GhostBotPlayer, error)

type Hub struct {
	cfg        *config.Config
	Clients    map[string]*Client
	Rooms      *RoomManager
	Register   chan *Client
	Unregister chan *Client
	achSvc     AchievementChecker
	ghostFn    GhostBotProvider
	pubSub     *redisPubSubBridge
	mu         sync.RWMutex
	serverID   string
}

func NewHub(cfg *config.Config, roomMgr *RoomManager) *Hub {
	h := &Hub{
		cfg:        cfg,
		Clients:    make(map[string]*Client),
		Rooms:      roomMgr,
		Register:   make(chan *Client, 256),
		Unregister: make(chan *Client, 256),
		serverID:   uuid.New().String()[:8],
	}
	h.pubSub = newRedisPubSubBridge(h)
	return h
}

func (h *Hub) StartPubSub() {
	h.pubSub.Start()
}

func (h *Hub) PublishToRoom(roomID string, msgType string, payload interface{}) {
	data, _ := json.Marshal(map[string]interface{}{
		"type":    msgType,
		"payload": payload,
		"room_id": roomID,
	})
	database.RDB.Publish(context.Background(), redisPubSubChannel, string(data))
}

type redisPubSubBridge struct {
	hub  *Hub
	done chan struct{}
}

func newRedisPubSubBridge(hub *Hub) *redisPubSubBridge {
	return &redisPubSubBridge{hub: hub, done: make(chan struct{})}
}

func (ps *redisPubSubBridge) Start() {
	pubsub := database.RDB.Subscribe(context.Background(), redisPubSubChannel)
	go func() {
		ch := pubsub.Channel()
		for {
			select {
			case msg := <-ch:
				var envelope struct {
					Type    string          `json:"type"`
					Payload json.RawMessage `json:"payload"`
					RoomID  string          `json:"room_id"`
				}
				if err := json.Unmarshal([]byte(msg.Payload), &envelope); err != nil {
					continue
				}
				gameRoom, ok := ps.hub.Rooms.Get(envelope.RoomID)
				if !ok {
					continue
				}
				gameRoom.Broadcast(envelope.Type, envelope.Payload)
			case <-ps.done:
				pubsub.Close()
				return
			}
		}
	}()
}

func (ps *redisPubSubBridge) Stop() {
	close(ps.done)
}

func (h *Hub) SetAchievementChecker(ach AchievementChecker) {
	h.achSvc = ach
}

func (h *Hub) SetGhostBotProvider(fn GhostBotProvider) {
	h.ghostFn = fn
}

func (h *Hub) checkAchievements(userID string) {
	if h.achSvc == nil || userID == "" || strings.HasPrefix(userID, "bot_") {
		return
	}
	h.achSvc.CheckMPFirstWin(userID)
	h.achSvc.CheckMP10Wins(userID)
	h.achSvc.CheckMPBotSlayer(userID)
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.mu.Lock()
			if oldClient, ok := h.Clients[client.UserID]; ok && oldClient.RoomID != "" {
				client.RoomID = oldClient.RoomID
				oldClient.mu.Lock()
				oldClient.Conn = nil
				oldClient.mu.Unlock()
				h.Rooms.CancelReconnectTimer(oldClient.RoomID, client.UserID)
				h.Clients[client.UserID] = client
				h.mu.Unlock()
				log.Printf("ws client RECONNECTED: %s (room: %s)", client.UserID, client.RoomID)
				if room, ok := h.Rooms.Get(client.RoomID); ok {
					room.BroadcastExcept(client.UserID, "player_reconnected", map[string]string{
						"player_id": client.UserID,
					})
				}
				client.SendMessage("room_joined", map[string]interface{}{
					"room_id":     client.RoomID,
					"reconnected": true,
				})
			} else {
				h.Clients[client.UserID] = client
				h.mu.Unlock()
				log.Printf("ws client connected: %s", client.UserID)
			}

		case client := <-h.Unregister:
			h.mu.Lock()
			// current != client means a newer connection already replaced
			// this one (the client reconnected before this stale socket's
			// read loop finally errored out) — the room already knows about
			// the new connection, so skip the disconnect side effects below
			// entirely, otherwise they'd wrongly evict an actively-connected
			// player and force-forfeit them 30s later.
			current, ok := h.Clients[client.UserID]
			isCurrent := ok && current == client
			if isCurrent {
				delete(h.Clients, client.UserID)
			}
			h.mu.Unlock()

			if isCurrent && client.RoomID != "" {
				log.Printf("ws client disconnected, reconnect window: %s (room: %s)", client.UserID, client.RoomID)
				if room, ok := h.Rooms.Get(client.RoomID); ok {
					room.BroadcastExcept(client.UserID, "player_disconnected", map[string]string{
						"player_id": client.UserID,
					})
				}
				h.Rooms.StartReconnectTimer(client.RoomID, client.UserID, 30*time.Second, h)
			}
		}
	}
}

func (h *Hub) WSHandler() fiber.Handler {
	return websocket.New(func(conn *websocket.Conn) {
		tokenStr := conn.Query("token")
		if tokenStr == "" {
			return
		}

		userID, err := h.validateToken(tokenStr)
		if err != nil {
			return
		}

		client := NewClient(h, conn, userID)
		h.Register <- client
		defer func() {
			h.Unregister <- client
			conn.Close()
		}()

		conn.SetReadLimit(4096)

		for {
			_, message, err := conn.ReadMessage()
			if err != nil {
				break
			}

			var msg WSMessage
			if err := json.Unmarshal(message, &msg); err != nil {
				continue
			}
			h.handleMessage(client, msg)
		}
	})
}

func (h *Hub) validateToken(tokenStr string) (string, error) {
	token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(h.cfg.JWT.Secret), nil
	}, jwt.WithValidMethods([]string{"HS256"}))
	if err != nil || !token.Valid {
		return "", err
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", errors.New("invalid claims")
	}

	sub, _ := claims["sub"].(string)
	return sub, nil
}

func (h *Hub) handleMessage(client *Client, msg WSMessage) {
	switch msg.Type {
	case "ping":
		client.SendMessage("pong", nil)

	case "join_room":
		var payload JoinRoomPayload
		if err := json.Unmarshal(msg.Payload, &payload); err != nil {
			client.SendMessage("error", map[string]string{"code": "INVALID_PAYLOAD", "message": "Invalid payload"})
			return
		}
		h.handleJoinRoom(client, payload.RoomID)

	case "submit_answer":
		var payload SubmitAnswerPayload
		if err := json.Unmarshal(msg.Payload, &payload); err != nil {
			return
		}
		h.handleSubmitAnswer(client, payload)

	case "submit_wordle_guess":
		var payload struct {
			RoomID string `json:"room_id"`
			Word   string `json:"word"`
		}
		if err := json.Unmarshal(msg.Payload, &payload); err != nil {
			return
		}
		h.handleWordleGuess(client, payload.RoomID, payload.Word)

	case "submit_sudoku_cell":
		var payload struct {
			RoomID string `json:"room_id"`
			Row    int    `json:"row"`
			Col    int    `json:"col"`
			Value  int    `json:"value"`
		}
		if err := json.Unmarshal(msg.Payload, &payload); err != nil {
			return
		}
		h.handleSudokuCell(client, payload.RoomID, payload.Row, payload.Col, payload.Value)

	case "crossword_cell":
		var payload struct {
			RoomID string `json:"room_id"`
			Row    int    `json:"row"`
			Col    int    `json:"col"`
			Letter string `json:"letter"`
		}
		if err := json.Unmarshal(msg.Payload, &payload); err != nil {
			return
		}
		h.handleCrosswordCell(client, payload.RoomID, payload.Row, payload.Col, payload.Letter)

	case "chess_move":
		var payload struct {
			RoomID string `json:"room_id"`
			Move   string `json:"move"`
		}
		if err := json.Unmarshal(msg.Payload, &payload); err != nil {
			return
		}
		h.handleChessMove(client, payload.RoomID, payload.Move)

	case "submit_flag_answer":
		var payload SubmitFlagAnswerPayload
		if err := json.Unmarshal(msg.Payload, &payload); err != nil {
			return
		}
		h.handleFlagTeamAnswer(client, payload)

	case "leave_room":
		var payload struct {
			RoomID string `json:"room_id"`
		}
		if err := json.Unmarshal(msg.Payload, &payload); err != nil {
			return
		}
		h.handleLeaveRoom(client, payload.RoomID)
	}
}

// handleLeaveRoom handles a player intentionally leaving/resigning from a
// room (e.g. clicking a Resign button). If the match is still in progress
// and another player remains, this forfeits the leaving player and
// broadcasts a proper game_over so the remaining player's screen resolves
// instead of waiting forever — previously this just silently removed the
// player from the room with no forfeit and no notification at all.
func (h *Hub) handleLeaveRoom(client *Client, roomID string) {
	if room, ok := h.Rooms.Get(roomID); ok {
		room.mu.Lock()
		player, exists := room.Players[client.UserID]
		otherPlayers := 0
		for id := range room.Players {
			if id != client.UserID {
				otherPlayers++
			}
		}
		shouldForfeit := exists && room.State == "playing" && otherPlayers > 0
		if shouldForfeit {
			player.Forfeited = true
			room.State = "finished"
			room.FinishedAt = nowPtr()
		}
		room.mu.Unlock()

		if shouldForfeit {
			room.BroadcastExcept(client.UserID, "player_forfeited", map[string]string{
				"player_id": client.UserID,
			})

			results := room.calculateResults()
			winnerID := room.getWinnerID(results)
			room.Broadcast("game_over", GameOverPayload{
				Results:  results,
				WinnerID: winnerID,
				XPEarned: 50,
			})
			if winnerID != "" {
				room.persistFinishedMatch(results, winnerID)
				if !strings.HasPrefix(winnerID, "bot_") {
					h.checkAchievements(winnerID)
				}
			}
		}
	}

	h.Rooms.LeaveRoom(roomID, client.UserID)
	client.RoomID = ""
}

func (h *Hub) handleJoinRoom(client *Client, roomID string) {
	if strings.HasPrefix(roomID, "math_battle:") || strings.HasPrefix(roomID, "tournament:") {
		isTournamentRoom := strings.HasPrefix(roomID, "tournament:")
		difficulty := roomDifficulty(roomID, "math_battle")
		hasTournamentBot := false
		if isTournamentRoom {
			tournamentDifficulty, tournamentHasBot, err := h.tournamentRoomConfig(roomID)
			if err != nil {
				client.SendMessage("error", map[string]string{"code": "TOURNAMENT_ROOM_INVALID", "message": err.Error()})
				return
			}
			difficulty = tournamentDifficulty
			hasTournamentBot = tournamentHasBot
		}
		room, ok := h.Rooms.Get(roomID)
		if !ok {
			gameID := h.getGameID("math-battle")
			room = h.Rooms.CreateRoom(roomID, "math_battle", RoomSettings{
				GameSlug:   "math-battle",
				Difficulty: difficulty,
				Questions:  15,
				Timer:      4,
				MaxPlayers: 2,
			}, gameID)
		}

		var u model.User
		database.DB.First(&u, "id = ?", client.UserID)

		reconnected := room.HasPlayer(client.UserID)
		if isTournamentRoom && !reconnected && !h.canJoinTournamentMatch(roomID, client.UserID) {
			if !h.canSpectateTournamentRoom(roomID, client.UserID) {
				client.SendMessage("error", map[string]string{"code": "TOURNAMENT_ACCESS_DENIED", "message": "Tidak punya akses match tournament"})
				return
			}
			room.mu.Lock()
			if room.Spectators == nil {
				room.Spectators = make(map[string]*Client)
			}
			room.Spectators[client.UserID] = client
			room.mu.Unlock()
			client.RoomID = roomID
			client.SendMessage("room_joined", map[string]interface{}{
				"room_id":   roomID,
				"players":   room.GetPlayers(),
				"spectator": true,
			})
			client.SendMessage("room_state", room.CurrentStatePayload())
			return
		}
		h.Rooms.JoinRoom(roomID, client.UserID, u.Username, u.Level)
		if reconnected {
			h.Rooms.CancelReconnectTimer(roomID, client.UserID)
		}

		if room, ok := h.Rooms.Get(roomID); ok {
			room.mu.Lock()
			if room.ClientMap == nil {
				room.ClientMap = make(map[string]*Client)
			}
			room.ClientMap[client.UserID] = client
			if p, exists := room.Players[client.UserID]; exists {
				p.Client = client
			}
			room.mu.Unlock()
		}

		oldRoomID := client.RoomID
		if oldRoomID != "" && oldRoomID != roomID {
			h.Rooms.LeaveRoom(oldRoomID, client.UserID)
		}
		client.RoomID = roomID

		client.SendMessage("room_joined", map[string]interface{}{
			"room_id":     roomID,
			"players":     room.GetPlayers(),
			"reconnected": reconnected,
		})
		client.SendMessage("room_state", room.CurrentStatePayload())

		if reconnected {
			room.BroadcastExcept(client.UserID, "player_reconnected", map[string]string{
				"player_id": client.UserID,
			})
		} else {
			room.BroadcastExcept(client.UserID, "player_joined", PlayerInfo{
				ID:       client.UserID,
				Username: u.Username,
				Level:    u.Level,
			})
		}

		if room.State == "waiting" && room.IsFull() {
			go room.StartGame(h, h.cfg)
		} else if room.State == "waiting" && room.Bot == nil && room.GhostPlayer == nil && (!isTournamentRoom || hasTournamentBot) {
			h.tryAddGhostOrBot(room, client.UserID)
			time.Sleep(500 * time.Millisecond)
			go room.StartGame(h, h.cfg)
		}
	} else if strings.HasPrefix(roomID, "wordle_duel:") {
		room, ok := h.Rooms.Get(roomID)
		if !ok {
			gameID := h.getGameID("wordle")
			room = h.Rooms.CreateRoom(roomID, "wordle_duel", RoomSettings{
				GameSlug:   "wordle",
				Difficulty: roomDifficulty(roomID, "wordle_duel"),
				MaxPlayers: 2,
			}, gameID)
		}

		var u model.User
		database.DB.First(&u, "id = ?", client.UserID)
		reconnected := room.HasPlayer(client.UserID)
		h.Rooms.JoinRoom(roomID, client.UserID, u.Username, u.Level)
		if reconnected {
			h.Rooms.CancelReconnectTimer(roomID, client.UserID)
		}

		room.mu.Lock()
		if room.ClientMap == nil {
			room.ClientMap = make(map[string]*Client)
		}
		room.ClientMap[client.UserID] = client
		if p, exists := room.Players[client.UserID]; exists {
			p.Client = client
		}
		if room.Bot == nil && room.GhostPlayer == nil && len(room.Players) == 1 {
			room.mu.Unlock()
			h.tryAddGhostOrBot(room, client.UserID)
			room.mu.Lock()
		}
		room.mu.Unlock()

		oldRoomID := client.RoomID
		if oldRoomID != "" && oldRoomID != roomID {
			h.Rooms.LeaveRoom(oldRoomID, client.UserID)
		}
		client.RoomID = roomID
		client.SendMessage("room_joined", map[string]interface{}{"room_id": roomID, "players": room.GetPlayers(), "reconnected": reconnected})
		client.SendMessage("room_state", room.CurrentStatePayload())

		if reconnected {
			room.BroadcastExcept(client.UserID, "player_reconnected", map[string]string{
				"player_id": client.UserID,
			})
		}

		if room.State == "waiting" && room.IsFull() {
			go h.startWordleDuel(room)
		}

	} else if strings.HasPrefix(roomID, "sudoku_race:") {
		room, ok := h.Rooms.Get(roomID)
		if !ok {
			gameID := h.getGameID("sudoku")
			room = h.Rooms.CreateRoom(roomID, "sudoku_race", RoomSettings{
				GameSlug:   "sudoku",
				Difficulty: roomDifficulty(roomID, "sudoku_race"),
				MaxPlayers: 2,
			}, gameID)
		}

		var u model.User
		database.DB.First(&u, "id = ?", client.UserID)
		reconnected := room.HasPlayer(client.UserID)
		h.Rooms.JoinRoom(roomID, client.UserID, u.Username, u.Level)
		if reconnected {
			h.Rooms.CancelReconnectTimer(roomID, client.UserID)
		}

		room.mu.Lock()
		if room.ClientMap == nil {
			room.ClientMap = make(map[string]*Client)
		}
		room.ClientMap[client.UserID] = client
		if p, exists := room.Players[client.UserID]; exists {
			p.Client = client
		}
		if room.Bot == nil && room.GhostPlayer == nil && len(room.Players) == 1 {
			room.mu.Unlock()
			h.tryAddGhostOrBot(room, client.UserID)
			room.mu.Lock()
		}
		room.mu.Unlock()

		oldRoomID := client.RoomID
		if oldRoomID != "" && oldRoomID != roomID {
			h.Rooms.LeaveRoom(oldRoomID, client.UserID)
		}
		client.RoomID = roomID
		client.SendMessage("room_joined", map[string]interface{}{"room_id": roomID, "players": room.GetPlayers(), "reconnected": reconnected})
		client.SendMessage("room_state", room.CurrentStatePayload())

		if reconnected {
			room.BroadcastExcept(client.UserID, "player_reconnected", map[string]string{
				"player_id": client.UserID,
			})
		}

		if room.State == "waiting" && room.IsFull() {
			go h.startSudokuRace(room)
		}
	} else if strings.HasPrefix(roomID, "chess:") {
		room, ok := h.Rooms.Get(roomID)
		if !ok {
			gameID := h.getGameID("chess")
			room = h.Rooms.CreateRoom(roomID, "chess", RoomSettings{
				GameSlug:   "chess",
				Difficulty: roomDifficulty(roomID, "chess"),
				MaxPlayers: 2,
			}, gameID)
		}

		var u model.User
		database.DB.First(&u, "id = ?", client.UserID)
		reconnected := room.HasPlayer(client.UserID)
		h.Rooms.JoinRoom(roomID, client.UserID, u.Username, u.Level)
		if reconnected {
			h.Rooms.CancelReconnectTimer(roomID, client.UserID)
		}

		room.mu.Lock()
		if room.ClientMap == nil {
			room.ClientMap = make(map[string]*Client)
		}
		room.ClientMap[client.UserID] = client
		if p, exists := room.Players[client.UserID]; exists {
			p.Client = client
		}
		if room.Bot == nil && room.GhostPlayer == nil && len(room.Players) == 1 {
			room.mu.Unlock()
			h.tryAddGhostOrBot(room, client.UserID)
			room.mu.Lock()
		}
		room.mu.Unlock()

		oldRoomID := client.RoomID
		if oldRoomID != "" && oldRoomID != roomID {
			h.Rooms.LeaveRoom(oldRoomID, client.UserID)
		}
		client.RoomID = roomID
		client.SendMessage("room_joined", map[string]interface{}{"room_id": roomID, "players": room.GetPlayers(), "reconnected": reconnected})
		client.SendMessage("room_state", room.CurrentStatePayload())

		if reconnected {
			room.BroadcastExcept(client.UserID, "player_reconnected", map[string]string{
				"player_id": client.UserID,
			})
		}

		if room.State == "waiting" && room.IsFull() {
			go h.startChessGame(room)
		}
	} else if strings.HasPrefix(roomID, "crossword_duel:") || strings.HasPrefix(roomID, "crossword_coop:") {
		isCoop := strings.HasPrefix(roomID, "crossword_coop:")
		gameSlug := "crossword-duel"
		roomType := "crossword_duel"
		maxPlayers := 2
		if isCoop {
			gameSlug = "crossword-coop"
			roomType = "crossword_coop"
			maxPlayers = 4
		}

		room, ok := h.Rooms.Get(roomID)
		if !ok {
			gameID := h.getGameID(gameSlug)
			settings := RoomSettings{
				GameSlug:   gameSlug,
				Difficulty: roomDifficulty(roomID, roomType),
				MaxPlayers: maxPlayers,
			}
			room = h.Rooms.CreateRoom(roomID, roomType, settings, gameID)
		}

		var u model.User
		database.DB.First(&u, "id = ?", client.UserID)
		reconnected := room.HasPlayer(client.UserID)
		h.Rooms.JoinRoom(roomID, client.UserID, u.Username, u.Level)
		if reconnected {
			h.Rooms.CancelReconnectTimer(roomID, client.UserID)
		}

		room.mu.Lock()
		if room.ClientMap == nil {
			room.ClientMap = make(map[string]*Client)
		}
		room.ClientMap[client.UserID] = client
		if p, exists := room.Players[client.UserID]; exists {
			p.Client = client
		}
		if room.Bot == nil && room.GhostPlayer == nil && len(room.Players) == 1 && !isCoop {
			room.mu.Unlock()
			h.tryAddGhostOrBot(room, client.UserID)
			room.mu.Lock()
		}
		room.mu.Unlock()

		oldRoomID := client.RoomID
		if oldRoomID != "" && oldRoomID != roomID {
			h.Rooms.LeaveRoom(oldRoomID, client.UserID)
		}
		client.RoomID = roomID
		client.SendMessage("room_joined", map[string]interface{}{"room_id": roomID, "players": room.GetPlayers(), "reconnected": reconnected})

		if reconnected {
			room.BroadcastExcept(client.UserID, "player_reconnected", map[string]string{
				"player_id": client.UserID,
			})
		}

		if room.State == "waiting" && room.IsFull() {
			go h.startCrosswordGame(room, isCoop)
		} else if room.State == "waiting" && isCoop {
			// Crossword Co-op needs up to 4 players, but every join lands in a
			// freshly generated room (no room-code sharing exists for this game
			// yet), so it can never actually reach 4 real players on its own.
			// Top off with bots after a short grace period instead of waiting
			// forever.
			h.scheduleBotFillStart(room, 3*time.Second, func(r *GameRoom) {
				h.startCrosswordGame(r, isCoop)
			})
		}
	} else if strings.HasPrefix(roomID, "math_relay:") {
		room, ok := h.Rooms.Get(roomID)
		if !ok {
			gameID := h.getGameID("math-relay")
			settings := RoomSettings{
				GameSlug:   "math-relay",
				Difficulty: roomDifficulty(roomID, "math_relay"),
				MaxPlayers: 4,
				Questions:  20,
				Timer:      8,
			}
			room = h.Rooms.CreateRoom(roomID, "math_relay", settings, gameID)
		}

		var u model.User
		database.DB.First(&u, "id = ?", client.UserID)
		reconnected := room.HasPlayer(client.UserID)
		h.Rooms.JoinRoom(roomID, client.UserID, u.Username, u.Level)
		if reconnected {
			h.Rooms.CancelReconnectTimer(roomID, client.UserID)
		}

		room.mu.Lock()
		if room.ClientMap == nil {
			room.ClientMap = make(map[string]*Client)
		}
		room.ClientMap[client.UserID] = client
		if p, exists := room.Players[client.UserID]; exists {
			p.Client = client
		}
		room.mu.Unlock()

		oldRoomID := client.RoomID
		if oldRoomID != "" && oldRoomID != roomID {
			h.Rooms.LeaveRoom(oldRoomID, client.UserID)
		}
		client.RoomID = roomID
		client.SendMessage("room_joined", map[string]interface{}{"room_id": roomID, "players": room.GetPlayers(), "reconnected": reconnected})

		if reconnected {
			room.BroadcastExcept(client.UserID, "player_reconnected", map[string]string{
				"player_id": client.UserID,
			})
		}

		if room.State == "waiting" && room.IsFull() {
			go h.startMathRelay(room)
		} else if room.State == "waiting" {
			// Math Relay needs up to 4 players, but every join lands in a
			// freshly generated room (no room-code sharing exists for this
			// game yet), so it can never actually reach 4 real players on its
			// own. Top off with bots after a short grace period instead of
			// waiting forever.
			h.scheduleBotFillStart(room, 3*time.Second, h.startMathRelay)
		}
	} else if strings.HasPrefix(roomID, "quiz_showdown:") {
		roomData, hasRoomData := loadRoomDataFromCode(roomID, "quiz_showdown")
		settings := RoomSettings{
			RoomCode:   roomCodeFromID(roomID, "quiz_showdown"),
			GameSlug:   "quiz-showdown",
			Category:   "mix",
			Difficulty: "medium",
			Questions:  20,
			Timer:      10,
			MaxPlayers: 4,
			AllowBots:  true,
		}
		if hasRoomData {
			settings = roomSettingsFromData(roomData)
		}

		room, ok := h.Rooms.Get(roomID)
		if !ok {
			gameID := h.getGameID("quiz-showdown")
			room = h.Rooms.CreateRoom(roomID, "quiz_showdown", settings, gameID)
		}

		isRoomMember := hasRoomData && roomDataHasMember(roomData, client.UserID)
		room.mu.RLock()
		_, alreadyJoined := room.Players[client.UserID]
		roomFull := len(room.Players) >= room.Settings.MaxPlayers
		roomState := room.State
		room.mu.RUnlock()
		if roomFull && !alreadyJoined && !isRoomMember {
			client.SendMessage("error", map[string]string{"code": "ROOM_FULL", "message": "Room sudah penuh"})
			return
		}
		if roomState != "waiting" && !alreadyJoined && !isRoomMember {
			client.SendMessage("error", map[string]string{"code": "ROOM_STARTED", "message": "Match sudah dimulai"})
			return
		}
		if roomFull && !alreadyJoined && isRoomMember {
			room.RemoveOneBot()
		}

		var u model.User
		database.DB.First(&u, "id = ?", client.UserID)
		reconnected := room.HasPlayer(client.UserID)
		h.Rooms.JoinRoom(roomID, client.UserID, u.Username, u.Level)
		if reconnected {
			h.Rooms.CancelReconnectTimer(roomID, client.UserID)
		}

		room.mu.Lock()
		if room.ClientMap == nil {
			room.ClientMap = make(map[string]*Client)
		}
		room.ClientMap[client.UserID] = client
		if p, exists := room.Players[client.UserID]; exists {
			p.Client = client
		}
		room.mu.Unlock()

		oldRoomID := client.RoomID
		if oldRoomID != "" && oldRoomID != roomID {
			h.Rooms.LeaveRoom(oldRoomID, client.UserID)
		}
		client.RoomID = roomID
		client.SendMessage("room_joined", map[string]interface{}{"room_id": roomID, "players": room.GetPlayers(), "reconnected": reconnected})
		client.SendMessage("room_state", room.CurrentStatePayload())

		if reconnected {
			room.BroadcastExcept(client.UserID, "player_reconnected", map[string]string{
				"player_id": client.UserID,
			})
		} else {
			room.BroadcastExcept(client.UserID, "player_joined", PlayerInfo{
				ID:       client.UserID,
				Username: u.Username,
				Level:    u.Level,
			})
		}

		shouldStart := room.State == "waiting" && room.IsFull()
		if room.State == "waiting" && hasRoomData && roomData.Status == "playing" {
			if room.Settings.AllowBots {
				for _, bot := range room.FillBotsUntilFull() {
					room.Broadcast("bot_joined", BotInfo{
						ID:         bot.UserID,
						Username:   bot.DisplayName,
						Difficulty: bot.Difficulty,
					})
				}
			}
			shouldStart = room.IsFull()
		}
		if shouldStart {
			go room.StartGame(h, h.cfg)
		}
	} else if strings.HasPrefix(roomID, "flag_team_battle:") {
		room, ok := h.Rooms.Get(roomID)
		if !ok {
			gameID := h.getGameID("flag-team-battle")
			room = h.Rooms.CreateRoom(roomID, "flag_team_battle", RoomSettings{
				GameSlug:   "flag-team-battle",
				Difficulty: roomDifficulty(roomID, "flag_team_battle"),
				MaxPlayers: 4,
			}, gameID)
		}

		room.mu.RLock()
		_, alreadyJoined := room.Players[client.UserID]
		roomFull := len(room.Players) >= room.Settings.MaxPlayers
		roomState := room.State
		room.mu.RUnlock()
		if roomFull && !alreadyJoined {
			client.SendMessage("error", map[string]string{"code": "ROOM_FULL", "message": "Room sudah penuh"})
			return
		}
		if roomState != "waiting" && !alreadyJoined {
			client.SendMessage("error", map[string]string{"code": "ROOM_STARTED", "message": "Match sudah dimulai"})
			return
		}

		var u model.User
		database.DB.First(&u, "id = ?", client.UserID)
		h.Rooms.JoinRoom(roomID, client.UserID, u.Username, u.Level)

		room.mu.Lock()
		if room.ClientMap == nil {
			room.ClientMap = make(map[string]*Client)
		}
		room.ClientMap[client.UserID] = client
		if p, exists := room.Players[client.UserID]; exists {
			p.Client = client
		}
		room.mu.Unlock()

		oldRoomID := client.RoomID
		if oldRoomID != "" && oldRoomID != roomID {
			h.Rooms.LeaveRoom(oldRoomID, client.UserID)
		}
		client.RoomID = roomID
		client.SendMessage("room_joined", map[string]interface{}{"room_id": roomID, "players": room.GetPlayers()})
		room.BroadcastExcept(client.UserID, "player_joined", PlayerInfo{ID: client.UserID, Username: u.Username, Level: u.Level})

		h.scheduleFlagTeamStart(roomID)
	}
}

func loadRoomDataFromCode(roomID, prefix string) (*service.RoomData, bool) {
	code := roomCodeFromID(roomID, prefix)
	if code == "" {
		return nil, false
	}
	raw, err := database.RDB.Get(context.Background(), "room:"+code).Result()
	if err != nil {
		return nil, false
	}
	var room service.RoomData
	if err := json.Unmarshal([]byte(raw), &room); err != nil {
		return nil, false
	}
	return &room, true
}

func (h *Hub) tournamentRoomConfig(roomID string) (string, bool, error) {
	var match model.TournamentMatch
	if err := database.DB.Where("room_id = ?", roomID).First(&match).Error; err != nil {
		return "", false, errors.New("match tournament tidak ditemukan")
	}
	var tournament model.Tournament
	if err := database.DB.Where("id = ?", match.TournamentID).First(&tournament).Error; err != nil {
		return "", false, errors.New("tournament tidak ditemukan")
	}

	playerIDs := make([]uuid.UUID, 0, 2)
	if match.Player1ID != nil {
		playerIDs = append(playerIDs, *match.Player1ID)
	}
	if match.Player2ID != nil {
		playerIDs = append(playerIDs, *match.Player2ID)
	}
	var botCount int64
	if len(playerIDs) > 0 {
		database.DB.Model(&model.TournamentPlayer{}).
			Where("id IN ? AND user_id IS NULL", playerIDs).
			Count(&botCount)
	}
	return tournament.Difficulty, botCount > 0, nil
}

func (h *Hub) canJoinTournamentMatch(roomID, userID string) bool {
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return false
	}
	var count int64
	database.DB.Table("tournament_matches AS tm").
		Joins("JOIN tournament_players AS p ON p.id = tm.player1_id OR p.id = tm.player2_id").
		Where("tm.room_id = ? AND p.user_id = ?", roomID, userUUID).
		Count(&count)
	return count > 0
}

func (h *Hub) canSpectateTournamentRoom(roomID, userID string) bool {
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return false
	}
	var match model.TournamentMatch
	if err := database.DB.Where("room_id = ?", roomID).First(&match).Error; err != nil {
		return false
	}
	var count int64
	database.DB.Model(&model.TournamentPlayer{}).
		Where("tournament_id = ? AND user_id = ?", match.TournamentID, userUUID).
		Count(&count)
	return count > 0
}

func roomCodeFromID(roomID, prefix string) string {
	value := strings.TrimPrefix(roomID, prefix+":")
	parts := strings.SplitN(value, ":", 2)
	return strings.TrimSpace(parts[0])
}

func roomSettingsFromData(room *service.RoomData) RoomSettings {
	return RoomSettings{
		RoomCode:   room.RoomCode,
		GameSlug:   room.GameSlug,
		Category:   room.Settings.Category,
		Difficulty: room.Settings.Difficulty,
		Questions:  room.Settings.Questions,
		Timer:      room.Settings.Timer,
		MaxPlayers: room.Settings.MaxPlayers,
		AllowBots:  room.Settings.AllowBots,
	}
}

func roomDataHasMember(room *service.RoomData, userID string) bool {
	for _, member := range room.Members {
		if member.ID == userID {
			return true
		}
	}
	return false
}

func (h *Hub) startWordleDuel(room *GameRoom) {
	target := pickWordleWord()
	room.mu.Lock()
	room.GameData = map[string]interface{}{
		"target_word": target,
		"guesses":     map[string][]string{},
	}
	room.State = "playing"
	room.mu.Unlock()

	room.Broadcast("game_starting", map[string]int{"countdown": 3})
	time.Sleep(2 * time.Second)
	room.Broadcast("wordle_start", map[string]int{"word_length": 5})
}

func (h *Hub) handleWordleGuess(client *Client, roomID, word string) {
	room, ok := h.Rooms.Get(roomID)
	if !ok {
		return
	}

	room.mu.Lock()
	target, _ := room.GameData["target_word"].(string)
	if target == "" {
		room.mu.Unlock()
		return
	}

	guesses, _ := room.GameData["guesses"].(map[string][]string)
	if guesses == nil {
		guesses = map[string][]string{}
	}
	playerGuesses := guesses[client.UserID]
	if len(playerGuesses) >= 6 {
		room.mu.Unlock()
		client.SendMessage("error", map[string]string{"message": "Sudah 6 percobaan"})
		return
	}

	word = strings.ToLower(strings.TrimSpace(word))
	if len(word) != 5 {
		room.mu.Unlock()
		client.SendMessage("error", map[string]string{"message": "Kata harus 5 huruf"})
		return
	}

	playerGuesses = append(playerGuesses, word)
	guesses[client.UserID] = playerGuesses
	room.GameData["guesses"] = guesses

	result := evaluateWordleGuess(word, target)
	isCorrect := word == target
	guessNum := len(playerGuesses)

	// Track the order in which players finish (win or exhaust all 6
	// guesses) so a tie on attempt count can be broken by who finished
	// first, and so we know when EVERY player is done — not just whether
	// someone happened to guess correctly.
	finishOrder, _ := room.GameData["finish_order"].([]string)
	if isCorrect || guessNum >= 6 {
		alreadyFinished := false
		for _, id := range finishOrder {
			if id == client.UserID {
				alreadyFinished = true
				break
			}
		}
		if !alreadyFinished {
			finishOrder = append(finishOrder, client.UserID)
			room.GameData["finish_order"] = finishOrder
		}
	}

	playerIDs := make([]string, 0, len(room.Players))
	for id := range room.Players {
		playerIDs = append(playerIDs, id)
	}

	// A player is "done" once they've either guessed the word or run out of
	// attempts — not just when their *last* guess happens to equal the
	// target. The previous version only ever checked the latter, so a match
	// where one or both players exhausted all 6 guesses without solving it
	// would never send game_over and the match would hang forever.
	allDone := true
	for _, id := range playerIDs {
		g := guesses[id]
		last := ""
		if len(g) > 0 {
			last = g[len(g)-1]
		}
		if last != target && len(g) < 6 {
			allDone = false
			break
		}
	}

	var gameOverPayload *GameOverPayload
	if allDone {
		room.State = "finished"
		room.FinishedAt = nowPtr()

		payload := buildWordleGameOver(playerIDs, guesses, target, finishOrder)
		for i := range payload.Results {
			payload.Results[i].Username = room.getPlayerName(payload.Results[i].PlayerID)
		}
		gameOverPayload = &payload
	}
	room.mu.Unlock()

	client.SendMessage("wordle_result", map[string]interface{}{
		"word":     word,
		"result":   result,
		"attempts": guessNum,
		"correct":  isCorrect,
	})

	room.Broadcast("opponent_progress", map[string]interface{}{
		"player_id": client.UserID,
		"attempts":  guessNum,
	})

	if gameOverPayload != nil {
		room.Broadcast("game_over", *gameOverPayload)
		if gameOverPayload.WinnerID != "" {
			room.persistFinishedMatch(gameOverPayload.Results, gameOverPayload.WinnerID)
			if !strings.HasPrefix(gameOverPayload.WinnerID, "bot_") {
				h.checkAchievements(gameOverPayload.WinnerID)
			}
		}
	}
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

// buildWordleGameOver computes the winner and per-player results once every
// player is done (won or exhausted 6 guesses): fewer attempts wins; a tie on
// attempts is broken by finishOrder (who finished first); if nobody guessed
// correctly there's no winner (draw). Score is the number of attempts used,
// which the frontend displays directly as "Percobaanmu"/"Percobaan lawan".
func buildWordleGameOver(playerIDs []string, guesses map[string][]string, target string, finishOrder []string) GameOverPayload {
	finishRank := make(map[string]int, len(finishOrder))
	for i, id := range finishOrder {
		finishRank[id] = i
	}

	results := make([]PlayerResult, 0, len(playerIDs))
	winnerID := ""
	bestAttempts := 0
	for _, id := range playerIDs {
		g := guesses[id]
		won := len(g) > 0 && g[len(g)-1] == target
		results = append(results, PlayerResult{
			PlayerID: id,
			Score:    len(g),
			Correct:  boolToInt(won),
		})
		if !won {
			continue
		}
		attempts := len(g)
		switch {
		case winnerID == "":
			winnerID, bestAttempts = id, attempts
		case attempts < bestAttempts:
			winnerID, bestAttempts = id, attempts
		case attempts == bestAttempts && finishRank[id] < finishRank[winnerID]:
			winnerID = id
		}
	}
	for i := range results {
		results[i].IsWinner = results[i].PlayerID == winnerID
	}
	return GameOverPayload{Results: results, WinnerID: winnerID, XPEarned: 50}
}

func (h *Hub) startSudokuRace(room *GameRoom) {
	diff := room.Settings.Difficulty
	if diff == "" {
		diff = "medium"
	}
	puzzle := generateSudokuPuzzle(diff)

	var solution [9][9]int
	copy(solution[:], puzzle[:])
	solveSudoku(&solution)

	room.mu.Lock()
	room.GameData = map[string]interface{}{
		"puzzle":   puzzle,
		"solution": solution,
		"progress": map[string]int{},
	}
	room.State = "playing"
	room.mu.Unlock()

	room.Broadcast("game_starting", map[string]int{"countdown": 3})
	time.Sleep(2 * time.Second)
	room.Broadcast("sudoku_start", map[string]interface{}{
		"puzzle": puzzle,
	})

	go func() {
		select {
		case <-time.After(10 * time.Minute):
			room.mu.Lock()
			if room.State == "playing" {
				room.State = "finished"
				room.FinishedAt = nowPtr()
				room.mu.Unlock()
				room.Broadcast("game_over", GameOverPayload{XPEarned: 25})
			} else {
				room.mu.Unlock()
			}
		case <-room.done:
		}
	}()
}

func (h *Hub) handleSudokuCell(client *Client, roomID string, row, col, value int) {
	room, ok := h.Rooms.Get(roomID)
	if !ok {
		return
	}

	if row < 0 || row > 8 || col < 0 || col > 8 {
		return
	}

	room.mu.Lock()
	puzzle, ok := room.GameData["puzzle"].([9][9]int)
	if !ok {
		room.mu.Unlock()
		return
	}

	if puzzle[row][col] != 0 {
		room.mu.Unlock()
		return
	}

	solution, _ := room.GameData["solution"].([9][9]int)
	if solution[row][col] != value {
		room.mu.Unlock()
		client.SendMessage("sudoku_error", map[string]interface{}{
			"message": "Nilai salah",
			"row":     row,
			"col":     col,
		})
		return
	}

	puzzle[row][col] = value
	room.GameData["puzzle"] = puzzle

	progress, _ := room.GameData["progress"].(map[string]int)
	if progress == nil {
		progress = map[string]int{}
	}
	progress[client.UserID] = sudokuProgress(&puzzle)
	room.GameData["progress"] = progress
	pct := progress[client.UserID]

	isComplete := isSudokuComplete(&puzzle, &solution)

	progressSnapshot := make(map[string]int, len(progress))
	for k, v := range progress {
		progressSnapshot[k] = v
	}

	room.mu.Unlock()

	client.SendMessage("sudoku_cell_ok", map[string]interface{}{
		"row": row, "col": col, "value": value,
	})
	room.Broadcast("opponent_progress", map[string]interface{}{
		"player_id": client.UserID,
		"progress":  pct,
	})

	if isComplete {
		room.mu.Lock()
		room.State = "finished"
		room.FinishedAt = nowPtr()

		var results []PlayerResult
		for _, p := range room.Players {
			filled := 0
			if p.ID == client.UserID {
				filled = 81
			} else if pct, ok := progressSnapshot[p.ID]; ok {
				filled = pct * 81 / 100
			}
			results = append(results, PlayerResult{
				PlayerID: p.ID,
				Username: p.Username,
				Score:    filled,
				Correct:  filled,
				IsWinner: p.ID == client.UserID,
			})
		}
		room.mu.Unlock()

		room.Broadcast("game_over", GameOverPayload{
			Results:  results,
			WinnerID: client.UserID,
			XPEarned: 100,
		})

		if !strings.HasPrefix(client.UserID, "bot_") {
			h.checkAchievements(client.UserID)
		}
	}
}

func (h *Hub) handleSubmitAnswer(client *Client, payload SubmitAnswerPayload) {
	room, ok := h.Rooms.Get(payload.RoomID)
	if !ok {
		client.SendMessage("error", map[string]string{"code": "ROOM_NOT_FOUND"})
		return
	}
	room.SubmitAnswer(client.UserID, payload.QuestionID, payload.Answer, payload.TimeTaken)
}

func (h *Hub) tryAddGhostOrBot(room *GameRoom, userID string) {
	if h.ghostFn != nil {
		var avgScore int
		database.DB.Raw(`
			SELECT COALESCE(AVG(gs.score), 0)
			FROM game_sessions gs
			JOIN games g ON g.id = gs.game_id
			WHERE gs.user_id = ? AND g.slug = ?
		`, userID, room.Settings.GameSlug).Scan(&avgScore)

		ghost, err := h.ghostFn(room.GameID, room.Settings.Difficulty, int(avgScore))
		if err == nil && ghost != nil {
			room.mu.Lock()
			room.GhostPlayer = ghost
			room.Players[ghost.UserID] = &Player{
				ID: ghost.UserID, Username: ghost.DisplayName, Level: 1,
				Score: 0, Correct: 0, Wrong: 0, JoinedAt: time.Now(),
			}
			room.mu.Unlock()
			room.Broadcast("bot_joined", BotInfo{
				ID:         ghost.UserID,
				Username:   ghost.DisplayName,
				Difficulty: room.Settings.Difficulty,
			})
			return
		}
	}

	bot := room.AddBot()
	if bot != nil {
		room.Broadcast("bot_joined", BotInfo{
			ID:         bot.UserID,
			Username:   bot.DisplayName,
			Difficulty: bot.Difficulty,
		})
	}
}

// scheduleBotFillStart waits a short grace period for more real players to
// join a room, then tops it off with bots up to MaxPlayers and starts the
// game via startFn. This is needed for games with MaxPlayers > 2 (Math
// Relay, Crossword Co-op): those rooms are always created fresh per
// quick-match request (there is no room-code/invite flow for them yet), so
// a single bot-add is never enough to reach IsFull() and the room would
// otherwise wait for real players forever.
func (h *Hub) scheduleBotFillStart(room *GameRoom, delay time.Duration, startFn func(*GameRoom)) {
	room.mu.Lock()
	if room.GameData == nil {
		room.GameData = map[string]interface{}{}
	}
	if room.State != "waiting" || room.GameData["bot_fill_scheduled"] == true {
		room.mu.Unlock()
		return
	}
	room.GameData["bot_fill_scheduled"] = true
	room.mu.Unlock()

	go func() {
		time.Sleep(delay)

		room.mu.RLock()
		stillWaiting := room.State == "waiting"
		room.mu.RUnlock()
		if !stillWaiting {
			return
		}

		for _, bot := range room.FillBotsUntilFull() {
			room.Broadcast("bot_joined", BotInfo{
				ID:         bot.UserID,
				Username:   bot.DisplayName,
				Difficulty: bot.Difficulty,
			})
		}

		startFn(room)
	}()
}

// startCrosswordGame builds a puzzle and starts a Crossword Duel/Co-op match.
// It guards against being triggered twice (once from the immediate
// IsFull() check, once from a delayed scheduleBotFillStart) by claiming the
// "playing" state atomically before doing any work.
func (h *Hub) startCrosswordGame(room *GameRoom, isCoop bool) {
	room.mu.Lock()
	if room.State != "waiting" {
		room.mu.Unlock()
		return
	}
	room.State = "playing"
	diff := room.Settings.Difficulty
	room.mu.Unlock()

	if diff == "" {
		diff = "medium"
	}
	puzzle := getRandomCrosswordPuzzle(diff)

	room.mu.Lock()
	room.GameData = map[string]interface{}{
		"puzzle":        puzzle,
		"filled_cells":  map[string]string{},
		"player_filled": map[string]int{},
		"coop":          isCoop,
	}
	room.mu.Unlock()

	room.Broadcast("game_starting", map[string]int{"countdown": 3})
	time.Sleep(2 * time.Second)
	room.Broadcast("crossword_start", puzzle)
}

func (h *Hub) startChessGame(room *GameRoom) {
	room.mu.Lock()
	players := make([]string, 0, len(room.Players))
	for _, p := range room.Players {
		players = append(players, p.ID)
	}
	playerWhite := ""
	playerBlack := ""
	if len(players) > 0 {
		playerWhite = players[0]
	}
	if len(players) > 1 {
		playerBlack = players[1]
	}

	room.State = "playing"
	room.GameData = map[string]interface{}{
		"fen":          "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
		"moves":        []string{},
		"player_white": playerWhite,
		"player_black": playerBlack,
		"current_turn": "white",
	}
	room.mu.Unlock()

	room.Broadcast("game_starting", map[string]int{"countdown": 3})
	time.Sleep(2 * time.Second)
	room.Broadcast("chess_start", map[string]interface{}{
		"fen":          "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
		"player_white": playerWhite,
		"player_black": playerBlack,
	})

	go func() {
		time.Sleep(30 * time.Minute)
		room.mu.Lock()
		if room.State == "playing" {
			room.State = "finished"
			room.FinishedAt = nowPtr()
			room.mu.Unlock()
			room.Broadcast("game_over", GameOverPayload{XPEarned: 25})
		} else {
			room.mu.Unlock()
		}
	}()
}

func (h *Hub) handleChessMove(client *Client, roomID, move string) {
	room, ok := h.Rooms.Get(roomID)
	if !ok {
		return
	}

	room.mu.Lock()
	if room.State != "playing" {
		room.mu.Unlock()
		return
	}

	if _, ok := room.Players[client.UserID]; !ok {
		room.mu.Unlock()
		return
	}

	playerWhite, _ := room.GameData["player_white"].(string)
	playerBlack, _ := room.GameData["player_black"].(string)
	currentTurn, _ := room.GameData["current_turn"].(string)
	if currentTurn == "" {
		currentTurn = "white"
	}

	isWhiteTurn := currentTurn == "white"
	isPlayersTurn := false
	if isWhiteTurn && client.UserID == playerWhite {
		isPlayersTurn = true
	} else if !isWhiteTurn && client.UserID == playerBlack {
		isPlayersTurn = true
	} else if room.Bot != nil || room.GhostPlayer != nil {
		isPlayersTurn = true
	}
	if !isPlayersTurn {
		room.mu.Unlock()
		client.SendMessage("error", map[string]string{"message": "Bukan giliranmu"})
		return
	}

	movesRaw, _ := room.GameData["moves"].([]string)
	if movesRaw == nil {
		movesRaw = []string{}
	}
	movesRaw = append(movesRaw, move)

	nextTurn := "black"
	if currentTurn == "black" {
		nextTurn = "white"
	}
	room.GameData["moves"] = movesRaw
	room.GameData["current_turn"] = nextTurn
	room.mu.Unlock()

	room.BroadcastExcept(client.UserID, "chess_move", map[string]interface{}{
		"player_id": client.UserID,
		"move":      move,
	})

	client.SendMessage("chess_move_ok", map[string]interface{}{
		"move": move,
	})
}

func splitFen(fen string) []string {
	result := make([]string, 0, 6)
	current := ""
	for _, c := range fen {
		if c == ' ' {
			result = append(result, current)
			current = ""
		} else {
			current += string(c)
		}
	}
	if current != "" {
		result = append(result, current)
	}
	return result
}

func (h *Hub) handleCrosswordCell(client *Client, roomID string, row, col int, letter string) {
	room, ok := h.Rooms.Get(roomID)
	if !ok {
		return
	}

	room.mu.Lock()
	if room.State != "playing" {
		room.mu.Unlock()
		return
	}

	// The puzzle's grid cells hold the actual solution letters (the client
	// already relies on this to render right/wrong locally), so the server
	// can and must check submissions against it directly instead of trusting
	// whatever letter the client sends. Previously any letter — including an
	// empty one from Backspace — was accepted and counted toward completion,
	// so a puzzle could be marked "done" without actually being solved.
	correctLetter, gridOK := crosswordCellLetter(room.GameData["puzzle"], row, col)
	if !gridOK || correctLetter == "" || correctLetter == "#" {
		room.mu.Unlock()
		return
	}

	filledCells, _ := room.GameData["filled_cells"].(map[string]string)
	if filledCells == nil {
		filledCells = map[string]string{}
	}
	key := fmt.Sprintf("%d-%d", row, col)
	if filledCells[key] != "" {
		// Already solved by someone — nothing left to do here.
		room.mu.Unlock()
		return
	}

	letter = strings.ToUpper(strings.TrimSpace(letter))
	if letter == "" || letter != strings.ToUpper(correctLetter) {
		room.mu.Unlock()
		client.SendMessage("crossword_error", map[string]interface{}{
			"message": "Huruf salah",
			"row":     row,
			"col":     col,
		})
		return
	}

	filledCells[key] = letter
	room.GameData["filled_cells"] = filledCells

	playerFilled, _ := room.GameData["player_filled"].(map[string]int)
	if playerFilled == nil {
		playerFilled = map[string]int{}
	}
	playerFilled[client.UserID] = playerFilled[client.UserID] + 1
	room.GameData["player_filled"] = playerFilled

	totalCells := crosswordTotalFillableCells(room.GameData["puzzle"])
	currentFilled := len(filledCells)
	isCoop, _ := room.GameData["coop"].(bool)
	room.mu.Unlock()

	room.Broadcast("crossword_cell", map[string]interface{}{
		"player_id":    client.UserID,
		"row":          row,
		"col":          col,
		"letter":       letter,
		"player_count": playerFilled[client.UserID],
	})

	if totalCells > 0 && currentFilled >= totalCells {
		room.mu.Lock()
		if room.State == "playing" {
			room.State = "finished"
			room.FinishedAt = nowPtr()

			var results []PlayerResult
			var mvpID string
			topFilled := 0
			for _, p := range room.Players {
				f := playerFilled[p.ID]
				results = append(results, PlayerResult{
					PlayerID: p.ID,
					Username: p.Username,
					Score:    f,
					Correct:  f,
				})
				if f > topFilled {
					topFilled = f
					mvpID = p.ID
				}
			}

			winnerID := mvpID
			if !isCoop {
				winnerID = client.UserID
			}

			room.mu.Unlock()
			room.Broadcast("game_over", GameOverPayload{
				Results:  results,
				WinnerID: winnerID,
				XPEarned: 100,
			})
		} else {
			room.mu.Unlock()
		}
	}
}

func (h *Hub) startMathRelay(room *GameRoom) {
	difficulty := room.Settings.Difficulty
	if difficulty == "" {
		difficulty = "medium"
	}
	totalQ := room.Settings.Questions
	if totalQ <= 0 {
		totalQ = 20
	}

	room.mu.Lock()
	players := make([]string, 0, len(room.Players))
	for _, p := range room.Players {
		players = append(players, p.ID)
	}
	room.State = "playing"

	questions := make([]QuestionPayload, totalQ)
	for i := 0; i < totalQ; i++ {
		questions[i] = room.generateMathQuestion(difficulty, i+1, totalQ)
	}
	room.Questions = questions
	room.CurrentQ = 0
	room.GameData = map[string]interface{}{
		"players":        players,
		"current_player": 0,
		"questions_per":  5,
		"scores":         map[string]int{},
		"correct":        map[string]int{},
		"answered":       map[int]bool{},
	}
	room.mu.Unlock()

	room.Broadcast("game_starting", map[string]int{"countdown": 3})
	time.Sleep(2 * time.Second)

	room.Broadcast("relay_start", map[string]interface{}{
		"total_questions": totalQ,
		"questions_per":   5,
		"players":         players,
	})
	time.Sleep(1 * time.Second)

	for i := 0; i < totalQ; i++ {
		room.mu.Lock()
		if room.State != "playing" {
			room.mu.Unlock()
			break
		}
		room.CurrentQ = i
		q := questions[i]
		playerIdx := i / 5
		if playerIdx >= len(players) {
			playerIdx = len(players) - 1
		}
		currentPlayerID := players[playerIdx]
		room.mu.Unlock()

		room.Broadcast("relay_question", map[string]interface{}{
			"question":        q,
			"current_player":  currentPlayerID,
			"question_number": i + 1,
			"total":           totalQ,
		})

		deadline := time.Now().Add(8 * time.Second)
		answered := false

		for time.Now().Before(deadline) {
			select {
			case <-room.done:
				return
			default:
			}

			room.mu.RLock()
			answeredMap, _ := room.GameData["answered"].(map[int]bool)
			isAnswered := answeredMap != nil && answeredMap[i]
			room.mu.RUnlock()

			if isAnswered {
				answered = true
				break
			}
			time.Sleep(100 * time.Millisecond)
		}

		if !answered {
			room.Broadcast("relay_timeout", map[string]interface{}{
				"player_id":       currentPlayerID,
				"question_number": i + 1,
			})
		}
	}

	room.mu.Lock()
	room.State = "finished"
	room.FinishedAt = nowPtr()
	scores, _ := room.GameData["scores"].(map[string]int)
	correctMap, _ := room.GameData["correct"].(map[string]int)
	room.mu.Unlock()

	results := make([]PlayerResult, 0, len(players))
	var winnerID string
	topScore := -1
	for _, pid := range players {
		sc := scores[pid]
		results = append(results, PlayerResult{
			PlayerID: pid,
			Username: room.getPlayerName(pid),
			Score:    sc,
			Correct:  correctMap[pid],
		})
		if sc > topScore {
			topScore = sc
			winnerID = pid
		}
		if strings.HasPrefix(pid, "bot_") {
			continue
		}
	}

	room.Broadcast("game_over", GameOverPayload{
		Results:  results,
		WinnerID: winnerID,
		XPEarned: 50,
	})

	if winnerID != "" && !strings.HasPrefix(winnerID, "bot_") {
		h.checkAchievements(winnerID)
	}
}

// crosswordCellLetter returns the solution letter stored in the puzzle's
// grid at (row, col), and whether that lookup was actually valid (in
// bounds, right shape). The grid holds real letters for fillable cells and
// "#" for blocked ones — the same data the client already uses to render
// right/wrong locally — so this is also what the server validates
// submissions against.
func crosswordCellLetter(puzzle interface{}, row, col int) (string, bool) {
	puzzleRaw, ok := puzzle.(map[string]interface{})
	if !ok {
		return "", false
	}
	gridRaw, ok := puzzleRaw["grid"].([]interface{})
	if !ok || row < 0 || row >= len(gridRaw) {
		return "", false
	}
	rowRaw, ok := gridRaw[row].([]interface{})
	if !ok || col < 0 || col >= len(rowRaw) {
		return "", false
	}
	cell, ok := rowRaw[col].(string)
	return cell, ok
}

func crosswordTotalFillableCells(puzzle interface{}) int {
	puzzleRaw, ok := puzzle.(map[string]interface{})
	if !ok {
		return 0
	}
	gridRaw, ok := puzzleRaw["grid"].([]interface{})
	if !ok {
		return 0
	}
	total := 0
	for _, rowRaw := range gridRaw {
		r, ok := rowRaw.([]interface{})
		if !ok {
			continue
		}
		for _, c := range r {
			if cell, ok := c.(string); ok && cell != "#" {
				total++
			}
		}
	}
	return total
}

func getRandomCrosswordPuzzle(difficulty string) map[string]interface{} {
	type crosswordRow struct {
		ID        string
		Title     string
		GridSize  int
		GridJSON  string
		CluesJSON string
	}

	var puzzles []crosswordRow
	q := database.DB.Model(&model.CrosswordPuzzle{}).Where("is_active = true")
	if difficulty != "" {
		q = q.Where("difficulty = ?", difficulty)
	}
	if err := q.Find(&puzzles).Error; err != nil || len(puzzles) == 0 {
		return map[string]interface{}{
			"id":       "default",
			"title":    "TTS",
			"grid":     [][]interface{}{},
			"gridSize": 0,
			"clues":    []interface{}{},
		}
	}

	p := puzzles[rand.Intn(len(puzzles))]
	var grid interface{}
	var clues interface{}
	json.Unmarshal([]byte(p.GridJSON), &grid)
	json.Unmarshal([]byte(p.CluesJSON), &clues)

	return map[string]interface{}{
		"id":       p.ID,
		"title":    p.Title,
		"grid":     grid,
		"gridSize": p.GridSize,
		"clues":    clues,
	}
}

func (h *Hub) getGameID(slug string) string {
	var game model.Game
	if err := database.DB.Where("slug = ?", slug).First(&game).Error; err == nil {
		return game.ID.String()
	}
	return ""
}
