package service

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/google/uuid"
)

type MultiplayerLeaderboardService interface {
	GetLeaderboard(gameSlug string) ([]MultiplayerLeaderboardEntry, error)
	GetGlobalLeaderboard() ([]MultiplayerLeaderboardEntry, error)
	GetUserStats(userID string) (*MultiplayerUserStats, error)
}

type MultiplayerLeaderboardEntry struct {
	Rank       int     `json:"rank"`
	UserID     string  `json:"user_id"`
	Username   string  `json:"username"`
	Wins       int     `json:"wins"`
	Losses     int     `json:"losses"`
	TotalGames int     `json:"total_games"`
	WinRate    float64 `json:"win_rate"`
}

type MultiplayerUserStats struct {
	Wins          int     `json:"wins"`
	Losses        int     `json:"losses"`
	Draws         int     `json:"draws"`
	TotalGames    int     `json:"total_games"`
	WinRate       float64 `json:"win_rate"`
	CurrentStreak int     `json:"current_streak"`
	BestStreak    int     `json:"best_streak"`
}

type multiplayerLeaderboardService struct{}

func NewMultiplayerLeaderboardService() MultiplayerLeaderboardService {
	return &multiplayerLeaderboardService{}
}

func (s *multiplayerLeaderboardService) GetLeaderboard(gameSlug string) ([]MultiplayerLeaderboardEntry, error) {
	var game model.Game
	if err := database.DB.Where("slug = ?", gameSlug).First(&game).Error; err != nil {
		return nil, errors.New("Game tidak ditemukan")
	}

	var results []struct {
		UserID   string
		Username string
		Wins     int
		Losses   int
		Total    int
	}

	database.DB.Raw(`
		SELECT u.id as user_id, u.username,
			COUNT(CASE WHEN mp.is_winner AND mp.user_id IS NOT NULL THEN 1 END) as wins,
			COUNT(CASE WHEN NOT mp.is_winner AND mp.user_id IS NOT NULL AND m.winner_id IS NOT NULL THEN 1 END) as losses,
			COUNT(mp.id) as total
		FROM match_participants mp
		JOIN users u ON u.id = mp.user_id
		JOIN multiplayer_matches m ON m.id = mp.match_id
		WHERE m.game_id = ? AND m.status = 'finished' AND mp.user_id IS NOT NULL
		GROUP BY u.id, u.username
		ORDER BY wins DESC
		LIMIT 50
	`, game.ID).Scan(&results)

	entries := make([]MultiplayerLeaderboardEntry, len(results))
	for i, r := range results {
		winRate := 0.0
		if r.Total > 0 {
			winRate = float64(r.Wins) / float64(r.Total) * 100
		}
		entries[i] = MultiplayerLeaderboardEntry{
			Rank:       i + 1,
			UserID:     r.UserID,
			Username:   r.Username,
			Wins:       r.Wins,
			Losses:     r.Losses,
			TotalGames: r.Total,
			WinRate:    winRate,
		}
	}
	return entries, nil
}

func (s *multiplayerLeaderboardService) GetGlobalLeaderboard() ([]MultiplayerLeaderboardEntry, error) {
	var results []struct {
		UserID   string
		Username string
		Wins     int
		Losses   int
		Total    int
	}

	database.DB.Raw(`
		SELECT u.id as user_id, u.username,
			COUNT(CASE WHEN mp.is_winner AND mp.user_id IS NOT NULL THEN 1 END) as wins,
			COUNT(CASE WHEN NOT mp.is_winner AND mp.user_id IS NOT NULL AND m.winner_id IS NOT NULL THEN 1 END) as losses,
			COUNT(mp.id) as total
		FROM match_participants mp
		JOIN users u ON u.id = mp.user_id
		JOIN multiplayer_matches m ON m.id = mp.match_id
		WHERE m.status = 'finished' AND mp.user_id IS NOT NULL
		GROUP BY u.id, u.username
		ORDER BY wins DESC
		LIMIT 100
	`).Scan(&results)

	entries := make([]MultiplayerLeaderboardEntry, len(results))
	for i, r := range results {
		winRate := 0.0
		if r.Total > 0 {
			winRate = float64(r.Wins) / float64(r.Total) * 100
		}
		entries[i] = MultiplayerLeaderboardEntry{
			Rank:       i + 1,
			UserID:     r.UserID,
			Username:   r.Username,
			Wins:       r.Wins,
			Losses:     r.Losses,
			TotalGames: r.Total,
			WinRate:    winRate,
		}
	}
	return entries, nil
}

func (s *multiplayerLeaderboardService) GetUserStats(userID string) (*MultiplayerUserStats, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, errors.New("ID pengguna tidak valid")
	}

	var stats struct {
		Wins   int
		Losses int
		Total  int
	}
	database.DB.Raw(`
		SELECT
			COUNT(CASE WHEN mp.is_winner THEN 1 END) as wins,
			COUNT(CASE WHEN NOT mp.is_winner AND m.winner_id IS NOT NULL THEN 1 END) as losses,
			COUNT(mp.id) as total
		FROM match_participants mp
		JOIN multiplayer_matches m ON m.id = mp.match_id
		WHERE mp.user_id = ? AND m.status = 'finished'
	`, uid).Scan(&stats)

	draws := stats.Total - stats.Wins - stats.Losses
	if draws < 0 {
		draws = 0
	}
	winRate := 0.0
	if stats.Total > 0 {
		winRate = float64(stats.Wins) / float64(stats.Total) * 100
	}

	return &MultiplayerUserStats{
		Wins:          stats.Wins,
		Losses:        stats.Losses,
		Draws:         draws,
		TotalGames:    stats.Total,
		WinRate:       winRate,
		CurrentStreak: 0,
		BestStreak:    0,
	}, nil
}

type RematchService interface {
	CreateRematch(roomCode string) (string, error)
}

type rematchService struct {
	roomSvc RoomService
}

func NewRematchService(roomSvc RoomService) RematchService {
	return &rematchService{roomSvc: roomSvc}
}

func (s *rematchService) CreateRematch(oldRoomCode string) (string, error) {
	data, err := database.RDB.Get(context.Background(), "room:"+oldRoomCode).Result()
	if err != nil {
		return "", errors.New("Room tidak ditemukan")
	}

	var oldRoom RoomData
	if err := json.Unmarshal([]byte(data), &oldRoom); err != nil {
		return "", errors.New("Data room rusak")
	}

	settings := RoomSettingsInput{
		Questions:  oldRoom.Settings.Questions,
		Category:   oldRoom.Settings.Category,
		Difficulty: oldRoom.Settings.Difficulty,
		Timer:      oldRoom.Settings.Timer,
		MaxPlayers: oldRoom.Settings.MaxPlayers,
		AllowBots:  oldRoom.Settings.AllowBots,
	}

	result, err := s.roomSvc.CreateRoom(oldRoom.HostID, oldRoom.GameSlug, settings)
	if err != nil {
		return "", err
	}

	return result.RoomCode, nil
}
