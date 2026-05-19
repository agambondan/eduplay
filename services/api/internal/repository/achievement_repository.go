package repository

import (
	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/google/uuid"
)

type AchievementRepository interface {
	FindAll() ([]model.Achievement, error)
	FindBySlug(slug string) (*model.Achievement, error)
	FindUserAchievements(userID string) ([]model.UserAchievement, error)
	Unlock(userID, achievementID uuid.UUID) error
}

type achievementRepository struct{}

func NewAchievementRepository() AchievementRepository {
	return &achievementRepository{}
}

func (r *achievementRepository) FindAll() ([]model.Achievement, error) {
	var ach []model.Achievement
	err := database.DB.Find(&ach).Error
	return ach, err
}

func (r *achievementRepository) FindBySlug(slug string) (*model.Achievement, error) {
	var a model.Achievement
	err := database.DB.Where("slug = ?", slug).First(&a).Error
	return &a, err
}

func (r *achievementRepository) FindUserAchievements(userID string) ([]model.UserAchievement, error) {
	var uas []model.UserAchievement
	err := database.DB.Where("user_id = ?", userID).Find(&uas).Error
	return uas, err
}

func (r *achievementRepository) Unlock(userID, achievementID uuid.UUID) error {
	ua := model.UserAchievement{UserID: userID, AchievementID: achievementID}
	return database.DB.Create(&ua).Error
}
