package daily

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/agambondan/eduplay/backend/internal/game"
	"github.com/agambondan/eduplay/backend/internal/user"
	"github.com/agambondan/eduplay/backend/pkg/database"
	"github.com/google/uuid"
)

type Service interface {
	GetTodayChallenge() (*DailyChallenge, error)
	SubmitChallenge(userID string, challengeID string, score int) (int, error)
}

type service struct {
	gameRepo game.Repository
}

func NewService(gameRepo game.Repository) Service {
	return &service{gameRepo: gameRepo}
}

func (s *service) GetTodayChallenge() (*DailyChallenge, error) {
	today := time.Now().Format("2006-01-02")
	ctx := context.Background()
	cacheKey := "daily:challenge:" + today

	val, _ := database.RDB.Get(ctx, cacheKey).Result()
	if val != "" {
		var dc DailyChallenge
		json.Unmarshal([]byte(val), &dc)
		return &dc, nil
	}

	var dc DailyChallenge
	err := database.DB.Where("challenge_date = ?", today).First(&dc).Error
	if err != nil {
		return nil, errors.New("no challenge for today")
	}

	data, _ := json.Marshal(dc)
	database.RDB.Set(ctx, cacheKey, data, 24*time.Hour)

	return &dc, nil
}

func (s *service) SubmitChallenge(userID string, challengeID string, score int) (int, error) {
	uid, _ := uuid.Parse(userID)
	cid, _ := uuid.Parse(challengeID)

	var sub DailySubmission
	err := database.DB.Where("user_id = ? AND challenge_id = ?", uid, cid).First(&sub).Error
	if err == nil {
		return 0, errors.New("already submitted today")
	}

	submission := DailySubmission{
		UserID:      uid,
		ChallengeID: cid,
		Score:       score,
		CompletedAt: time.Now(),
	}

	if err := database.DB.Create(&submission).Error; err != nil {
		return 0, err
	}

	xp := (score / 10) * 2 // 2x Bonus

	var u user.User
	if err := database.DB.Where("id = ?", userID).First(&u).Error; err == nil {
		u.XP += xp
		u.Level = user.LevelFromXP(u.XP)
		database.DB.Save(&u)
	}

	return xp, nil
}
