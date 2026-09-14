package service

import (
	"fmt"
	"testing"

	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupReferralTestDB() {
	testDBSeq++
	db, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:referral_test%d?mode=memory&cache=private", testDBSeq)), &gorm.Config{})
	if err != nil {
		panic("failed to connect database")
	}
	_ = db.AutoMigrate(&model.User{}, &model.Referral{})
	database.DB = db
}

func TestReferralService_ApplyReferral(t *testing.T) {
	setupReferralTestDB()
	svc := NewReferralService()

	referrer := model.User{
		ID:           uuid.New(),
		Username:     "referrer_user",
		Email:        "ref@example.com",
		ReferralCode: "REF12345",
		XP:           50,
		Level:        1,
	}
	require.NoError(t, database.DB.Create(&referrer).Error)

	referee := model.User{
		ID:           uuid.New(),
		Username:     "referee_user",
		Email:        "new@example.com",
		ReferralCode: "NEW99999",
		XP:           0,
		Level:        1,
	}
	require.NoError(t, database.DB.Create(&referee).Error)

	t.Run("successful referral awards XP atomically", func(t *testing.T) {
		err := svc.ApplyReferral(referee.ID, "REF12345")
		assert.NoError(t, err)

		var updatedReferrer model.User
		database.DB.First(&updatedReferrer, "id = ?", referrer.ID)
		assert.Equal(t, 50+model.ReferralBonusXP, updatedReferrer.XP)

		var ref model.Referral
		err = database.DB.First(&ref, "referree_id = ?", referee.ID).Error
		assert.NoError(t, err)
		assert.Equal(t, referrer.ID, ref.ReferrerID)
		assert.True(t, ref.XPAwarded)
	})

	t.Run("duplicate referral fails", func(t *testing.T) {
		err := svc.ApplyReferral(referee.ID, "REF12345")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "already applied")
	})

	t.Run("self referral fails", func(t *testing.T) {
		err := svc.ApplyReferral(referrer.ID, "REF12345")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "cannot refer yourself")
	})

	t.Run("invalid code fails", func(t *testing.T) {
		anotherUser := uuid.New()
		err := svc.ApplyReferral(anotherUser, "INVALIDCODE")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "referral code not found")
	})
}
