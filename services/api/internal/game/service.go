package game

import (
	"context"
	"errors"
	"fmt"
	"math"
	"time"

	"github.com/agambondan/eduplay/services/api/internal/user"
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
}

type Service interface {
	ListGames() ([]Game, error)
	GetGame(slug string) (*Game, error)
	SubmitScore(userID string, slug string, req SubmitScoreRequest) (*SubmitScoreResponse, error)
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) ListGames() ([]Game, error) {
	return s.repo.FindAll()
}

func (s *service) GetGame(slug string) (*Game, error) {
	return s.repo.FindBySlug(slug)
}

func (s *service) SubmitScore(userID string, slug string, req SubmitScoreRequest) (*SubmitScoreResponse, error) {
	g, err := s.repo.FindBySlug(slug)
	if err != nil {
		return nil, errors.New("game not found")
	}

	uid, _ := uuid.Parse(userID)

	// Anti-cheat: Rate limit submit score
	ctx := context.Background()
	rateLimitKey := fmt.Sprintf("ratelimit:submit_score:%s:%s", userID, slug)
	allowed, _ := database.RDB.SetNX(ctx, rateLimitKey, "1", 30*time.Second).Result()
	if !allowed {
		return nil, errors.New("please wait before submitting another score")
	}

	// Anti-cheat: Basic duration check (score too high for short duration)
	// Just a simple heuristic: if duration < 5s and score > 50, reject
	if req.Duration < 5 && req.Score > 50 {
		return nil, errors.New("invalid score for given duration")
	}

	multiplier := 1.0
	switch req.Difficulty {
	case "medium":
		multiplier = 1.5
	case "hard":
		multiplier = 2.0
	}

	xp := int(math.Floor(float64(req.Score)/10) * multiplier)

	session := &GameSession{
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

	var u user.User
	if err := database.DB.Where("id = ?", userID).First(&u).Error; err == nil {
		u.XP += xp
		u.Level = user.LevelFromXP(u.XP)
		now := time.Now()
		u.LastActive = &now
		database.DB.Save(&u)
	}

	return &SubmitScoreResponse{
		SessionID:    session.ID,
		XPEarned:     xp,
		NewHighscore: newHighscore,
	}, nil
}
