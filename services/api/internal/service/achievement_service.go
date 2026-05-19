package service

import (
	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/internal/repository"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/google/uuid"
)

type AchievementService interface {
	GetAchievements() ([]model.Achievement, error)
	GetUserAchievements(userID string) ([]model.UserAchievement, error)
	CheckAndUnlock(userID string, slug string) (bool, error)
}

type achievementService struct {
	repo repository.AchievementRepository
}

func NewAchievementService(repo repository.AchievementRepository) AchievementService {
	return &achievementService{repo: repo}
}

func (s *achievementService) GetAchievements() ([]model.Achievement, error) {
	return s.repo.FindAll()
}

func (s *achievementService) GetUserAchievements(userID string) ([]model.UserAchievement, error) {
	return s.repo.FindUserAchievements(userID)
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

	var u model.User
	if err := database.DB.Where("id = ?", userID).First(&u).Error; err == nil {
		u.XP += a.XPReward
		u.Level = model.LevelFromXP(u.XP)
		database.DB.Save(&u)
	}

	return true, nil
}
