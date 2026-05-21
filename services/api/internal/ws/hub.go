package ws

import (
	"context"
	"encoding/json"
	"errors"
	"log"
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

type AchievementChecker interface {
	CheckMPFirstWin(userID string) error
	CheckMP10Wins(userID string) error
	CheckMPBotSlayer(userID string) error
}

type Hub struct {
	cfg        *config.Config
	Clients    map[string]*Client
	Rooms      *RoomManager
	Register   chan *Client
	Unregister chan *Client
	achSvc     AchievementChecker
	mu         sync.RWMutex
}

func NewHub(cfg *config.Config, roomMgr *RoomManager) *Hub {
	return &Hub{
		cfg:        cfg,
		Clients:    make(map[string]*Client),
		Rooms:      roomMgr,
		Register:   make(chan *Client, 256),
		Unregister: make(chan *Client, 256),
	}
}

func (h *Hub) SetAchievementChecker(ach AchievementChecker) {
	h.achSvc = ach
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
		return []byte(h.cfg.JWT.Secret), nil
	})
	if err != nil || !token.Valid {
		return "", err
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", err
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
		} else if room.State == "waiting" && room.Bot == nil && (!isTournamentRoom || hasTournamentBot) {
			room.AddBot()
			if room.Bot != nil {
				room.Broadcast("bot_joined", BotInfo{
					ID:         room.Bot.UserID,
					Username:   room.Bot.DisplayName,
					Difficulty: room.Bot.Difficulty,
				})
			}
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
		if room.Bot == nil &&
			len(room.Players) == 1 {
			bot := NewRuleBasedBot(room.Settings.Difficulty, "wordle")
			room.Bot = bot
			if room.Bots == nil {
				room.Bots = make(map[string]*RuleBasedBot)
			}
			room.Bots[bot.UserID] = bot
			room.Players[bot.UserID] = &Player{
				ID: bot.UserID, Username: bot.DisplayName, Level: 1, Score: 0,
				Correct: 0, Wrong: 0, JoinedAt: time.Now(), AnsweredQuestions: make(map[string]bool),
			}
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
		if allDone || len(room.GameData) > 0 {
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
		time.Sleep(10 * time.Minute)
		room.mu.Lock()
		if room.State == "playing" {
			room.State = "finished"
			room.mu.Unlock()
			room.Broadcast("game_over", GameOverPayload{})
		} else {
			room.mu.Unlock()
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
	room.mu.Unlock()

	client.SendMessage("sudoku_cell_ok", map[string]interface{}{
		"row": row, "col": col, "value": value,
	})
	room.Broadcast("opponent_progress", map[string]interface{}{
		"player_id": client.UserID,
		"progress":  pct,
	})

	if isSudokuComplete(&puzzle, &solution) {
		room.mu.Lock()
		room.State = "finished"
		room.mu.Unlock()
		room.Broadcast("game_over", GameOverPayload{
			WinnerID: client.UserID,
			XPEarned: 100,
		})
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

func (h *Hub) getGameID(slug string) string {
	var game model.Game
	if err := database.DB.Where("slug = ?", slug).First(&game).Error; err == nil {
		return game.ID.String()
	}
	return ""
}
