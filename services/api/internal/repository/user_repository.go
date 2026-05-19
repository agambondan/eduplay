package repository

import (
	"time"

	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/pkg/database"
)

type Stats struct {
	TotalGames int `json:"total_games"`
	TotalXP    int `json:"total_xp"`
}

type UserRepository interface {
	Create(user *model.User) error
	FindByEmail(email string) (*model.User, error)
	FindByID(id string) (*model.User, error)
	Update(user *model.User) error
	GetStats(id string) (*Stats, error)
	UpdateStreak(id string) error
}

type userRepository struct{}

func NewUserRepository() UserRepository {
	return &userRepository{}
}

func (r *userRepository) Create(user *model.User) error {
	return database.DB.Create(user).Error
}

func (r *userRepository) FindByEmail(email string) (*model.User, error) {
	var user model.User
	err := database.DB.Where("email = ?", email).First(&user).Error
	return &user, err
}

func (r *userRepository) FindByID(id string) (*model.User, error) {
	var user model.User
	err := database.DB.Where("id = ?", id).First(&user).Error
	return &user, err
}

func (r *userRepository) Update(user *model.User) error {
	return database.DB.Save(user).Error
}

func (r *userRepository) GetStats(id string) (*Stats, error) {
	var stats Stats
	database.DB.Raw("SELECT COUNT(*) as total_games FROM game_sessions WHERE user_id = ?", id).Scan(&stats.TotalGames)
	u, err := r.FindByID(id)
	if err != nil {
		return nil, err
	}
	stats.TotalXP = u.XP
	return &stats, nil
}

func (r *userRepository) UpdateStreak(id string) error {
	u, err := r.FindByID(id)
	if err != nil {
		return err
	}

	now := time.Now().Truncate(24 * time.Hour)
	if u.LastActive == nil {
		u.Streak = 1
	} else {
		last := u.LastActive.Truncate(24 * time.Hour)
		diff := now.Sub(last).Hours() / 24

		if diff == 1 {
			u.Streak++
		} else if diff > 1 {
			u.Streak = 1
		}
	}

	u.LastActive = &now
	return r.Update(u)
}
