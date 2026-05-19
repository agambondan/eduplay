package service

import (
	"fmt"

	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/internal/repository"
	"github.com/agambondan/eduplay/services/api/pkg/database"
)

type LeaderboardResponse struct {
	Entries  []repository.Entry `json:"entries"`
	UserRank *repository.Entry  `json:"user_rank,omitempty"`
}

type LeaderboardService interface {
	GetGameLeaderboard(slug string, period string, userID string, limit int64) (*LeaderboardResponse, error)
	GetGlobalLeaderboard(userID string, limit int64) (*LeaderboardResponse, error)
	AddGameScore(gameID string, userID string, score float64) error
}

type leaderboardService struct {
	repo     repository.LeaderboardRepository
	gameRepo repository.GameRepository
}

func NewLeaderboardService(repo repository.LeaderboardRepository, gameRepo repository.GameRepository) LeaderboardService {
	return &leaderboardService{repo: repo, gameRepo: gameRepo}
}

func (s *leaderboardService) GetGameLeaderboard(slug string, period string, userID string, limit int64) (*LeaderboardResponse, error) {
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

	entries := make([]repository.Entry, 0, len(results))
	for i, z := range results {
		uid, score := repository.ParseScore(z)
		var u model.User
		database.DB.Select("username").Where("id = ?", uid).First(&u)
		entries = append(entries, repository.Entry{
			Rank:     i + 1,
			UserID:   uid,
			Username: u.Username,
			Score:    score,
		})
	}

	resp := &LeaderboardResponse{Entries: entries}
	if userID != "" {
		rank, err := s.repo.GetUserRank(key, userID)
		if err == nil {
			var u model.User
			database.DB.Select("username").Where("id = ?", userID).First(&u)
			resp.UserRank = &repository.Entry{
				Rank:     int(rank) + 1,
				UserID:   userID,
				Username: u.Username,
			}
		}
	}

	return resp, nil
}

func (s *leaderboardService) GetGlobalLeaderboard(userID string, limit int64) (*LeaderboardResponse, error) {
	results, err := s.repo.GetTopN("leaderboard:global:xp", limit)
	if err != nil {
		return nil, err
	}

	entries := make([]repository.Entry, 0, len(results))
	for i, z := range results {
		uid, score := repository.ParseScore(z)
		var u model.User
		database.DB.Select("username", "level", "xp").Where("id = ?", uid).First(&u)
		entries = append(entries, repository.Entry{
			Rank:     i + 1,
			UserID:   uid,
			Username: u.Username,
			Score:    score,
		})
	}

	resp := &LeaderboardResponse{Entries: entries}
	if userID != "" {
		rank, err := s.repo.GetUserRank("leaderboard:global:xp", userID)
		if err == nil {
			var u model.User
			database.DB.Select("username", "xp").Where("id = ?", userID).First(&u)
			resp.UserRank = &repository.Entry{
				Rank:     int(rank) + 1,
				UserID:   userID,
				Username: u.Username,
				Score:    u.XP,
			}
		}
	}

	return resp, nil
}

func (s *leaderboardService) AddGameScore(gameID string, userID string, score float64) error {
	keyAll := fmt.Sprintf("leaderboard:game:%s:all", gameID)
	keyWeekly := fmt.Sprintf("leaderboard:game:%s:weekly", gameID)
	s.repo.AddScore(keyAll, userID, score)
	s.repo.AddScore(keyWeekly, userID, score)
	return nil
}
