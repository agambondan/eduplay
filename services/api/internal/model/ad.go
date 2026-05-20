package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// SlotType: "banner" | "interstitial" | "rewarded"
type Ad struct {
	ID        uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	Title     string     `gorm:"type:varchar(100);not null" json:"title"`
	ImageURL  string     `gorm:"type:varchar(500)" json:"image_url"`
	ClickURL  string     `gorm:"type:varchar(500)" json:"click_url"`
	SlotType  string     `gorm:"type:varchar(20);not null;index" json:"slot_type"`
	Priority  int        `gorm:"default:0" json:"priority"`
	IsActive  bool       `gorm:"default:true" json:"is_active"`
	StartAt   *time.Time `json:"start_at"`
	EndAt     *time.Time `json:"end_at"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

func (a *Ad) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}
