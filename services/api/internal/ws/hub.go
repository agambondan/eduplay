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

type Hub struct {
	cfg        *config.Config
	Clients    map[string]*Client
	Rooms      *RoomManager
	Register   chan *Client
	Unregister chan *Client
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

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.mu.Lock()
			h.Clients[client.UserID] = client
			h.mu.Unlock()
			log.Printf("ws client connected: %s", client.UserID)

		case client := <-h.Unregister:
			h.mu.Lock()
			if _, ok := h.Clients[client.UserID]; ok {
				delete(h.Clients, client.UserID)
				close(client.Send)
			}
			h.mu.Unlock()

			if client.RoomID != "" {
				h.Rooms.LeaveRoom(client.RoomID, client.UserID)
			}
			log.Printf("ws client disconnected: %s", client.UserID)
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
