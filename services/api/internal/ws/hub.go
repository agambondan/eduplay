package ws

import (
	"encoding/json"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/agambondan/eduplay/services/api/config"
	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
	"github.com/golang-jwt/jwt/v5"
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
					"room_id": client.RoomID,
					"reconnected": true,
				})
			} else {
				h.Clients[client.UserID] = client
				h.mu.Unlock()
				log.Printf("ws client connected: %s", client.UserID)
			}

		case client := <-h.Unregister:
			h.mu.Lock()
			if _, ok := h.Clients[client.UserID]; ok {
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
	if strings.HasPrefix(roomID, "math_battle:") {
		room, ok := h.Rooms.Get(roomID)
		if !ok {
			gameID := h.getGameID("math-battle")
			room = h.Rooms.CreateRoom(roomID, "math_battle", RoomSettings{
				GameSlug:   "math-battle",
				Difficulty: strings.TrimPrefix(roomID, "math_battle:"),
				MaxPlayers: 2,
			}, gameID)
		}

		var u model.User
		database.DB.First(&u, "id = ?", client.UserID)

		h.Rooms.JoinRoom(roomID, client.UserID, u.Username, u.Level)

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
			"room_id": roomID,
			"players": room.GetPlayers(),
		})

		room.BroadcastExcept(client.UserID, "player_joined", PlayerInfo{
			ID:       client.UserID,
			Username: u.Username,
			Level:    u.Level,
		})

		if room.IsFull() {
			go room.StartGame(h, h.cfg)
		} else if room.Bot == nil {
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
				Difficulty: strings.TrimPrefix(roomID, "wordle_duel:"),
				MaxPlayers: 2,
			}, gameID)
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
		if room.Bot == nil &&
			len(room.GetPlayers()) == 1 {
			bot := NewRuleBasedBot("medium", "wordle")
			room.Bot = bot
			if room.Bots == nil {
				room.Bots = make(map[string]*RuleBasedBot)
			}
			room.Bots[bot.UserID] = bot
			room.Players[bot.UserID] = &Player{
				ID: bot.UserID, Username: bot.DisplayName, Level: 1, Score: 0,
				Correct: 0, Wrong: 0, JoinedAt: time.Now(),
			}
		}
		room.mu.Unlock()

		oldRoomID := client.RoomID
		if oldRoomID != "" && oldRoomID != roomID {
			h.Rooms.LeaveRoom(oldRoomID, client.UserID)
		}
		client.RoomID = roomID
		client.SendMessage("room_joined", map[string]interface{}{"room_id": roomID, "players": room.GetPlayers()})

		if room.IsFull() {
			go h.startWordleDuel(room)
		}

	} else if strings.HasPrefix(roomID, "sudoku_race:") {
		room, ok := h.Rooms.Get(roomID)
		if !ok {
			gameID := h.getGameID("sudoku")
			room = h.Rooms.CreateRoom(roomID, "sudoku_race", RoomSettings{
				GameSlug:   "sudoku",
				Difficulty: strings.TrimPrefix(roomID, "sudoku_race:"),
				MaxPlayers: 2,
			}, gameID)
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

		if room.IsFull() {
			go h.startSudokuRace(room)
		}
	}
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
		"word":      word,
		"result":    result,
		"attempts":  guessNum,
		"correct":   isCorrect,
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
		"puzzle":    puzzle,
		"solution":  solution,
		"progress":  map[string]int{},
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
