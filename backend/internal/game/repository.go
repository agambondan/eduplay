package game

import (
	"github.com/agambondan/eduplay/backend/pkg/database"
	"github.com/google/uuid"
)

type Repository interface {
	FindAll() ([]Game, error)
	FindBySlug(slug string) (*Game, error)
	CreateSession(session *GameSession) error
	GetHighscore(userID, gameID uuid.UUID) (*UserHighscore, error)
	UpsertHighscore(userID, gameID uuid.UUID, score int) error
}

type repository struct{}

func NewRepository() Repository {
	return &repository{}
}

func (r *repository) FindAll() ([]Game, error) {
	var games []Game
	err := database.DB.Where("is_active = ?", true).Find(&games).Error
	return games, err
}

func (r *repository) FindBySlug(slug string) (*Game, error) {
	var g Game
	err := database.DB.Where("slug = ? AND is_active = ?", slug, true).First(&g).Error
	return &g, err
}

func (r *repository) CreateSession(session *GameSession) error {
	return database.DB.Create(session).Error
}

func (r *repository) GetHighscore(userID, gameID uuid.UUID) (*UserHighscore, error) {
	var hs UserHighscore
	err := database.DB.Where("user_id = ? AND game_id = ?", userID, gameID).First(&hs).Error
	return &hs, err
}

func (r *repository) UpsertHighscore(userID, gameID uuid.UUID, score int) error {
	var existing UserHighscore
	err := database.DB.Where("user_id = ? AND game_id = ?", userID, gameID).First(&existing).Error
	if err != nil {
		hs := UserHighscore{
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
