package service

import (
	"encoding/json"
	"errors"
	"time"

	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/google/uuid"
)

type GhostBotService interface {
	GetGhostMatch(gameID, difficulty string, userScore int) (*GhostBotMatch, error)
}

type GhostBotMatch struct {
	GhostID      string        `json:"ghost_id"`
	PlayerName   string        `json:"player_name"`
	Score        int           `json:"score"`
	TotalCorrect int           `json:"total_correct"`
	Events       []model.GhostEvent `json:"events"`
}

type ghostBotService struct{}

func NewGhostBotService() GhostBotService {
	return &ghostBotService{}
}

func (s *ghostBotService) GetGhostMatch(gameID, difficulty string, userScore int) (*GhostBotMatch, error) {
	gid, err := uuid.Parse(gameID)
	if err != nil {
		return nil, errors.New("ID game tidak valid")
	}

	scoreMin := userScore - 50
	scoreMax := userScore + 50
	if scoreMin < 0 {
		scoreMin = 0
	}

	var ghost model.GhostReplay
	err = database.DB.Where("game_id = ? AND difficulty = ? AND score BETWEEN ? AND ? AND is_active = true",
		gid, difficulty, scoreMin, scoreMax).
		Order("RANDOM()").
		First(&ghost).Error
	if err != nil {
		return nil, errors.New("Tidak ada ghost replay yang cocok")
	}

	var events []model.GhostEvent
	if err := json.Unmarshal(ghost.EventsJSON, &events); err != nil {
		return nil, errors.New("Data ghost replay rusak")
	}

	var u model.User
	database.DB.First(&u, "id = ?", ghost.UserID)
	playerName := u.Username
	if playerName == "" {
		playerName = "Player"
	}

	return &GhostBotMatch{
		GhostID:      ghost.ID.String(),
		PlayerName:   playerName + " (rekaman)",
		Score:        ghost.Score,
		TotalCorrect: ghost.CorrectAnswers,
		Events:       events,
	}, nil
}

func StartGhostReplayCleanup() {
	go func() {
		for {
			time.Sleep(24 * time.Hour)
			database.DB.Model(&model.GhostReplay{}).
				Where("created_at < NOW() - INTERVAL '30 days'").
				Update("is_active", false)
		}
	}()
}
