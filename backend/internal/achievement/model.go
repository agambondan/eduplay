package achievement

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Achievement struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Slug        string    `gorm:"uniqueIndex;size:50;not null" json:"slug"`
	Name        string    `gorm:"size:100;not null" json:"name"`
	Description string    `gorm:"type:text" json:"description"`
	XPReward    int       `gorm:"default:0" json:"xp_reward"`
	Icon        string    `gorm:"size:50" json:"icon"`
}

func (a *Achievement) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

type UserAchievement struct {
	UserID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"user_id"`
	AchievementID uuid.UUID `gorm:"type:uuid;primaryKey" json:"achievement_id"`
	UnlockedAt    time.Time `json:"unlocked_at"`
}
