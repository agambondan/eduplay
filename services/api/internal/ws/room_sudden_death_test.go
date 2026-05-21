package ws

import "testing"

func TestTournamentSuddenDeathFirstCorrectAnswerWins(t *testing.T) {
	room := &GameRoom{
		ID:       "tournament:test:r1:m1",
		GameType: "math_battle",
		State:    "playing",
		Players: map[string]*Player{
			"p1": {
				ID:                "p1",
				Username:          "Player 1",
				Score:             30,
				AnsweredQuestions: map[string]bool{},
			},
			"p2": {
				ID:                "p2",
				Username:          "Player 2",
				Score:             30,
				AnsweredQuestions: map[string]bool{},
			},
		},
		Questions: []QuestionPayload{{
			ID:            "sd1",
			CorrectAnswer: "8",
		}},
		CurrentQ:          0,
		SuddenDeathActive: true,
	}

	room.SubmitAnswer("p2", "sd1", "8", 500)

	if room.SuddenDeathWinnerID != "p2" {
		t.Fatalf("expected p2 to win sudden death, got %q", room.SuddenDeathWinnerID)
	}
	if room.State != "finished" {
		t.Fatalf("expected room to finish after first correct sudden death answer, got %q", room.State)
	}

	results := room.calculateResults()
	if len(results) == 0 || results[0].PlayerID != "p2" || !results[0].IsWinner {
		t.Fatalf("expected p2 as winner in results, got %#v", results)
	}
}

func TestTournamentSuddenDeathNeededOnlyForTopScoreTie(t *testing.T) {
	room := &GameRoom{
		ID:       "tournament:test:r1:m1",
		GameType: "math_battle",
		State:    "playing",
		Players: map[string]*Player{
			"p1": {ID: "p1", Score: 40},
			"p2": {ID: "p2", Score: 40},
			"p3": {ID: "p3", Score: 10},
		},
	}
	if !room.needsSuddenDeath() {
		t.Fatal("expected top-score tie to require sudden death")
	}

	room.Players["p1"].Score = 45
	if room.needsSuddenDeath() {
		t.Fatal("single top score should not require sudden death")
	}
}
