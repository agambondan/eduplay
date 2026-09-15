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

// UpsertHighscore is a single atomic upsert (INSERT ... ON CONFLICT DO
// UPDATE with GREATEST) rather than a read-then-write, so two concurrent
// submissions from the same user can't race each other into a lost update.
func (r *gameRepository) UpsertHighscore(userID, gameID uuid.UUID, score int) error {
	// CASE/WHEN instead of GREATEST()/MAX(a,b): the former isn't valid
	// standard SQL scalar syntax in SQLite and the latter isn't valid in
	// Postgres (MAX there is aggregate-only), so this is the one form both
	// the Postgres production DB and the SQLite test DB accept.
	return database.DB.Exec(
		`INSERT INTO user_highscores (user_id, game_id, highscore, updated_at)
		 VALUES (?, ?, ?, CURRENT_TIMESTAMP)
		 ON CONFLICT (user_id, game_id) DO UPDATE SET
		   highscore = CASE WHEN EXCLUDED.highscore > user_highscores.highscore
		                     THEN EXCLUDED.highscore ELSE user_highscores.highscore END,
		   updated_at = CURRENT_TIMESTAMP`,
		userID, gameID, score,
	).Error
}
