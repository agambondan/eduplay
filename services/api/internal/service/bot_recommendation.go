package service

import (
	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/google/uuid"
)

type BotRecommendationService interface {
	GetRecommendedDifficulty(userID, gameSlug string) string
}

type botRecommendationService struct{}

func NewBotRecommendationService() BotRecommendationService {
	return &botRecommendationService{}
}

func (s *botRecommendationService) GetRecommendedDifficulty(userID, gameSlug string) string {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return "medium"
	}

	var game model.Game
	if err := database.DB.Where("slug = ?", gameSlug).First(&game).Error; err != nil {
		return "medium"
	}

	var avgScore float64
	database.DB.Model(&model.GameSession{}).
		Where("user_id = ? AND game_id = ?", uid, game.ID).
		Select("COALESCE(AVG(score), 0)").
		Scan(&avgScore)

	var maxScore int
	database.DB.Model(&model.UserHighscore{}).
		Where("user_id = ? AND game_id = ?", uid, game.ID).
		Select("COALESCE(highscore, 0)").
		Scan(&maxScore)

	if maxScore == 0 {
		return "easy"
	}

	ratio := avgScore / float64(maxScore)
	switch {
	case ratio < 0.3:
		return "easy"
	case ratio < 0.6:
		return "medium"
	default:
		return "hard"
	}
}
