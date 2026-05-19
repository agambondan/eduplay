package achievement

import (

	"github.com/agambondan/eduplay/backend/internal/user"
	"github.com/agambondan/eduplay/backend/pkg/database"
	"github.com/google/uuid"
)

type Service interface {
	GetAchievements() ([]Achievement, error)
	GetUserAchievements(userID string) ([]UserAchievement, error)
	CheckAndUnlock(userID string, slug string) (bool, error)
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) GetAchievements() ([]Achievement, error) {
	return s.repo.FindAll()
}

func (s *service) GetUserAchievements(userID string) ([]UserAchievement, error) {
	return s.repo.FindUserAchievements(userID)
}

func (s *service) CheckAndUnlock(userID string, slug string) (bool, error) {
	a, err := s.repo.FindBySlug(slug)
	if err != nil {
		return false, err
	}

	uid, _ := uuid.Parse(userID)

	var ua UserAchievement
	err = database.DB.Where("user_id = ? AND achievement_id = ?", uid, a.ID).First(&ua).Error
	if err == nil {
		return false, nil // Already unlocked
	}

	if err := s.repo.Unlock(uid, a.ID); err != nil {
		return false, err
	}

	var u user.User
	if err := database.DB.Where("id = ?", userID).First(&u).Error; err == nil {
		u.XP += a.XPReward
		u.Level = user.LevelFromXP(u.XP)
		database.DB.Save(&u)
	}

	return true, nil
}
