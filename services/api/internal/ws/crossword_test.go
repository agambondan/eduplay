package ws

import "testing"

func newCrosswordTestRoom(gridSize int) (*Hub, *GameRoom, *Client) {
	rm := NewRoomManager()
	room := rm.CreateRoom("crossword_duel:test", "crossword_duel", RoomSettings{MaxPlayers: 2}, "game-id")
	room.State = "playing"
	room.Players = map[string]*Player{
		"p1": {ID: "p1", Username: "P1"},
		"p2": {ID: "p2", Username: "P2"},
	}
	// 1x2 grid: cell (0,0) solution letter "B", cell (0,1) blocked.
	grid := []interface{}{
		[]interface{}{"B", "#"},
	}
	room.GameData = map[string]interface{}{
		"puzzle": map[string]interface{}{
			"grid":     grid,
			"gridSize": gridSize,
		},
		"filled_cells":  map[string]string{},
		"player_filled": map[string]int{},
		"coop":          false,
	}

	h := &Hub{Rooms: rm}
	c1 := &Client{UserID: "p1"}
	return h, room, c1
}

// TestCrosswordCellRejectsWrongLetter is a regression test for content that
// was never actually validated: any submitted letter (including an empty
// one from Backspace) used to be accepted and counted toward completion.
func TestCrosswordCellRejectsWrongLetter(t *testing.T) {
	h, room, c1 := newCrosswordTestRoom(2)

	h.handleCrosswordCell(c1, room.ID, 0, 0, "Z")

	room.mu.RLock()
	filled, _ := room.GameData["filled_cells"].(map[string]string)
	_, stored := filled["0-0"]
	room.mu.RUnlock()

	if stored {
		t.Fatal("a wrong letter must not be stored in filled_cells")
	}
}

// TestCrosswordCellRejectsEmptyLetter covers the Backspace case
// (crossword-duel sends letter: '' on delete): it must not be treated as a
// valid fill either.
func TestCrosswordCellRejectsEmptyLetter(t *testing.T) {
	h, room, c1 := newCrosswordTestRoom(2)

	h.handleCrosswordCell(c1, room.ID, 0, 0, "")

	room.mu.RLock()
	filled, _ := room.GameData["filled_cells"].(map[string]string)
	_, stored := filled["0-0"]
	room.mu.RUnlock()

	if stored {
		t.Fatal("an empty letter (backspace) must not be stored in filled_cells")
	}
}

func TestCrosswordCellAcceptsCorrectLetterCaseInsensitive(t *testing.T) {
	h, room, c1 := newCrosswordTestRoom(2)

	h.handleCrosswordCell(c1, room.ID, 0, 0, "b")

	room.mu.RLock()
	filled, _ := room.GameData["filled_cells"].(map[string]string)
	got, stored := filled["0-0"]
	room.mu.RUnlock()

	if !stored || got != "B" {
		t.Fatalf("expected cell (0,0) to be filled with B, got %q (stored=%v)", got, stored)
	}
	if room.State != "finished" {
		t.Fatalf("expected the single-cell puzzle to finish once its only cell is solved, got %q", room.State)
	}
}

func TestCrosswordCellAlreadySolvedIsNoOp(t *testing.T) {
	h, room, c1 := newCrosswordTestRoom(2)

	h.handleCrosswordCell(c1, room.ID, 0, 0, "B")
	// A second submission to the same (already-correct) cell must not error
	// out or double count.
	h.handleCrosswordCell(c1, room.ID, 0, 0, "B")

	room.mu.RLock()
	playerFilled, _ := room.GameData["player_filled"].(map[string]int)
	room.mu.RUnlock()

	if playerFilled["p1"] != 1 {
		t.Fatalf("expected player_filled to count the cell only once, got %d", playerFilled["p1"])
	}
}
