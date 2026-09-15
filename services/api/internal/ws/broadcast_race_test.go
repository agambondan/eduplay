package ws

import (
	"fmt"
	"sync"
	"testing"
)

// TestBroadcastConcurrentWithPlayerMutation is a regression test for a data race
// where Broadcast/BroadcastExcept used to iterate r.Players/r.Spectators without
// holding r.mu, while JoinRoom/AddBot/LeaveRoom mutate those same maps under
// r.mu.Lock() from other goroutines (every WS connection reads in its own
// goroutine). Under `go test -race` this used to report "concurrent map
// iteration and map write", which is an unrecoverable Go runtime fatal error
// that kills the whole process, not just the offending goroutine.
func TestBroadcastConcurrentWithPlayerMutation(t *testing.T) {
	room := &GameRoom{
		ID:         "race-test",
		GameType:   "math_battle",
		State:      "playing",
		Players:    make(map[string]*Player),
		Spectators: make(map[string]*Client),
	}

	var wg sync.WaitGroup

	// Writers: continuously join/leave players and spectators under lock,
	// mimicking concurrent connections joining/leaving the room.
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			id := fmt.Sprintf("p%d", i)
			for j := 0; j < 50; j++ {
				room.mu.Lock()
				room.Players[id] = &Player{ID: id, Client: &Client{}}
				room.Spectators[id] = &Client{}
				room.mu.Unlock()

				room.mu.Lock()
				delete(room.Players, id)
				delete(room.Spectators, id)
				room.mu.Unlock()
			}
		}(i)
	}

	// Readers: broadcast concurrently, exactly as the game loop does on every
	// question tick / answer submission.
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < 50; j++ {
				room.Broadcast("question", map[string]int{"n": j})
				room.BroadcastExcept("someone", "opponent_progress", map[string]int{"n": j})
			}
		}()
	}

	wg.Wait()
}
