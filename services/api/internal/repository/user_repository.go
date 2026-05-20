package repository

import (
	"time"

	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/pkg/database"
)

type HistoryPoint struct {
	Date string `json:"date"`
	XP   int    `json:"xp"`
}

type TopGame struct {
	Slug      string `json:"slug"`
	Name      string `json:"name"`
	BestScore int    `json:"best_score"`
	PlayCount int    `json:"play_count"`
	Category  string `json:"category"`
}

type Stats struct {
	TotalGames           int            `json:"total_games"`
	TotalXP              int            `json:"total_xp"`
	TotalPlayTime        int            `json:"total_play_time"`
	AchievementsUnlocked int            `json:"achievements_unlocked"`
	Level                int            `json:"level"`
	Streak               int            `json:"streak"`
	History              []HistoryPoint `json:"history"`
	TopGames             []TopGame      `json:"top_games"`
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
	database.DB.Raw("SELECT COALESCE(SUM(duration), 0) as total_play_time FROM game_sessions WHERE user_id = ?", id).Scan(&stats.TotalPlayTime)
	database.DB.Raw("SELECT COUNT(*) as total_games FROM game_sessions WHERE user_id = ?", id).Scan(&stats.TotalGames)
	database.DB.Raw("SELECT COUNT(*) as achievements_unlocked FROM user_achievements WHERE user_id = ?", id).Scan(&stats.AchievementsUnlocked)
	u, err := r.FindByID(id)
	if err != nil {
		return nil, err
	}
	stats.TotalXP = u.XP
	stats.Level = u.Level
	stats.Streak = u.Streak

	// Get last 7 days history
	var history []HistoryPoint
	database.DB.Raw(`
		SELECT 
			TO_CHAR(created_at, 'YYYY-MM-DD') as date,
			SUM(xp_earned) as xp
		FROM game_sessions 
		WHERE user_id = ? AND created_at > NOW() - INTERVAL '7 days'
		GROUP BY date
		ORDER BY date ASC
	`, id).Scan(&history)
	stats.History = history

	// Top 5 games by best score
	var topGames []TopGame
	database.DB.Raw(`
		SELECT g.slug, g.name, g.category,
			MAX(gs.score) as best_score,
			COUNT(gs.id) as play_count
		FROM game_sessions gs
		JOIN games g ON g.id = gs.game_id
		WHERE gs.user_id = ?
		GROUP BY g.slug, g.name, g.category
		ORDER BY best_score DESC
		LIMIT 5
	`, id).Scan(&topGames)
	stats.TopGames = topGames

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
