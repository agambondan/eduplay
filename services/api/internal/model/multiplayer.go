package model

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type MultiplayerMatch struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	RoomCode    string     `gorm:"size:10" json:"room_code"`
	GameID      uuid.UUID  `gorm:"type:uuid;not null" json:"game_id"`
	MatchType   string     `gorm:"size:20;not null" json:"match_type"`
	Difficulty  string     `gorm:"size:10" json:"difficulty"`
	Status      string     `gorm:"size:15;default:'waiting'" json:"status"`
	WinnerID    *uuid.UUID `gorm:"type:uuid" json:"winner_id"`
	StartedAt   *time.Time `json:"started_at"`
	FinishedAt  *time.Time `json:"finished_at"`
	CreatedAt   time.Time  `json:"created_at"`
}

func (m *MultiplayerMatch) BeforeCreate(tx *gorm.DB) error {
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	return nil
}

type MatchParticipant struct {
	ID              uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	MatchID         uuid.UUID  `gorm:"type:uuid;not null" json:"match_id"`
	UserID          *uuid.UUID `gorm:"type:uuid" json:"user_id"`
	BotType         string     `gorm:"size:20" json:"bot_type"`
	BotDifficulty   string     `gorm:"size:10" json:"bot_difficulty"`
	BotName         string     `gorm:"size:50" json:"bot_name"`
	GhostID         *uuid.UUID `gorm:"type:uuid" json:"ghost_id"`
	Score           int        `gorm:"default:0" json:"score"`
	CorrectAnswers  int        `gorm:"default:0" json:"correct_answers"`
	WrongAnswers    int        `gorm:"default:0" json:"wrong_answers"`
	XPEarned        int        `gorm:"default:0" json:"xp_earned"`
	Rank            int        `json:"rank"`
	IsWinner        bool       `gorm:"default:false" json:"is_winner"`
	JoinedAt        time.Time  `json:"joined_at"`
	FinishedAt      *time.Time `json:"finished_at"`
}

func (mp *MatchParticipant) BeforeCreate(tx *gorm.DB) error {
	if mp.ID == uuid.Nil {
		mp.ID = uuid.New()
	}
	return nil
}

type GhostReplay struct {
	ID             uuid.UUID       `gorm:"type:uuid;primaryKey" json:"id"`
	UserID         uuid.UUID       `gorm:"type:uuid;not null" json:"user_id"`
	GameID         uuid.UUID       `gorm:"type:uuid;not null" json:"game_id"`
	Difficulty     string          `gorm:"size:10" json:"difficulty"`
	Score          int             `json:"score"`
	TotalQuestions int             `json:"total_questions"`
	CorrectAnswers int             `json:"correct_answers"`
	WrongAnswers   int             `json:"wrong_answers"`
	Duration       int             `json:"duration"`
	EventsJSON     json.RawMessage `gorm:"type:jsonb;not null" json:"events_json"`
	IsActive       bool            `gorm:"default:true" json:"is_active"`
	CreatedAt      time.Time       `json:"created_at"`
}

func (g *GhostReplay) BeforeCreate(tx *gorm.DB) error {
	if g.ID == uuid.Nil {
		g.ID = uuid.New()
	}
	return nil
}

type GhostEvent struct {
	Timestamp  time.Duration `json:"timestamp"`
	EventType  string        `json:"event_type"`
	QuestionID string        `json:"question_id"`
	IsCorrect  bool          `json:"is_correct"`
	TimeTaken  time.Duration `json:"time_taken"`
}

type AsyncChallenge struct {
	ID                uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	ChallengerID      uuid.UUID  `gorm:"type:uuid;not null" json:"challenger_id"`
	OpponentID        uuid.UUID  `gorm:"type:uuid;not null" json:"opponent_id"`
	GameID            uuid.UUID  `gorm:"type:uuid;not null" json:"game_id"`
	Difficulty        string     `gorm:"size:10" json:"difficulty"`
	QuestionsJSON     json.RawMessage `gorm:"type:jsonb;not null" json:"questions_json"`
	AnswersJSON       json.RawMessage `gorm:"type:jsonb;not null" json:"answers_json"`
	ChallengerScore   *int       `json:"challenger_score"`
	OpponentScore     *int       `json:"opponent_score"`
	ChallengerDoneAt  *time.Time `json:"challenger_done_at"`
	OpponentDoneAt    *time.Time `json:"opponent_done_at"`
	WinnerID          *uuid.UUID `gorm:"type:uuid" json:"winner_id"`
	Status            string     `gorm:"size:15;default:'pending'" json:"status"`
	ExpiresAt         time.Time  `gorm:"not null" json:"expires_at"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

func (ac *AsyncChallenge) BeforeCreate(tx *gorm.DB) error {
	if ac.ID == uuid.Nil {
		ac.ID = uuid.New()
	}
	return nil
}

type WordChainGame struct {
	ID             uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	Player1ID      uuid.UUID  `gorm:"type:uuid;not null" json:"player1_id"`
	Player2ID      *uuid.UUID `gorm:"type:uuid" json:"player2_id"`
	IsVsBot        bool       `gorm:"default:false" json:"is_vs_bot"`
	BotDifficulty  string     `gorm:"size:10" json:"bot_difficulty"`
	CurrentWord    string     `gorm:"size:50" json:"current_word"`
	CurrentTurn    *uuid.UUID `gorm:"type:uuid" json:"current_turn"`
	WordsUsed      []string   `gorm:"type:text[]" json:"words_used"`
	Player1Score   int        `gorm:"default:0" json:"player1_score"`
	Player2Score   int        `gorm:"default:0" json:"player2_score"`
	Status         string     `gorm:"size:15;default:'active'" json:"status"`
	TurnExpiresAt  *time.Time `json:"turn_expires_at"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

func (wc *WordChainGame) BeforeCreate(tx *gorm.DB) error {
	if wc.ID == uuid.Nil {
		wc.ID = uuid.New()
	}
	return nil
}
