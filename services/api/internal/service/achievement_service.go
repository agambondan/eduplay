package service

import (
	"context"
	"time"

	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/internal/repository"
	"github.com/agambondan/eduplay/services/api/pkg/cache"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/google/uuid"
)

type AchievementService interface {
	GetAchievements() ([]model.Achievement, error)
	GetUserAchievements(userID string) ([]repository.UserAchievementResponse, error)
	CheckAndUnlock(userID string, slug string) (bool, error)
	CheckFirstGame(userID string) error
	CheckAllGames(userID string) error
	CheckDailyCount(userID string) error
	CheckTop10(userID string) error
}

type achievementService struct {
	repo repository.AchievementRepository
}

func NewAchievementService(repo repository.AchievementRepository) AchievementService {
	return &achievementService{repo: repo}
}

func (s *achievementService) GetAchievements() ([]model.Achievement, error) {
	ctx := context.Background()
	result, err := cache.GetOrSet(ctx, "achievements", "all", 5*time.Minute, func() (*[]model.Achievement, error) {
		achs, err := s.repo.FindAll()
		if err != nil {
			return nil, err
		}
		return &achs, nil
	})
	if err != nil {
		return nil, err
	}
	return *result, nil
}

func (s *achievementService) GetUserAchievements(userID string) ([]repository.UserAchievementResponse, error) {
	ctx := context.Background()
	result, err := cache.GetOrSet(ctx, "user_achievements", userID, 5*time.Minute, func() (*[]repository.UserAchievementResponse, error) {
		uas, err := s.repo.FindUserAchievements(userID)
		if err != nil {
			return nil, err
		}
		return &uas, nil
	})
	if err != nil {
		return nil, err
	}
	return *result, nil
}

func (s *achievementService) CheckAndUnlock(userID string, slug string) (bool, error) {
	a, err := s.repo.FindBySlug(slug)
	if err != nil {
		return false, err
	}

	uid, _ := uuid.Parse(userID)

	var ua model.UserAchievement
	err = database.DB.Where("user_id = ? AND achievement_id = ?", uid, a.ID).First(&ua).Error
	if err == nil {
		return false, nil
	}

	if err := s.repo.Unlock(uid, a.ID); err != nil {
		return false, err
	}

	cache.Del(context.Background(), "user_achievements", userID)
	cache.Del(context.Background(), "user_profile", userID)

	var u model.User
	if err := database.DB.Where("id = ?", userID).First(&u).Error; err == nil {
		u.XP += a.XPReward
		u.Level = model.LevelFromXP(u.XP)
		database.DB.Save(&u)
	}

	return true, nil
}

func (s *achievementService) CheckFirstGame(userID string) error {
	var count int64
	database.DB.Model(&model.GameSession{}).Where("user_id = ?", userID).Count(&count)
	if count == 1 {
		s.CheckAndUnlock(userID, "first-game")
	}
	return nil
}

func (s *achievementService) CheckAllGames(userID string) error {
	var played int64
	database.DB.Model(&model.GameSession{}).Where("user_id = ?", userID).Distinct("game_id").Count(&played)
	var total int64
	database.DB.Model(&model.Game{}).Where("is_active = ?", true).Count(&total)
	if played >= total {
		s.CheckAndUnlock(userID, "all-games")
	}
	return nil
}

func (s *achievementService) CheckDailyCount(userID string) error {
	var count int64
	database.DB.Model(&model.DailySubmission{}).Where("user_id = ?", userID).Count(&count)
	if count >= 5 {
		s.CheckAndUnlock(userID, "daily-5")
	}
	return nil
}

func (s *achievementService) CheckTop10(userID string) error {
	var count int64
	database.DB.Model(&model.User{}).
		Where("xp > (SELECT xp FROM users WHERE id = ?)", userID).
		Count(&count)
	if count < 10 {
		s.CheckAndUnlock(userID, "top-10")
	}
	return nil
}
