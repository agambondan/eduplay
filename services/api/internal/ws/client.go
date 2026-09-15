package ws

import (
	"encoding/json"
	"sync"
	"time"

	"github.com/gofiber/websocket/v2"
)

// writeWait bounds how long a single WriteMessage may block. Without it, one
// stalled/slow client's socket write can hang forever inside SendMessage —
// and since Hub.Run calls Broadcast/SendMessage synchronously for every
// Register/Unregister event, one bad connection can freeze the whole hub.
const writeWait = 5 * time.Second

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
		c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
		c.Conn.WriteMessage(1, data)
	}
}
