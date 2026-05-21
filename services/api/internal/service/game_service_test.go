package service

import (
	"context"
	"fmt"
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

var gameDBSeq int64

func setupGameTestDB() {
	gameDBSeq++
	db, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:gametest%d?mode=memory&cache=private", gameDBSeq)), &gorm.Config{})
	if err != nil {
		panic("failed to connect database")
	}
	db.Migrator().DropTable(&model.User{}, &model.Game{}, &model.GameSession{}, &model.UserHighscore{}, &model.GhostReplay{})
	db.AutoMigrate(&model.User{}, &model.Game{}, &model.GameSession{}, &model.UserHighscore{}, &model.GhostReplay{})
	database.DB = db

	mr, err := miniredis.Run()
	if err != nil {
		panic(err)
	}
	database.RDB = redis.NewClient(&redis.Options{Addr: mr.Addr()})
}

func TestGameService_SubmitScore(t *testing.T) {
	setupGameTestDB()

	// Seed test data
	testUser := &model.User{Username: "player1", Email: "p1@test.com", Password: "pwd"}
	database.DB.Create(testUser)

	testGame := &model.Game{Slug: "math-quiz", Name: "Math Quiz", Category: "math"}
	database.DB.Create(testGame)

	repo := repository.NewGameRepository()
	// Mock achSvc and leadSvc
	svc := NewGameService(repo, &mockAchievement{}, &mockLeaderboard{})

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
		Score:      1001,
		Duration:   45,
		Difficulty: "easy",
	}
	_, err = svc.SubmitScore(testUser.ID.String(), "math-quiz", reqCheat)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "score exceeds maximum allowed")
}
