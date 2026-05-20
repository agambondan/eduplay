package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SupportTicket struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	UserID    *uuid.UUID `gorm:"type:uuid" json:"user_id,omitempty"`
	Name      string     `gorm:"size:100;not null" json:"name"`
	Email     string     `gorm:"size:255;not null" json:"email"`
	Category  string     `gorm:"size:20;not null" json:"category"`
	Message   string     `gorm:"type:text;not null" json:"message"`
	Status    string     `gorm:"size:20;default:'open'" json:"status"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

func (s *SupportTicket) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}
