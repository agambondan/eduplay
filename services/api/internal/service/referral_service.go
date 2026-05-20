package service

import (
	"errors"

	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/google/uuid"
)

type ReferralService struct{}

func NewReferralService() *ReferralService { return &ReferralService{} }

type ReferralStats struct {
	ReferralCode  string `json:"referral_code"`
	TotalReferrals int   `json:"total_referrals"`
	TotalXPEarned  int   `json:"total_xp_earned"`
}

func (s *ReferralService) GetStats(userID uuid.UUID) (*ReferralStats, error) {
	var user model.User
	if err := database.DB.First(&user, "id = ?", userID).Error; err != nil {
		return nil, err
	}

	var count int64
	database.DB.Model(&model.Referral{}).Where("referrer_id = ? AND xp_awarded = true", userID).Count(&count)

	return &ReferralStats{
		ReferralCode:  user.ReferralCode,
		TotalReferrals: int(count),
		TotalXPEarned:  int(count) * model.ReferralBonusXP,
	}, nil
}

// ApplyReferral is called during registration if the user provided a referral code.
func (s *ReferralService) ApplyReferral(referreeID uuid.UUID, code string) error {
	var referrer model.User
	if err := database.DB.First(&referrer, "referral_code = ?", code).Error; err != nil {
		return errors.New("referral code not found")
	}
	if referrer.ID == referreeID {
		return errors.New("cannot refer yourself")
	}

	var existing model.Referral
	if err := database.DB.First(&existing, "referree_id = ?", referreeID).Error; err == nil {
		return errors.New("referral already applied")
	}

	ref := model.Referral{
		ReferrerID: referrer.ID,
		ReferreeID: referreeID,
		XPAwarded:  true,
	}
	if err := database.DB.Create(&ref).Error; err != nil {
		return err
	}

	database.DB.Model(&model.User{}).Where("id = ?", referrer.ID).
		Updates(map[string]interface{}{
			"xp":    database.DB.Raw("xp + ?", model.ReferralBonusXP),
			"level": database.DB.Raw("GREATEST(level, 1)"),
		})

	database.DB.Model(&model.User{}).Where("id = ?", referrer.ID).
		UpdateColumn("xp", database.DB.Raw("xp + ?", model.ReferralBonusXP))

	var u model.User
	database.DB.First(&u, "id = ?", referrer.ID)
	newLevel := model.LevelFromXP(u.XP)
	if newLevel != u.Level {
		database.DB.Model(&u).UpdateColumn("level", newLevel)
	}

	return nil
}
