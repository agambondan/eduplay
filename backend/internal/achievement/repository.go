package achievement

import (
	"github.com/agambondan/eduplay/backend/pkg/database"
	"github.com/google/uuid"
)

type Repository interface {
	FindAll() ([]Achievement, error)
	FindBySlug(slug string) (*Achievement, error)
	FindUserAchievements(userID string) ([]UserAchievement, error)
	Unlock(userID, achievementID uuid.UUID) error
}

type repository struct{}

func NewRepository() Repository {
	return &repository{}
}

func (r *repository) FindAll() ([]Achievement, error) {
	var ach []Achievement
	err := database.DB.Find(&ach).Error
	return ach, err
}

func (r *repository) FindBySlug(slug string) (*Achievement, error) {
	var a Achievement
	err := database.DB.Where("slug = ?", slug).First(&a).Error
	return &a, err
}

func (r *repository) FindUserAchievements(userID string) ([]UserAchievement, error) {
	var uas []UserAchievement
	err := database.DB.Where("user_id = ?", userID).Find(&uas).Error
	return uas, err
}

func (r *repository) Unlock(userID, achievementID uuid.UUID) error {
	ua := UserAchievement{UserID: userID, AchievementID: achievementID}
	return database.DB.Create(&ua).Error
}
