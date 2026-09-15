package ws

import (
	"testing"
	"time"

	"github.com/agambondan/eduplay/services/api/config"
)

// TestReconnectRace_StaleUnregisterDoesNotEvictActiveConnection reproduces
// the race where a client reconnects (old socket replaced in h.Clients),
// and only afterwards does the OLD socket's read loop finally notice it's
// dead and send itself on h.Unregister. That stale Unregister must not
// evict the new connection or start a reconnect-forfeit timer for a player
// who is, in fact, still connected.
func TestReconnectRace_StaleUnregisterDoesNotEvictActiveConnection(t *testing.T) {
	roomMgr := NewRoomManager()
	h := NewHub(&config.Config{}, roomMgr)
	go h.Run()

	oldClient := NewClient(h, nil, "user1")
	h.Register <- oldClient
	waitUntil(t, func() bool {
		h.mu.RLock()
		defer h.mu.RUnlock()
		return h.Clients["user1"] == oldClient
	})

	// Simulate the room join that would normally happen once connected.
	h.mu.Lock()
	oldClient.RoomID = "room1"
	h.mu.Unlock()

	newClient := NewClient(h, nil, "user1")
	h.Register <- newClient
	waitUntil(t, func() bool {
		h.mu.RLock()
		defer h.mu.RUnlock()
		return h.Clients["user1"] == newClient && newClient.RoomID == "room1"
	})

	// The stale old connection's read loop finally errors out and unregisters.
	h.Unregister <- oldClient
	waitUntil(t, func() bool {
		// give the hub loop a chance to process it
		return true
	})
	time.Sleep(50 * time.Millisecond)

	h.mu.RLock()
	current := h.Clients["user1"]
	h.mu.RUnlock()
	if current != newClient {
		t.Fatalf("expected the new connection to remain registered, got evicted by the stale unregister")
	}

	if _, started := roomMgr.reconnectTimers.Load("room1:user1"); started {
		t.Fatal("expected no reconnect/forfeit timer to be started for a player who is still actively connected")
	}
}

func waitUntil(t *testing.T, cond func() bool) {
	t.Helper()
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		if cond() {
			return
		}
		time.Sleep(5 * time.Millisecond)
	}
	if !cond() {
		t.Fatal("condition not met before deadline")
	}
}
