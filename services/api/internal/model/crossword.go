package model

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CrosswordPuzzle struct {
	ID         uuid.UUID       `gorm:"type:uuid;primaryKey" json:"id"`
	Slug       string          `gorm:"uniqueIndex;size:50;not null" json:"slug"`
	Title      string          `gorm:"size:100;not null" json:"title"`
	GridSize   int             `gorm:"not null" json:"grid_size"`
	GridJSON   json.RawMessage `gorm:"type:jsonb;not null" json:"grid_json"`
	CluesJSON  json.RawMessage `gorm:"type:jsonb;not null" json:"clues_json"`
	Difficulty string          `gorm:"size:10" json:"difficulty"`
	IsActive   bool            `gorm:"default:true" json:"is_active"`
	CreatedAt  time.Time       `json:"created_at"`
}

func (p *CrosswordPuzzle) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}
