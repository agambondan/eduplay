package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ChessMatch struct {
	ID              uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	Player1ID       uuid.UUID  `gorm:"type:uuid;not null;index" json:"player1_id"`
	Player2ID       *uuid.UUID `gorm:"type:uuid;index" json:"player2_id"`
	IsVsBot         bool       `gorm:"default:false" json:"is_vs_bot"`
	BotDifficulty   string     `gorm:"size:10" json:"bot_difficulty"`
	BotName         string     `gorm:"size:50" json:"bot_name"`
	Status          string     `gorm:"size:15;default:'active';index" json:"status"`
	PlayerColor     string     `gorm:"size:5;default:'white'" json:"player_color"`
	CurrentTurn     string     `gorm:"size:5;default:'white'" json:"current_turn"`
	FEN             string     `gorm:"type:text" json:"fen"`
	MovesJSON       string     `gorm:"type:jsonb" json:"moves_json"`
	Player1Score    int        `gorm:"default:0" json:"player1_score"`
	Player2Score    int        `gorm:"default:0" json:"player2_score"`
	WinnerID        *uuid.UUID `gorm:"type:uuid" json:"winner_id"`
	WinReason       string     `gorm:"size:20" json:"win_reason"`
	TurnExpiresAt   *time.Time `json:"turn_expires_at"`
	FinishedAt      *time.Time `json:"finished_at"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

func (m *ChessMatch) BeforeCreate(tx *gorm.DB) error {
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	return nil
}
