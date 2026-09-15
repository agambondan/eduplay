package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Subscription struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null;uniqueIndex" json:"user_id"`
	// OrderID is the Midtrans order id, only set for real (non-mock) payment
	// flows. A pointer so multiple mock/free subscriptions (OrderID unset)
	// don't collide on the unique index — Postgres allows multiple NULLs.
	OrderID *string `gorm:"type:varchar(64);uniqueIndex" json:"-"`
	Plan      string    `gorm:"type:varchar(20);not null;default:'premium'" json:"plan"`
	Status    string    `gorm:"type:varchar(20);not null;default:'active'" json:"status"`
	StartedAt time.Time `json:"started_at"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (s *Subscription) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}
