package service

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupBattleshipTestDB(t *testing.T) {
	t.Helper()

	db, err := gorm.Open(sqlite.Open("file:battleship?mode=memory&cache=shared"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.Migrator().DropTable(
		&model.MatchParticipant{},
		&model.MultiplayerMatch{},
		&model.BattleshipMatch{},
		&model.Game{},
		&model.User{},
	))
	require.NoError(t, db.AutoMigrate(
		&model.User{},
		&model.Game{},
		&model.BattleshipMatch{},
		&model.MultiplayerMatch{},
		&model.MatchParticipant{},
	))
	database.DB = db
}

func TestBattleshipTargetRequiresAnswerBeforeRetarget(t *testing.T) {
	setupBattleshipTestDB(t)

	user := model.User{
		ID:       uuid.New(),
		Username: "captain",
		Email:    "captain@example.com",
		Password: "hash",
	}
	require.NoError(t, database.DB.Create(&user).Error)

	svc := NewBattleshipService()
	match, err := svc.Create(user.ID.String(), CreateBattleshipInput{
		VsBot:         true,
		Difficulty:    "medium",
		BotDifficulty: "medium",
	})
	require.NoError(t, err)

	_, err = svc.Target(match.ID, user.ID.String(), 0, 0)
	require.NoError(t, err)

	_, err = svc.Target(match.ID, user.ID.String(), 0, 1)
	require.ErrorContains(t, err, "jawab soal aktif dulu")
}

func TestBattleshipHardQuestionIncludesExponent(t *testing.T) {
	q := generateBattleshipQuestion("hard")

	require.Contains(t, q.Text, "^2")
	require.True(t, strings.Contains(q.Text, "+") || strings.Contains(q.Text, "-"))
}

func TestBattleshipBotReturnResetsTurnExpiryOnParseFailure(t *testing.T) {
	oldExpiry := time.Now().Add(-time.Hour)
	match := &model.BattleshipMatch{
		Status:           "active",
		CurrentTurn:      "player2",
		TurnExpiresAt:    &oldExpiry,
		BotName:          "Bot Taktis",
		Player1BoardJSON: json.RawMessage("not-json"),
		LogJSON:          mustJSON([]string{}),
	}

	runBattleshipBotTurn(match)

	require.Equal(t, "player1", match.CurrentTurn)
	require.NotNil(t, match.TurnExpiresAt)
	require.True(t, match.TurnExpiresAt.After(time.Now().Add(23*time.Hour)))
}
