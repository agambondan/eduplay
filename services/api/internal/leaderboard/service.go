package leaderboard

import (
	"fmt"

	"github.com/agambondan/eduplay/services/api/internal/game"
	"github.com/agambondan/eduplay/services/api/internal/user"
	"github.com/agambondan/eduplay/services/api/pkg/database"
)

type Entry struct {
	Rank     int    `json:"rank"`
	UserID   string `json:"user_id"`
	Username string `json:"username"`
	Score    int    `json:"score"`
}

type LeaderboardResponse struct {
	Entries  []Entry `json:"entries"`
	UserRank *Entry  `json:"user_rank,omitempty"`
}

type Service interface {
	GetGameLeaderboard(slug string, period string, userID string, limit int64) (*LeaderboardResponse, error)
	GetGlobalLeaderboard(userID string, limit int64) (*LeaderboardResponse, error)
	AddGameScore(gameID string, userID string, score float64) error
}

type service struct {
	repo     Repository
	gameRepo game.Repository
}

func NewService(repo Repository, gameRepo game.Repository) Service {
	return &service{repo: repo, gameRepo: gameRepo}
}

func (s *service) GetGameLeaderboard(slug string, period string, userID string, limit int64) (*LeaderboardResponse, error) {
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

	resp := &LeaderboardResponse{Entries: entries}
	if userID != "" {
		rank, err := s.repo.GetUserRank(key, userID)
		if err == nil {
			var u user.User
			database.DB.Select("username").Where("id = ?", userID).First(&u)
			
			// We need user's score too, but rank is 0-indexed
			// Easiest is to get score by calling ZScore if rank is known, but GetUserRank returns rank.
			// Just finding it from DB highscore or ZScore
			resp.UserRank = &Entry{
				Rank:     int(rank) + 1,
				UserID:   userID,
				Username: u.Username,
			}
		}
	}

	return resp, nil
}

func (s *service) GetGlobalLeaderboard(userID string, limit int64) (*LeaderboardResponse, error) {
	results, err := s.repo.GetTopN("leaderboard:global:xp", limit)
	if err != nil {
		return nil, err
	}

	entries := make([]Entry, 0, len(results))
	for i, z := range results {
		uid, score := ParseScore(z)
		var u user.User
		database.DB.Select("username", "level", "xp").Where("id = ?", uid).First(&u)
		entries = append(entries, Entry{
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
			var u user.User
			database.DB.Select("username", "xp").Where("id = ?", userID).First(&u)
			resp.UserRank = &Entry{
				Rank:     int(rank) + 1,
				UserID:   userID,
				Username: u.Username,
				Score:    u.XP,
			}
		}
	}

	return resp, nil
}

func (s *service) AddGameScore(gameID string, userID string, score float64) error {
	keyAll := fmt.Sprintf("leaderboard:game:%s:all", gameID)
	keyWeekly := fmt.Sprintf("leaderboard:game:%s:weekly", gameID)
	s.repo.AddScore(keyAll, userID, score)
	s.repo.AddScore(keyWeekly, userID, score)
	return nil
}
