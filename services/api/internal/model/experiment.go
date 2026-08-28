package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Experiment struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	Name        string     `gorm:"size:100;not null;uniqueIndex" json:"name"`
	Description string     `gorm:"type:text" json:"description"`
	Variants    string     `gorm:"type:jsonb;not null" json:"variants"`
	Traffic     float64    `gorm:"default:1.0" json:"traffic"`
	IsActive    bool       `gorm:"default:true" json:"is_active"`
	StartedAt   *time.Time `json:"started_at"`
	EndedAt     *time.Time `json:"ended_at"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

func (e *Experiment) BeforeCreate(tx *gorm.DB) error {
	if e.ID == uuid.Nil {
		e.ID = uuid.New()
	}
	return nil
}

type ExperimentEvent struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	ExperimentID uuid.UUID `gorm:"type:uuid;not null;index" json:"experiment_id"`
	UserID       uuid.UUID `gorm:"type:uuid;index" json:"user_id"`
	Variant      string    `gorm:"size:20;not null" json:"variant"`
	EventType    string    `gorm:"size:50;not null;index" json:"event_type"`
	MetadataJSON string    `gorm:"type:jsonb" json:"metadata_json"`
	CreatedAt    time.Time `json:"created_at"`
}

func (ee *ExperimentEvent) BeforeCreate(tx *gorm.DB) error {
	if ee.ID == uuid.Nil {
		ee.ID = uuid.New()
	}
	return nil
}
