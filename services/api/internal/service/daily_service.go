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

type DailySubmitResponse struct {
	XPEarned            int  `json:"xp_earned"`
	StreakUpdated       bool `json:"streak_updated"`
	AchievementsUnlocked bool `json:"achievements_unlocked"`
}

type DailyService interface {
	GetTodayChallenge() (*model.DailyChallenge, error)
	SubmitChallenge(userID string, challengeID string, score int) (*DailySubmitResponse, error)
}

type dailyService struct {
	gameRepo repository.GameRepository
	achSvc   interface {
		CheckAndUnlock(userID string, slug string) (bool, error)
		CheckDailyCount(userID string) error
	}
}

func NewDailyService(gameRepo repository.GameRepository, achSvc interface {
	CheckAndUnlock(userID string, slug string) (bool, error)
	CheckDailyCount(userID string) error
}) DailyService {
	return &dailyService{gameRepo: gameRepo, achSvc: achSvc}
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

func (s *dailyService) SubmitChallenge(userID string, challengeID string, score int) (*DailySubmitResponse, error) {
	uid, _ := uuid.Parse(userID)
	cid, _ := uuid.Parse(challengeID)

	var sub model.DailySubmission
	err := database.DB.Where("user_id = ? AND challenge_id = ?", uid, cid).First(&sub).Error
	if err == nil {
		return nil, errors.New("already submitted today")
	}

	submission := model.DailySubmission{
		UserID:      uid,
		ChallengeID: cid,
		Score:       score,
		CompletedAt: time.Now(),
	}

	if err := database.DB.Create(&submission).Error; err != nil {
		return nil, err
	}

	xp := (score / 10) * 2

	var u model.User
	streakUpdated := false
	if err := database.DB.Where("id = ?", userID).First(&u).Error; err == nil {
		now := time.Now()
		if u.LastActive == nil || now.Truncate(24*time.Hour).Sub(u.LastActive.Truncate(24*time.Hour)).Hours()/24 >= 1 {
			u.Streak++
			streakUpdated = true
		}
		u.XP += xp
		u.Level = model.LevelFromXP(u.XP)
		u.LastActive = &now
		database.DB.Save(&u)
	}

	achievementsUnlocked := false
	if s.achSvc != nil {
		if u.Streak >= 3 {
			unlocked, _ := s.achSvc.CheckAndUnlock(userID, "streak-3")
			if unlocked {
				achievementsUnlocked = true
			}
		}
		if u.Streak >= 7 {
			unlocked, _ := s.achSvc.CheckAndUnlock(userID, "streak-7")
			if unlocked {
				achievementsUnlocked = true
			}
		}
		if u.Streak >= 30 {
			unlocked, _ := s.achSvc.CheckAndUnlock(userID, "streak-30")
			if unlocked {
				achievementsUnlocked = true
			}
		}
		unlocked, _ := s.achSvc.CheckAndUnlock(userID, "first-game")
		if unlocked {
			achievementsUnlocked = true
		}
		s.achSvc.CheckDailyCount(userID)
	}

	return &DailySubmitResponse{
		XPEarned:            xp,
		StreakUpdated:       streakUpdated,
		AchievementsUnlocked: achievementsUnlocked,
	}, nil
}
