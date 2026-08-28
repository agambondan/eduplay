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
				oldClient.Conn = nil
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
			if current, ok := h.Clients[client.UserID]; ok && current == client {
				delete(h.Clients, client.UserID)
			}
			h.mu.Unlock()

			if client.RoomID != "" {
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
		h.Rooms.LeaveRoom(payload.RoomID, client.UserID)
		client.RoomID = ""
	}
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
			diff := room.Settings.Difficulty
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
			room.State = "playing"
			room.mu.Unlock()

			room.Broadcast("game_starting", map[string]int{"countdown": 3})
			time.Sleep(2 * time.Second)
			room.Broadcast("crossword_start", puzzle)
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

	if isCorrect {
		room.mu.Lock()
		gData, _ := room.GameData["guesses"].(map[string][]string)
		room.mu.Unlock()

		allDone := true
		for _, p := range room.GetPlayers() {
			pg := gData[p.ID]
			lastGuess := ""
			if len(pg) > 0 {
				lastGuess = pg[len(pg)-1]
			}
			if lastGuess != target {
				allDone = false
				break
			}
		}
		if allDone {
			room.Broadcast("game_over", GameOverPayload{
				WinnerID: client.UserID,
				XPEarned: 50,
				Results:  []PlayerResult{},
			})
		}
	}
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
		client.SendMessage("sudoku_error", map[string]string{"message": "Nilai salah"})
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

	room.BroadcastExcept(client.UserID, "chess_move", map[string]interface{}{
		"player_id": client.UserID,
		"move":      move,
	})

	room.mu.Unlock()

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

	filledCells, _ := room.GameData["filled_cells"].(map[string]string)
	if filledCells == nil {
		filledCells = map[string]string{}
	}

	key := fmt.Sprintf("%d-%d", row, col)
	filledCells[key] = letter
	room.GameData["filled_cells"] = filledCells

	playerFilled, _ := room.GameData["player_filled"].(map[string]int)
	if playerFilled == nil {
		playerFilled = map[string]int{}
	}
	playerFilled[client.UserID] = playerFilled[client.UserID] + 1
	room.GameData["player_filled"] = playerFilled

	totalCells := 0
	if puzzleRaw, ok := room.GameData["puzzle"].(map[string]interface{}); ok {
		if gridRaw, ok := puzzleRaw["grid"].([]interface{}); ok {
			for _, rowRaw := range gridRaw {
				if r, ok := rowRaw.([]interface{}); ok {
					for _, c := range r {
						if cell, ok := c.(string); ok && cell != "#" {
							totalCells++
						}
					}
				}
			}
		}
	}

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
			"id":    "default",
			"title": "TTS",
			"grid":  [][]interface{}{},
			"clues": []interface{}{},
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
