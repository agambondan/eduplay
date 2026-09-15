package ws

import "testing"

// TestMathRelay_OnlyCurrentPlayerCanAnswer reproduces the turn-authority gap:
// math_relay assigns each question to one player at a time (rotating every
// questions_per questions), but without an explicit check any player in the
// room could submit an answer for a question that wasn't theirs.
func TestMathRelay_OnlyCurrentPlayerCanAnswer(t *testing.T) {
	room := &GameRoom{
		ID:       "math_relay:test:r1",
		GameType: "math_relay",
		State:    "playing",
		Players: map[string]*Player{
			"p1": {ID: "p1", Username: "Player 1", AnsweredQuestions: map[string]bool{}},
			"p2": {ID: "p2", Username: "Player 2", AnsweredQuestions: map[string]bool{}},
		},
		Questions: []QuestionPayload{{ID: "q1", CorrectAnswer: "8"}},
		CurrentQ:  0,
		GameData: map[string]interface{}{
			"players":       []string{"p1", "p2"},
			"questions_per": 5,
			"scores":        map[string]int{},
			"correct":       map[string]int{},
			"answered":      map[int]bool{},
		},
	}

	// Question 0 belongs to p1 (0/5 == index 0). p2 tries to answer out of turn.
	room.SubmitAnswer("p2", "q1", "8", 500)

	answered, _ := room.GameData["answered"].(map[int]bool)
	if answered[0] {
		t.Fatal("expected out-of-turn answer from p2 to be rejected, but question 0 was marked answered")
	}
	if room.Players["p2"].AnsweredQuestions["q1"] {
		t.Fatal("expected p2's out-of-turn submission to be ignored")
	}

	// The actual current player (p1) can answer.
	room.SubmitAnswer("p1", "q1", "8", 500)
	if !answered[0] {
		t.Fatal("expected p1's in-turn answer to be accepted")
	}
}
