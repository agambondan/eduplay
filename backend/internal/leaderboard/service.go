package leaderboard

import (
	"fmt"

	"github.com/agambondan/eduplay/backend/internal/game"
	"github.com/agambondan/eduplay/backend/internal/user"
	"github.com/agambondan/eduplay/backend/pkg/database"
)

type Service interface {
	GetGameLeaderboard(slug string, period string, limit int64) ([]Entry, error)
	GetGlobalLeaderboard(limit int64) ([]Entry, error)
	AddGameScore(gameID string, userID string, score float64) error
}

type service struct {
	repo     Repository
	gameRepo game.Repository
}

func NewService(repo Repository, gameRepo game.Repository) Service {
	return &service{repo: repo, gameRepo: gameRepo}
}

func (s *service) GetGameLeaderboard(slug string, period string, limit int64) ([]Entry, error) {
	g, err := s.gameRepo.FindBySlug(slug)
	if err != nil {
		return nil, err
	}

	suffix := "all"
	if period == "weekly" {
		suffix = "weekly"
	}
	key := fmt.Sprintf("leaderboard:game:%s:%s", g.ID.String(), suffix)

	results, err := s.repo.GetTopN(key, limit)
	if err != nil {
		return nil, err
	}

	entries := make([]Entry, 0, len(results))
	for i, z := range results {
		uid, score := ParseScore(z)
		var u user.User
		database.DB.Select("username").Where("id = ?", uid).First(&u)
		entries = append(entries, Entry{
			Rank:     i + 1,
			UserID:   uid,
			Username: u.Username,
			Score:    score,
		})
	}
	return entries, nil
}

func (s *service) GetGlobalLeaderboard(limit int64) ([]Entry, error) {
	results, err := s.repo.GetTopN("leaderboard:global:xp", limit)
	if err != nil {
		return nil, err
	}

	entries := make([]Entry, 0, len(results))
	for i, z := range results {
		uid, score := ParseScore(z)
		var u user.User
		database.DB.Select("username").Where("id = ?", uid).First(&u)
		entries = append(entries, Entry{
			Rank:     i + 1,
			UserID:   uid,
			Username: u.Username,
			Score:    score,
		})
	}
	return entries, nil
}

func (s *service) AddGameScore(gameID string, userID string, score float64) error {
	keyAll := fmt.Sprintf("leaderboard:game:%s:all", gameID)
	keyWeekly := fmt.Sprintf("leaderboard:game:%s:weekly", gameID)
	s.repo.AddScore(keyAll, userID, score)
	s.repo.AddScore(keyWeekly, userID, score)
	return nil
}
