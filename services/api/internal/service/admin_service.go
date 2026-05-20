package service

import (
	"context"
	"errors"
	"time"

	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/google/uuid"
)

type UserListItem struct {
	ID        uuid.UUID `json:"id"`
	Username  string    `json:"username"`
	Email     string    `json:"email"`
	XP        int       `json:"xp"`
	Level     int       `json:"level"`
	Streak    int       `json:"streak"`
	Role      string    `json:"role"`
	IsActive  bool      `json:"is_active"`
	CreatedAt string    `json:"created_at"`
}

type GameListItem struct {
	ID          uuid.UUID `json:"id"`
	Slug        string    `json:"slug"`
	Name        string    `json:"name"`
	Category    string    `json:"category"`
	IsActive    bool      `json:"is_active"`
	TotalPlays  int64     `json:"total_plays"`
	CreatedAt   string    `json:"created_at"`
}

type AdminDashboardStats struct {
	TotalUsers       int64               `json:"total_users"`
	TotalGames       int64               `json:"total_games"`
	TotalSessions    int64               `json:"total_sessions"`
	ActiveToday      int64               `json:"active_today"`
	DAU              []DailyCount        `json:"dau"`
	GamePopularity   []GamePlayCount     `json:"game_popularity"`
}

type DailyCount struct {
	Date  string `json:"date"`
	Count int64  `json:"count"`
}

type GamePlayCount struct {
	GameName string `json:"game_name"`
	Slug     string `json:"slug"`
	Count    int64  `json:"count"`
}

type AdminService struct{}

func NewAdminService() *AdminService {
	return &AdminService{}
}

func (s *AdminService) GetUsers(page, limit int) ([]UserListItem, int64, error) {
	var total int64
	database.DB.Model(&model.User{}).Count(&total)

	var users []model.User
	offset := (page - 1) * limit
	if err := database.DB.Order("created_at DESC").Offset(offset).Limit(limit).Find(&users).Error; err != nil {
		return nil, 0, err
	}

	var items []UserListItem
	for _, u := range users {
		items = append(items, UserListItem{
			ID:        u.ID,
			Username:  u.Username,
			Email:     u.Email,
			XP:        u.XP,
			Level:     u.Level,
			Streak:    u.Streak,
			Role:      u.Role,
			IsActive:  u.IsActive,
			CreatedAt: u.CreatedAt.Format(time.RFC3339),
		})
	}
	return items, total, nil
}

func (s *AdminService) BanUser(userID string) error {
	return database.DB.Model(&model.User{}).Where("id = ?", userID).Update("is_active", false).Error
}

func (s *AdminService) UnbanUser(userID string) error {
	return database.DB.Model(&model.User{}).Where("id = ?", userID).Update("is_active", true).Error
}

func (s *AdminService) ToggleGame(gameID string) error {
	var g model.Game
	if err := database.DB.Where("id = ?", gameID).First(&g).Error; err != nil {
		return errors.New("game not found")
	}
	return database.DB.Model(&g).Update("is_active", !g.IsActive).Error
}

func (s *AdminService) GetGames() ([]GameListItem, error) {
	var games []model.Game
	if err := database.DB.Find(&games).Error; err != nil {
		return nil, err
	}

	var items []GameListItem
	for _, g := range games {
		var count int64
		database.DB.Model(&model.GameSession{}).Where("game_id = ?", g.ID).Count(&count)
		items = append(items, GameListItem{
			ID:         g.ID,
			Slug:       g.Slug,
			Name:       g.Name,
			Category:   g.Category,
			IsActive:   g.IsActive,
			TotalPlays: count,
			CreatedAt:  g.CreatedAt.Format(time.RFC3339),
		})
	}
	return items, nil
}

func (s *AdminService) GetDashboard() (*AdminDashboardStats, error) {
	var stats AdminDashboardStats

	database.DB.Model(&model.User{}).Count(&stats.TotalUsers)
	database.DB.Model(&model.Game{}).Count(&stats.TotalGames)
	database.DB.Model(&model.GameSession{}).Count(&stats.TotalSessions)

	today := time.Now().Format("2006-01-02")
	database.DB.Raw(
		"SELECT COUNT(*) FROM users WHERE last_active = ?", today,
	).Scan(&stats.ActiveToday)

	database.DB.Raw(`
		SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date, COUNT(*) as count
		FROM game_sessions
		WHERE created_at > NOW() - INTERVAL '7 days'
		GROUP BY date ORDER BY date ASC
	`).Scan(&stats.DAU)

	database.DB.Raw(`
		SELECT g.name as game_name, g.slug, COUNT(gs.id) as count
		FROM game_sessions gs
		JOIN games g ON g.id = gs.game_id
		GROUP BY g.name, g.slug
		ORDER BY count DESC
		LIMIT 10
	`).Scan(&stats.GamePopularity)

	return &stats, nil
}

func (s *AdminService) ResetLeaderboard() error {
	ctx := context.Background()
	iter := database.RDB.Scan(ctx, 0, "leaderboard:*", 0).Iterator()
	for iter.Next(ctx) {
		database.RDB.Del(ctx, iter.Val())
	}
	return iter.Err()
}

func (s *AdminService) GetFeatureFlag(key string) (string, error) {
	ctx := context.Background()
	val, err := database.RDB.Get(ctx, "feature:"+key).Result()
	if err != nil {
		return "disabled", nil
	}
	return val, nil
}

func (s *AdminService) SetFeatureFlag(key, value string) error {
	ctx := context.Background()
	return database.RDB.Set(ctx, "feature:"+key, value, 0).Err()
}

func (s *AdminService) ListFeatureFlags() (map[string]string, error) {
	ctx := context.Background()
	flags := make(map[string]string)
	iter := database.RDB.Scan(ctx, 0, "feature:*", 0).Iterator()
	for iter.Next(ctx) {
		key := iter.Val()
		val, err := database.RDB.Get(ctx, key).Result()
		if err != nil {
			continue
		}
		flags[key[8:]] = val
	}
	return flags, iter.Err()
}
