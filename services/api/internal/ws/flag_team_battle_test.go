package ws

import "testing"

func TestFlagTeamAnswerAllowsSecondTeamAfterWrongBuzz(t *testing.T) {
	room := &GameRoom{
		ID:       "flag_team_battle:medium:test",
		GameType: "flag_team_battle",
		State:    "playing",
		Players: map[string]*Player{
			"p1": {ID: "p1", Username: "Player 1"},
			"p2": {ID: "p2", Username: "Player 2"},
		},
		Questions: []QuestionPayload{{
			ID:            "q1",
			Options:       []string{"Indonesia", "Malaysia", "Japan", "France"},
			CorrectAnswer: "Indonesia",
		}},
		CurrentQ: 0,
		GameData: map[string]interface{}{
			"flag_state": flagTeamState{
				Teams:       map[string]string{"p1": "A", "p2": "B"},
				TeamScores:  map[string]int{"A": 0, "B": 0},
				TeamStreaks: map[string]int{"A": 0, "B": 0},
				Answered:    map[string]bool{},
			},
		},
	}
	hub := &Hub{}

	hub.submitFlagTeamAnswer(room, "p1", "q1", "Malaysia", 500)
	state := getFlagTeamState(room)
	if state.Resolved {
		t.Fatal("round should stay open after first wrong team answer")
	}
	if state.TeamScores["A"] != 0 {
		t.Fatalf("wrong team score should clamp to 0, got %d", state.TeamScores["A"])
	}

	hub.submitFlagTeamAnswer(room, "p2", "q1", "Indonesia", 800)
	state = getFlagTeamState(room)
	if !state.Resolved {
		t.Fatal("round should resolve after second team answers correctly")
	}
	if state.TeamScores["B"] != 5 {
		t.Fatalf("second correct answer should score 5, got %d", state.TeamScores["B"])
	}
}

func TestFlagTeamAnswerIgnoresDuplicateTeamBuzz(t *testing.T) {
	room := &GameRoom{
		ID:       "flag_team_battle:medium:test",
		GameType: "flag_team_battle",
		State:    "playing",
		Players: map[string]*Player{
			"p1": {ID: "p1", Username: "Player 1"},
			"p2": {ID: "p2", Username: "Player 2"},
		},
		Questions: []QuestionPayload{{ID: "q1", CorrectAnswer: "Japan"}},
		CurrentQ:  0,
		GameData: map[string]interface{}{
			"flag_state": flagTeamState{
				Teams:       map[string]string{"p1": "A", "p2": "A"},
				TeamScores:  map[string]int{"A": 0, "B": 0},
				TeamStreaks: map[string]int{"A": 0, "B": 0},
				Answered:    map[string]bool{},
			},
		},
	}
	hub := &Hub{}

	hub.submitFlagTeamAnswer(room, "p1", "q1", "France", 500)
	hub.submitFlagTeamAnswer(room, "p2", "q1", "Japan", 600)

	state := getFlagTeamState(room)
	if state.TeamScores["A"] != 0 {
		t.Fatalf("duplicate team buzz should be ignored after wrong answer, got %d", state.TeamScores["A"])
	}
	if room.Players["p2"].Correct != 0 {
		t.Fatal("duplicate team answer should not be counted")
	}
}
