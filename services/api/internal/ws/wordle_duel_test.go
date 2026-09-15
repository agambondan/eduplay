package ws

import "testing"

func newWordleTestRoom() (*Hub, *GameRoom, *Client, *Client) {
	rm := NewRoomManager()
	room := rm.CreateRoom("wordle_duel:test", "wordle_duel", RoomSettings{MaxPlayers: 2}, "game-id")
	room.State = "playing"
	room.Players = map[string]*Player{
		"p1": {ID: "p1", Username: "P1"},
		"p2": {ID: "p2", Username: "P2"},
	}
	room.GameData = map[string]interface{}{
		"target_word": "kabar",
		"guesses":     map[string][]string{},
	}

	h := &Hub{Rooms: rm}
	c1 := &Client{UserID: "p1"}
	c2 := &Client{UserID: "p2"}
	return h, room, c1, c2
}

// TestWordleDuelBothPlayersExhaustGuessesEndsGame is a regression test for a
// match that used to hang forever: if neither player ever guesses the word
// correctly, the old implementation never broadcast game_over at all
// because it only checked for completion inside the "isCorrect" branch.
func TestWordleDuelBothPlayersExhaustGuessesEndsGame(t *testing.T) {
	h, room, c1, c2 := newWordleTestRoom()

	wrongGuesses := []string{"basah", "bunga", "candu", "dahan", "elang", "fokus"}
	for i, guess := range wrongGuesses {
		h.handleWordleGuess(c1, room.ID, guess)
		if i < len(wrongGuesses)-1 && room.State != "playing" {
			t.Fatalf("room finished too early after p1's guess %d", i+1)
		}
	}
	for i, guess := range wrongGuesses {
		h.handleWordleGuess(c2, room.ID, guess)
		if i < len(wrongGuesses)-1 && room.State != "playing" {
			t.Fatalf("room finished too early after p2's guess %d", i+1)
		}
	}

	if room.State != "finished" {
		t.Fatalf("expected room to finish once both players exhaust guesses, got %q", room.State)
	}
}

// TestWordleDuelSecondPlayerFinishingEndsGame covers the case where p1
// exhausts all guesses first and p2 finishes afterwards: the game must end
// as soon as the last remaining player is done, not stay stuck waiting for
// a "last guess == target" condition that never becomes true.
func TestWordleDuelSecondPlayerFinishingEndsGame(t *testing.T) {
	h, room, c1, c2 := newWordleTestRoom()

	for _, guess := range []string{"basah", "bunga", "candu", "dahan", "elang", "fokus"} {
		h.handleWordleGuess(c1, room.ID, guess)
	}
	if room.State != "playing" {
		t.Fatalf("room should still be waiting on p2, got %q", room.State)
	}

	h.handleWordleGuess(c2, room.ID, "kabar")

	if room.State != "finished" {
		t.Fatalf("expected room to finish once p2 wins after p1 exhausted guesses, got %q", room.State)
	}
}

func TestBuildWordleGameOverFewerAttemptsWins(t *testing.T) {
	guesses := map[string][]string{
		"p1": {"basah", "kabar"},          // 2 attempts, won
		"p2": {"basah", "bunga", "kabar"}, // 3 attempts, won
	}
	payload := buildWordleGameOver([]string{"p1", "p2"}, guesses, "kabar", []string{"p1", "p2"})

	if payload.WinnerID != "p1" {
		t.Fatalf("expected p1 (fewer attempts) to win, got %q", payload.WinnerID)
	}
	for _, r := range payload.Results {
		if r.PlayerID == "p1" && (r.Score != 2 || !r.IsWinner) {
			t.Fatalf("expected p1 result {score:2, winner:true}, got %+v", r)
		}
		if r.PlayerID == "p2" && (r.Score != 3 || r.IsWinner) {
			t.Fatalf("expected p2 result {score:3, winner:false}, got %+v", r)
		}
	}
}

func TestBuildWordleGameOverTieBrokenByFinishOrder(t *testing.T) {
	guesses := map[string][]string{
		"p1": {"basah", "bunga", "kabar"}, // 3 attempts
		"p2": {"basah", "bunga", "kabar"}, // 3 attempts, but finished first
	}
	// p2 appears first in finishOrder, so on an attempt tie p2 should win.
	payload := buildWordleGameOver([]string{"p1", "p2"}, guesses, "kabar", []string{"p2", "p1"})

	if payload.WinnerID != "p2" {
		t.Fatalf("expected tie to be broken in favor of whoever finished first (p2), got %q", payload.WinnerID)
	}
}

func TestBuildWordleGameOverDrawWhenNobodyWins(t *testing.T) {
	guesses := map[string][]string{
		"p1": {"basah", "bunga", "candu", "dahan", "elang", "fokus"},
		"p2": {"basah", "bunga", "candu", "dahan", "elang", "fokus"},
	}
	payload := buildWordleGameOver([]string{"p1", "p2"}, guesses, "kabar", []string{"p1", "p2"})

	if payload.WinnerID != "" {
		t.Fatalf("expected a draw (no winner) when nobody guesses correctly, got %q", payload.WinnerID)
	}
	for _, r := range payload.Results {
		if r.IsWinner {
			t.Fatalf("no result should be marked winner in a draw, got %+v", r)
		}
	}
}
