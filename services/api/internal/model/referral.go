package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

const ReferralBonusXP = 100

type Referral struct {
	ID         uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	ReferrerID uuid.UUID  `gorm:"type:uuid;not null;index" json:"referrer_id"`
	ReferreeID uuid.UUID  `gorm:"type:uuid;not null;uniqueIndex" json:"referree_id"`
	XPAwarded  bool       `gorm:"default:false" json:"xp_awarded"`
	CreatedAt  time.Time  `json:"created_at"`
}

func (r *Referral) BeforeCreate(tx *gorm.DB) error {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	return nil
}
