package model

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type BattleshipMatch struct {
	ID                  uuid.UUID       `gorm:"type:uuid;primaryKey" json:"id"`
	Player1ID           uuid.UUID       `gorm:"type:uuid;not null;index" json:"player1_id"`
	Player2ID           *uuid.UUID      `gorm:"type:uuid;index" json:"player2_id"`
	IsVsBot             bool            `gorm:"default:false" json:"is_vs_bot"`
	BotDifficulty       string          `gorm:"size:10" json:"bot_difficulty"`
	BotName             string          `gorm:"size:50" json:"bot_name"`
	Difficulty          string          `gorm:"size:10;not null" json:"difficulty"`
	Status              string          `gorm:"size:15;default:'active';index" json:"status"`
	CurrentTurn         string          `gorm:"size:10;default:'player1'" json:"current_turn"`
	Player1BoardJSON    json.RawMessage `gorm:"type:jsonb;not null" json:"player1_board_json"`
	Player2BoardJSON    json.RawMessage `gorm:"type:jsonb;not null" json:"player2_board_json"`
	PendingQuestionJSON json.RawMessage `gorm:"type:jsonb" json:"pending_question_json"`
	PendingTargetJSON   json.RawMessage `gorm:"type:jsonb" json:"pending_target_json"`
	PendingForTurn      string          `gorm:"size:10" json:"pending_for_turn"`
	PendingExpiresAt    *time.Time      `json:"pending_expires_at"`
	TurnExpiresAt       *time.Time      `json:"turn_expires_at"`
	Player1RevealedJSON json.RawMessage `gorm:"type:jsonb" json:"player1_revealed_json"`
	Player2RevealedJSON json.RawMessage `gorm:"type:jsonb" json:"player2_revealed_json"`
	Player1RevealUsed   bool            `gorm:"default:false" json:"player1_reveal_used"`
	Player2RevealUsed   bool            `gorm:"default:false" json:"player2_reveal_used"`
	Player1Score        int             `gorm:"default:0" json:"player1_score"`
	Player2Score        int             `gorm:"default:0" json:"player2_score"`
	WinnerID            *uuid.UUID      `gorm:"type:uuid" json:"winner_id"`
	WinnerSide          string          `gorm:"size:10" json:"winner_side"`
	LogJSON             json.RawMessage `gorm:"type:jsonb" json:"log_json"`
	FinishedAt          *time.Time      `json:"finished_at"`
	CreatedAt           time.Time       `json:"created_at"`
	UpdatedAt           time.Time       `json:"updated_at"`
}

func (m *BattleshipMatch) BeforeCreate(tx *gorm.DB) error {
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	return nil
}
