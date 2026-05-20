package model

import (
	"fmt"
	"math/rand"
	"strings"
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
	AvatarURL         string     `gorm:"size:500" json:"avatar_url"`
	GoogleID          *string    `gorm:"uniqueIndex;size:255" json:"-"`
	Role              string     `gorm:"size:20;default:'user'" json:"role"`
	IsActive          bool       `gorm:"default:true" json:"is_active"`
	ReferralCode      string     `gorm:"uniqueIndex;size:10" json:"referral_code"`
	ReferredBy        *string    `gorm:"size:10" json:"referred_by,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

func generateReferralCode() string {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	b := strings.Builder{}
	for i := 0; i < 8; i++ {
		b.WriteByte(chars[rand.Intn(len(chars))])
	}
	return fmt.Sprintf("EP%s", b.String())
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	if u.ReferralCode == "" {
		u.ReferralCode = generateReferralCode()
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
