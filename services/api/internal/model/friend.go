package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Friend struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_user_friend" json:"user_id"`
	FriendID  uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_user_friend" json:"friend_id"`
	Status    string    `gorm:"size:20;default:'pending'" json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (f *Friend) BeforeCreate(tx *gorm.DB) error {
	if f.ID == uuid.Nil {
		f.ID = uuid.New()
	}
	return nil
}
