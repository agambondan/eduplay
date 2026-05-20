package repository

import (
	"time"

	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/google/uuid"
)

type UserAchievementResponse struct {
	ID          uuid.UUID `json:"id"`
	Slug        string    `json:"slug"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Icon        string    `json:"icon"`
	XPReward    int       `json:"xp_reward"`
	UnlockedAt  time.Time `json:"unlocked_at"`
}

type AchievementRepository interface {
	FindAll() ([]model.Achievement, error)
	FindBySlug(slug string) (*model.Achievement, error)
	FindUserAchievements(userID string) ([]UserAchievementResponse, error)
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

func (r *achievementRepository) FindUserAchievements(userID string) ([]UserAchievementResponse, error) {
	var uas []UserAchievementResponse
	err := database.DB.Table("user_achievements").
		Select(`user_achievements.achievement_id AS id, achievements.slug, achievements.name, 
			achievements.description, achievements.icon, achievements.xp_reward, 
			user_achievements.unlocked_at`).
		Joins("JOIN achievements ON achievements.id = user_achievements.achievement_id").
		Where("user_achievements.user_id = ?", userID).
		Scan(&uas).Error
	return uas, err
}

func (r *achievementRepository) Unlock(userID, achievementID uuid.UUID) error {
	ua := model.UserAchievement{UserID: userID, AchievementID: achievementID}
	return database.DB.Create(&ua).Error
}
