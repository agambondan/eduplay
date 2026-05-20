package service

import (
	"context"
	"errors"
	"fmt"
	"math"
	"time"

	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/internal/repository"
	"github.com/agambondan/eduplay/services/api/pkg/cache"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SubmitScoreRequest struct {
	Score      int    `json:"score" validate:"required,min=0"`
	Duration   int    `json:"duration"`
	Difficulty string `json:"difficulty" validate:"required,oneof=easy medium hard"`
}

type SubmitScoreResponse struct {
	SessionID    uuid.UUID `json:"session_id"`
	XPEarned     int       `json:"xp_earned"`
	NewHighscore bool      `json:"new_highscore"`
	LevelUp      bool      `json:"level_up"`
	NewLevel     int       `json:"new_level"`
}

type GameDetailResponse struct {
	ID          uuid.UUID `json:"id"`
	Slug        string    `json:"slug"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Category    string    `json:"category"`
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	PlayerCount int64     `json:"player_count"`
	Highscore   int       `json:"highscore,omitempty"`
}

type GameService interface {
	ListGames() ([]model.Game, error)
	GetGame(slug string) (*GameDetailResponse, error)
	SubmitScore(userID string, slug string, req SubmitScoreRequest) (*SubmitScoreResponse, error)
}

type gameService struct {
	repo   repository.GameRepository
	achSvc interface {
		CheckAndUnlock(userID string, slug string) (bool, error)
		CheckFirstGame(userID string) error
		CheckAllGames(userID string) error
		CheckTop10(userID string) error
	}
	leadSvc LeaderboardService
}

func NewGameService(repo repository.GameRepository, achSvc interface {
	CheckAndUnlock(userID string, slug string) (bool, error)
	CheckFirstGame(userID string) error
	CheckAllGames(userID string) error
	CheckTop10(userID string) error
}, leadSvc LeaderboardService) GameService {
	return &gameService{repo: repo, achSvc: achSvc, leadSvc: leadSvc}
}

func (s *gameService) ListGames() ([]model.Game, error) {
	ctx := context.Background()
	result, err := cache.GetOrSet(ctx, "games", "all", 5*time.Minute, func() (*[]model.Game, error) {
		games, err := s.repo.FindAll()
		if err != nil {
			return nil, err
		}
		return &games, nil
	})
	if err != nil {
		return nil, err
	}
	return *result, nil
}

func (s *gameService) GetGame(slug string) (*GameDetailResponse, error) {
	ctx := context.Background()
	return cache.GetOrSet(ctx, "game_detail", slug, 5*time.Minute, func() (*GameDetailResponse, error) {
		g, err := s.repo.FindBySlug(slug)
		if err != nil {
			return nil, err
		}

		var playerCount int64
		database.DB.Model(&model.GameSession{}).Where("game_id = ?", g.ID).Count(&playerCount)

		var topScore int
		database.DB.Model(&model.UserHighscore{}).
			Select("COALESCE(MAX(highscore), 0)").
			Where("game_id = ?", g.ID).
			Scan(&topScore)

		return &GameDetailResponse{
			ID:          g.ID,
			Slug:        g.Slug,
			Name:        g.Name,
			Description: g.Description,
			Category:    g.Category,
			IsActive:    g.IsActive,
			CreatedAt:   g.CreatedAt,
			PlayerCount: playerCount,
			Highscore:   topScore,
		}, nil
	})
}

func (s *gameService) SubmitScore(userID string, slug string, req SubmitScoreRequest) (*SubmitScoreResponse, error) {
	g, err := s.repo.FindBySlug(slug)
	if err != nil {
		return nil, errors.New("game not found")
	}

	uid, _ := uuid.Parse(userID)

	ctx := context.Background()
	rateLimitKey := fmt.Sprintf("ratelimit:submit_score:%s:%s", userID, slug)
	allowed, _ := database.RDB.SetNX(ctx, rateLimitKey, "1", 30*time.Second).Result()
	if !allowed {
		return nil, errors.New("please wait before submitting another score")
	}

	if req.Score > 1000 {
		return nil, errors.New("score exceeds maximum allowed")
	}

	if req.Duration < 5 && req.Score > 50 {
		return nil, errors.New("invalid score for given duration")
	}

	// Guest mode: return response without persistence
	var u model.User
	if err := database.DB.Where("id = ?", userID).First(&u).Error; err != nil {
		return &SubmitScoreResponse{
			SessionID:    uid,
			XPEarned:     0,
			NewHighscore: false,
		}, nil
	}

	multiplier := 1.0
	switch req.Difficulty {
	case "medium":
		multiplier = 1.5
	case "hard":
		multiplier = 2.0
	}

	xp := int(math.Floor(float64(req.Score)/10) * multiplier)

	session := &model.GameSession{
		UserID:     uid,
		GameID:     g.ID,
		Score:      req.Score,
		Duration:   req.Duration,
		Difficulty: req.Difficulty,
		XPEarned:   xp,
	}

	if err := s.repo.CreateSession(session); err != nil {
		return nil, err
	}

	oldHs, err := s.repo.GetHighscore(uid, g.ID)
	newHighscore := false
	if errors.Is(err, gorm.ErrRecordNotFound) || req.Score > oldHs.Highscore {
		newHighscore = true
	}

	s.repo.UpsertHighscore(uid, g.ID, req.Score)

	if s.leadSvc != nil {
		s.leadSvc.AddGameScore(g.ID.String(), userID, float64(req.Score))
	}

	cache.Del(ctx, "game_detail", slug)
	cache.Del(ctx, "games", "all")
	cache.DelByPrefix(ctx, "leaderboard_game")
	cache.DelByPrefix(ctx, "leaderboard_global")

	if s.achSvc != nil {
		if slug == "math-quiz" && req.Score >= 500 {
			s.achSvc.CheckAndUnlock(userID, "math-master")
		}
		if slug == "wordle" && req.Score >= 80 {
			s.achSvc.CheckAndUnlock(userID, "wordle-genius")
		}
		s.achSvc.CheckFirstGame(userID)
		s.achSvc.CheckAllGames(userID)
		s.achSvc.CheckTop10(userID)
	}

	oldLevel := u.Level
	u.XP += xp
	u.Level = model.LevelFromXP(u.XP)
	levelUp := u.Level > oldLevel

	if u.Level >= 5 && s.achSvc != nil {
		s.achSvc.CheckAndUnlock(userID, "level-5")
	}

	now := time.Now()
	u.LastActive = &now
	database.DB.Save(&u)

	return &SubmitScoreResponse{
		SessionID:    session.ID,
		XPEarned:     xp,
		NewHighscore: newHighscore,
		LevelUp:      levelUp,
		NewLevel:     u.Level,
	}, nil
}
