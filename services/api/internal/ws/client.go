package ws

import (
	"encoding/json"
	"sync"

	"github.com/gofiber/websocket/v2"
)

type Client struct {
	Hub    *Hub
	Conn   *websocket.Conn
	Send   chan []byte
	UserID string
	RoomID string
	mu     sync.Mutex
}

func NewClient(hub *Hub, conn *websocket.Conn, userID string) *Client {
	return &Client{
		Hub:    hub,
		Conn:   conn,
		Send:   make(chan []byte, 256),
		UserID: userID,
	}
}

func (c *Client) SendJSON(v interface{}) {
	data, err := json.Marshal(v)
	if err != nil {
		return
	}
	select {
	case c.Send <- data:
	default:
	}
}

func (c *Client) SendMessage(msgType string, payload interface{}) {
	data, _ := json.Marshal(map[string]interface{}{
		"type":    msgType,
		"payload": payload,
	})
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.Conn != nil {
		c.Conn.WriteMessage(1, data)
	}
}
