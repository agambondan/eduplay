package repository

import (
	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/google/uuid"
)

type GameRepository interface {
	FindAll() ([]model.Game, error)
	FindBySlug(slug string) (*model.Game, error)
	CreateSession(session *model.GameSession) error
	GetHighscore(userID, gameID uuid.UUID) (*model.UserHighscore, error)
	UpsertHighscore(userID, gameID uuid.UUID, score int) error
}

type gameRepository struct{}

func NewGameRepository() GameRepository {
	return &gameRepository{}
}

func (r *gameRepository) FindAll() ([]model.Game, error) {
	var games []model.Game
	err := database.DB.Where("is_active = ?", true).Find(&games).Error
	return games, err
}

func (r *gameRepository) FindBySlug(slug string) (*model.Game, error) {
	var g model.Game
	err := database.DB.Where("slug = ? AND is_active = ?", slug, true).First(&g).Error
	return &g, err
}

func (r *gameRepository) CreateSession(session *model.GameSession) error {
	return database.DB.Create(session).Error
}

func (r *gameRepository) GetHighscore(userID, gameID uuid.UUID) (*model.UserHighscore, error) {
	var hs model.UserHighscore
	err := database.DB.Where("user_id = ? AND game_id = ?", userID, gameID).First(&hs).Error
	return &hs, err
}

func (r *gameRepository) UpsertHighscore(userID, gameID uuid.UUID, score int) error {
	var existing model.UserHighscore
	err := database.DB.Where("user_id = ? AND game_id = ?", userID, gameID).First(&existing).Error
	if err != nil {
		hs := model.UserHighscore{
			UserID:    userID,
			GameID:    gameID,
			Highscore: score,
		}
		return database.DB.Create(&hs).Error
	}
	if score > existing.Highscore {
		existing.Highscore = score
		return database.DB.Save(&existing).Error
	}
	return nil
}
