package ws

import (
	"sync/atomic"
	"testing"
	"time"
)

// TestScheduleBotFillStartTopsOffRoomAndStartsOnce is a regression test for
// Math Relay and Crossword Co-op being unplayable solo: both have
// MaxPlayers > 2 but every join lands in a freshly generated room (no
// room-code flow), so without bot-fill they can never reach IsFull() and
// would wait for real players forever. It also verifies double-scheduling
// (e.g. from a second player joining while the fill is still pending)
// doesn't start the game twice.
func TestScheduleBotFillStartTopsOffRoomAndStartsOnce(t *testing.T) {
	h := &Hub{}
	room := &GameRoom{
		ID:       "math_relay:medium:test",
		GameType: "math_relay",
		State:    "waiting",
		Players:  map[string]*Player{"p1": {ID: "p1", Client: &Client{}}},
		Settings: RoomSettings{MaxPlayers: 4, Difficulty: "medium"},
	}

	var startCount int32
	start := func(r *GameRoom) {
		atomic.AddInt32(&startCount, 1)
		r.mu.Lock()
		r.State = "playing"
		r.mu.Unlock()
	}

	h.scheduleBotFillStart(room, 10*time.Millisecond, start)
	// Simulates a second player joining right after the first: must not
	// schedule (and later trigger) a second fill/start.
	h.scheduleBotFillStart(room, 10*time.Millisecond, start)

	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		room.mu.RLock()
		done := room.State == "playing"
		room.mu.RUnlock()
		if done {
			break
		}
		time.Sleep(5 * time.Millisecond)
	}

	room.mu.RLock()
	playerCount := len(room.Players)
	state := room.State
	room.mu.RUnlock()

	if playerCount != 4 {
		t.Fatalf("expected room to be topped off to 4 players, got %d", playerCount)
	}
	if state != "playing" {
		t.Fatalf("expected room to be started (playing), got %q", state)
	}
	if got := atomic.LoadInt32(&startCount); got != 1 {
		t.Fatalf("expected startFn to be called exactly once, got %d", got)
	}
}
