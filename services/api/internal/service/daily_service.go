package service

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/internal/repository"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/google/uuid"
)

type DailyService interface {
	GetTodayChallenge() (*model.DailyChallenge, error)
	SubmitChallenge(userID string, challengeID string, score int) (int, error)
}

type dailyService struct {
	gameRepo repository.GameRepository
}

func NewDailyService(gameRepo repository.GameRepository) DailyService {
	return &dailyService{gameRepo: gameRepo}
}

func (s *dailyService) GetTodayChallenge() (*model.DailyChallenge, error) {
	today := time.Now().Format("2006-01-02")
	ctx := context.Background()
	cacheKey := "daily:challenge:" + today

	val, _ := database.RDB.Get(ctx, cacheKey).Result()
	if val != "" {
		var dc model.DailyChallenge
		json.Unmarshal([]byte(val), &dc)
		return &dc, nil
	}

	var dc model.DailyChallenge
	err := database.DB.Where("challenge_date = ?", today).First(&dc).Error
	if err != nil {
		return nil, errors.New("no challenge for today")
	}

	data, _ := json.Marshal(dc)
	database.RDB.Set(ctx, cacheKey, data, 24*time.Hour)

	return &dc, nil
}

func (s *dailyService) SubmitChallenge(userID string, challengeID string, score int) (int, error) {
	uid, _ := uuid.Parse(userID)
	cid, _ := uuid.Parse(challengeID)

	var sub model.DailySubmission
	err := database.DB.Where("user_id = ? AND challenge_id = ?", uid, cid).First(&sub).Error
	if err == nil {
		return 0, errors.New("already submitted today")
	}

	submission := model.DailySubmission{
		UserID:      uid,
		ChallengeID: cid,
		Score:       score,
		CompletedAt: time.Now(),
	}

	if err := database.DB.Create(&submission).Error; err != nil {
		return 0, err
	}

	xp := (score / 10) * 2

	var u model.User
	if err := database.DB.Where("id = ?", userID).First(&u).Error; err == nil {
		u.XP += xp
		u.Level = model.LevelFromXP(u.XP)
		database.DB.Save(&u)
	}

	return xp, nil
}
