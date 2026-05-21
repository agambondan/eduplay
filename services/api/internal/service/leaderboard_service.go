package service

import (
	"context"
	"fmt"
	"time"

	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/internal/repository"
	"github.com/agambondan/eduplay/services/api/pkg/cache"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

type LeaderboardResponse struct {
	Entries       []repository.Entry `json:"entries"`
	UserRank      *repository.Entry  `json:"user_rank,omitempty"`
	NearbyEntries []repository.Entry `json:"nearby_entries,omitempty"`
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
	ctx := context.Background()
	cacheID := fmt.Sprintf("%s:%s:%s", slug, period, userID)
	result, err := cache.GetOrSet(ctx, "leaderboard_game", cacheID, 30*time.Second, func() (*LeaderboardResponse, error) {
		return s.getGameLeaderboardRaw(slug, period, userID, limit)
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (s *leaderboardService) getGameLeaderboardRaw(slug string, period string, userID string, limit int64) (*LeaderboardResponse, error) {
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

	userMap := s.batchFetchUsers(results)
	entries := make([]repository.Entry, 0, len(results))
	for i, z := range results {
		uid, score := repository.ParseScore(z)
		u := userMap[uid]
		entries = append(entries, repository.Entry{
			Rank:     i + 1,
			UserID:   uid,
			Username: u,
			Score:    score,
		})
	}

	resp := &LeaderboardResponse{Entries: entries}
	if userID != "" {
		rank, err := s.repo.GetUserRank(key, userID)
		if err == nil {
			var u model.User
			database.DB.Select("username", "xp", "level").Where("id = ?", userID).First(&u)
			userScore := u.XP
			resp.UserRank = &repository.Entry{
				Rank:     int(rank),
				UserID:   userID,
				Username: u.Username,
				Score:    userScore,
				Level:    u.Level,
			}

			startPos := maxInt(0, int(rank)-3)
			endPos := int(rank) + 1
			nearbyRaw, err := s.repo.GetRangeByRank(key, int64(startPos), int64(endPos))
			if err == nil {
				nearbyUserMap := s.batchFetchUsers(nearbyRaw)
				nearby := make([]repository.Entry, 0, len(nearbyRaw))
				for i, z := range nearbyRaw {
					uid, score := repository.ParseScore(z)
					nu := nearbyUserMap[uid]
					nearby = append(nearby, repository.Entry{
						Rank:     startPos + i + 1,
						UserID:   uid,
						Username: nu,
						Score:    int(score),
					})
				}
				resp.NearbyEntries = nearby
			}
		}
	}

	return resp, nil
}

func (s *leaderboardService) batchFetchUsers(results []redis.Z) map[string]string {
	userIDs := make([]string, 0, len(results))
	for _, z := range results {
		uid, _ := repository.ParseScore(z)
		userIDs = append(userIDs, uid)
	}

	parsed := make([]uuid.UUID, 0, len(userIDs))
	for _, id := range userIDs {
		uid, err := uuid.Parse(id)
		if err == nil {
			parsed = append(parsed, uid)
		}
	}

	var users []model.User
	database.DB.Where("id IN ?", parsed).Select("id, username").Find(&users)

	userMap := make(map[string]string, len(users))
	for _, u := range users {
		userMap[u.ID.String()] = u.Username
	}
	for _, id := range userIDs {
		if _, ok := userMap[id]; !ok {
			userMap[id] = "Unknown"
		}
	}
	return userMap
}

func (s *leaderboardService) GetGlobalLeaderboard(userID string, limit int64) (*LeaderboardResponse, error) {
	ctx := context.Background()
	cacheID := fmt.Sprintf("global:%s", userID)
	result, err := cache.GetOrSet(ctx, "leaderboard_global", cacheID, 30*time.Second, func() (*LeaderboardResponse, error) {
		results, err := s.repo.GetTopN("leaderboard:global:xp", limit)
		if err != nil {
			return nil, err
		}

		userMap := s.batchFetchUsers(results)
		entries := make([]repository.Entry, 0, len(results))
		for i, z := range results {
			uid, score := repository.ParseScore(z)
			u := userMap[uid]
			entries = append(entries, repository.Entry{
				Rank:     i + 1,
				UserID:   uid,
				Username: u,
				Score:    score,
			})
		}

		resp := &LeaderboardResponse{Entries: entries}
		if userID != "" {
			rank, err := s.repo.GetUserRank("leaderboard:global:xp", userID)
			if err == nil {
				var u model.User
				database.DB.Select("username", "xp", "level").Where("id = ?", userID).First(&u)
				resp.UserRank = &repository.Entry{
					Rank:     int(rank),
					UserID:   userID,
					Username: u.Username,
					Score:    u.XP,
					Level:    u.Level,
				}
			}
		}

		return resp, nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func (s *leaderboardService) AddGameScore(gameID string, userID string, score float64) error {
	keyAll := fmt.Sprintf("leaderboard:game:%s:all", gameID)
	keyWeekly := fmt.Sprintf("leaderboard:game:%s:weekly", gameID)
	s.repo.AddScore(keyAll, userID, score)
	s.repo.AddScore(keyWeekly, userID, score)
	return nil
}
