package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type PushSubscription struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null;index" json:"user_id"`
	Endpoint  string    `gorm:"type:text;not null" json:"endpoint"`
	P256DHKey string    `gorm:"type:text;not null" json:"p256dh_key"`
	AuthKey   string    `gorm:"type:text;not null" json:"auth_key"`
	CreatedAt time.Time `json:"created_at"`
}

func (p *PushSubscription) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}
