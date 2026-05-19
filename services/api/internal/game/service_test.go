package game

import (
	"testing"

	"github.com/agambondan/eduplay/backend/internal/user"
	"github.com/agambondan/eduplay/backend/pkg/database"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestDB() {
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		panic("failed to connect database")
	}
	db.AutoMigrate(&user.User{}, &Game{}, &GameSession{}, &UserHighscore{})
	database.DB = db
}

func TestGameService_SubmitScore(t *testing.T) {
	setupTestDB()

	// Seed test data
	testUser := &user.User{Username: "player1", Email: "p1@test.com", Password: "pwd"}
	database.DB.Create(testUser)

	testGame := &Game{Slug: "math-quiz", Name: "Math Quiz", Category: "math"}
	database.DB.Create(testGame)

	repo := NewRepository()
	svc := NewService(repo)

	req := SubmitScoreRequest{
		Score:      250,
		Duration:   45,
		Difficulty: "medium", // Multiplier 1.5
	}

	resp, err := svc.SubmitScore(testUser.ID.String(), "math-quiz", req)
	require.NoError(t, err)

	// XP logic in service:
	// base_xp := score / 10
	// 250 / 10 = 25
	// 25 * 1.5 = 37 (rounded down to int)
	assert.Equal(t, 37, resp.XPEarned)
	assert.True(t, resp.NewHighscore)

	// Submit lower score, shouldn't be highscore
	req2 := SubmitScoreRequest{
		Score:      150,
		Duration:   30,
		Difficulty: "easy",
	}
	resp2, err := svc.SubmitScore(testUser.ID.String(), "math-quiz", req2)
	require.NoError(t, err)
	assert.False(t, resp2.NewHighscore)
}
