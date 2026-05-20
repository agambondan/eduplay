package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ScoreChallenge struct {
	ID           uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	ChallengerID uuid.UUID  `gorm:"type:uuid;not null" json:"challenger_id"`
	OpponentID   *uuid.UUID `gorm:"type:uuid" json:"opponent_id"`
	GameID       uuid.UUID  `gorm:"type:uuid;not null" json:"game_id"`
	Difficulty   string     `gorm:"size:10" json:"difficulty"`
	ChallengerScore int     `gorm:"not null" json:"challenger_score"`
	OpponentScore   *int    `gorm:"" json:"opponent_score"`
	ShareLink    string     `gorm:"size:255;uniqueIndex" json:"share_link"`
	Status       string     `gorm:"size:15;default:'pending'" json:"status"`
	WinnerID     *uuid.UUID `gorm:"type:uuid" json:"winner_id"`
	ExpiresAt    time.Time  `gorm:"not null" json:"expires_at"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

func (sc *ScoreChallenge) BeforeCreate(tx *gorm.DB) error {
	if sc.ID == uuid.Nil {
		sc.ID = uuid.New()
	}
	return nil
}
