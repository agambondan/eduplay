package service

import (
	"errors"

	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ReferralService struct{}

func NewReferralService() *ReferralService { return &ReferralService{} }

type ReferralStats struct {
	ReferralCode   string `json:"referral_code"`
	TotalReferrals int    `json:"total_referrals"`
	TotalXPEarned  int    `json:"total_xp_earned"`
}

func (s *ReferralService) GetStats(userID uuid.UUID) (*ReferralStats, error) {
	var user model.User
	if err := database.DB.First(&user, "id = ?", userID).Error; err != nil {
		return nil, err
	}

	var count int64
	database.DB.Model(&model.Referral{}).Where("referrer_id = ? AND xp_awarded = true", userID).Count(&count)

	return &ReferralStats{
		ReferralCode:   user.ReferralCode,
		TotalReferrals: int(count),
		TotalXPEarned:  int(count) * model.ReferralBonusXP,
	}, nil
}

// ApplyReferral is called during registration if the user provided a referral code.
func (s *ReferralService) ApplyReferral(referreeID uuid.UUID, code string) error {
	return database.DB.Transaction(func(tx *gorm.DB) error {
		var referrer model.User
		if err := tx.First(&referrer, "referral_code = ?", code).Error; err != nil {
			return errors.New("referral code not found")
		}
		if referrer.ID == referreeID {
			return errors.New("cannot refer yourself")
		}

		var existing model.Referral
		if err := tx.First(&existing, "referree_id = ?", referreeID).Error; err == nil {
			return errors.New("referral already applied")
		}

		ref := model.Referral{
			ReferrerID: referrer.ID,
			ReferreeID: referreeID,
			XPAwarded:  true,
		}
		if err := tx.Create(&ref).Error; err != nil {
			return err
		}

		if err := tx.Model(&model.User{}).Where("id = ?", referrer.ID).
			UpdateColumn("xp", gorm.Expr("xp + ?", model.ReferralBonusXP)).Error; err != nil {
			return err
		}

		var u model.User
		if err := tx.First(&u, "id = ?", referrer.ID).Error; err == nil {
			newLevel := model.LevelFromXP(u.XP)
			if newLevel != u.Level {
				_ = tx.Model(&u).UpdateColumn("level", newLevel).Error
			}
		}

		return nil
	})
}
