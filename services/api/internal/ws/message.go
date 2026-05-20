package ws

import "encoding/json"

type WSMessage struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

type PlayerInfo struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Level    int    `json:"level"`
	Score    int    `json:"score"`
}

type RoomSettings struct {
	GameSlug   string `json:"game_slug"`
	Difficulty string `json:"difficulty"`
	MaxPlayers int    `json:"max_players"`
}

type JoinRoomPayload struct {
	RoomID string `json:"room_id"`
	Token  string `json:"token"`
}

type SubmitAnswerPayload struct {
	RoomID     string `json:"room_id"`
	QuestionID string `json:"question_id"`
	Answer     string `json:"answer"`
	TimeTaken  int    `json:"time_taken_ms"`
}

type QuestionPayload struct {
	ID             string   `json:"id"`
	Text           string   `json:"text"`
	Options        []string `json:"options"`
	QuestionNumber int      `json:"question_number"`
	Total          int      `json:"total"`
	CorrectAnswer  string   `json:"-"` // only used server-side, never sent to client
}

type AnswerResultPayload struct {
	PlayerID   string `json:"player_id"`
	IsCorrect  bool   `json:"is_correct"`
	ScoreDelta int    `json:"score_delta"`
	NewScore   int    `json:"new_score"`
}

type OpponentProgressPayload struct {
	PlayerID          string `json:"player_id"`
	QuestionsAnswered int    `json:"questions_answered"`
	CurrentScore      int    `json:"current_score"`
}

type GameOverPayload struct {
	Results  []PlayerResult `json:"results"`
	WinnerID string         `json:"winner_id"`
	XPEarned int            `json:"xp_earned"`
}

type PlayerResult struct {
	PlayerID   string `json:"player_id"`
	Username   string `json:"username"`
	Score      int    `json:"score"`
	Correct    int    `json:"correct"`
	Wrong      int    `json:"wrong"`
	IsWinner   bool   `json:"is_winner"`
}

type BotInfo struct {
	ID         string `json:"id"`
	Username   string `json:"username"`
	Difficulty string `json:"difficulty"`
}
