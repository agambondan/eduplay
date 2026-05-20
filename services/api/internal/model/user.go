package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	ID                uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	Username          string     `gorm:"uniqueIndex;size:30;not null" json:"username"`
	Email             string     `gorm:"uniqueIndex;size:255;not null" json:"email"`
	Password          string     `gorm:"size:255;not null" json:"-"`
	XP                int        `gorm:"default:0" json:"xp"`
	Level             int        `gorm:"default:1" json:"level"`
	Streak            int        `gorm:"default:0" json:"streak"`
	StreakFreeze      int        `gorm:"default:0" json:"streak_freeze"`
	LastActive        *time.Time `gorm:"type:date" json:"last_active"`
	EmailVerifiedAt   *time.Time `json:"email_verified_at"`
	VerificationToken *string    `gorm:"size:255" json:"-"`
	ResetToken        *string    `gorm:"size:255" json:"-"`
	ResetTokenExpiry  *time.Time `json:"-"`
	AvatarColor       string     `gorm:"size:7;default:'#4F46E5'" json:"avatar_color"`
	GoogleID          *string    `gorm:"uniqueIndex;size:255" json:"-"`
	Role              string     `gorm:"size:20;default:'user'" json:"role"`
	IsActive          bool       `gorm:"default:true" json:"is_active"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return nil
}

func LevelFromXP(xp int) int {
	level := 1
	threshold := 0
	prev := 0
	for n := 2; ; n++ {
		if n == 2 {
			threshold = 200
		} else {
			threshold = prev + (n-1)*200
		}
		if xp < threshold {
			break
		}
		prev = threshold
		level = n
	}
	return level
}
