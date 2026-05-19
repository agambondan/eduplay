package service

import (
	"context"
	"testing"

	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/internal/repository"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupGameTestDB() {
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		panic("failed to connect database")
	}
	db.AutoMigrate(&model.User{}, &model.Game{}, &model.GameSession{}, &model.UserHighscore{})
	database.DB = db

	mr, err := miniredis.Run()
	if err != nil {
		panic(err)
	}
	database.RDB = redis.NewClient(&redis.Options{Addr: mr.Addr()})
}

func TestGameService_SubmitScore(t *testing.T) {
	setupGameTestDB()

	testUser := &model.User{Username: "player1", Email: "p1@test.com", Password: "pwd"}
	database.DB.Create(testUser)

	testGame := &model.Game{Slug: "math-quiz", Name: "Math Quiz", Category: "math"}
	database.DB.Create(testGame)

	repo := repository.NewGameRepository()
	svc := NewGameService(repo)

	req := SubmitScoreRequest{
		Score:      250,
		Duration:   45,
		Difficulty: "medium",
	}

	resp, err := svc.SubmitScore(testUser.ID.String(), "math-quiz", req)
	require.NoError(t, err)
	assert.Equal(t, 37, resp.XPEarned)
	assert.True(t, resp.NewHighscore)

	database.RDB.Del(context.Background(), "ratelimit:submit_score:"+testUser.ID.String()+":math-quiz")

	reqCheat := SubmitScoreRequest{
		Score:      999,
		Duration:   2,
		Difficulty: "easy",
	}
	_, err = svc.SubmitScore(testUser.ID.String(), "math-quiz", reqCheat)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid score for given duration")
}
