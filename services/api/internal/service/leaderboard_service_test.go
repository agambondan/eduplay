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

var lbDBSeq int64

func setupLeaderboardTestDB() {
	lbDBSeq++
	db, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:lbtest%d?mode=memory&cache=private", lbDBSeq)), &gorm.Config{})
	if err != nil {
		panic("failed to connect database")
	}
	db.Migrator().DropTable(&model.User{}, &model.Game{}, &model.UserHighscore{})
	db.AutoMigrate(&model.User{}, &model.Game{}, &model.UserHighscore{})
	database.DB = db

	mr, err := miniredis.Run()
	if err != nil {
		panic(err)
	}
	database.RDB = redis.NewClient(&redis.Options{Addr: mr.Addr()})
}

func seedLeaderboardData(t *testing.T) (testUser model.User, testGame model.Game) {
	testUser = model.User{Username: "lbplayer", Email: "lb@test.com", Password: "pwd", XP: 500, Level: 5}
	require.NoError(t, database.DB.Create(&testUser).Error)

	testGame = model.Game{Slug: "math-quiz", Name: "Math Quiz", Category: "math"}
	require.NoError(t, database.DB.Create(&testGame).Error)

	return
}

func TestLeaderboardService_AddGameScore(t *testing.T) {
	setupLeaderboardTestDB()
	testUser, testGame := seedLeaderboardData(t)

	repo := repository.NewLeaderboardRepository()
	svc := NewLeaderboardService(repo, repository.NewGameRepository())

	err := svc.AddGameScore(testGame.ID.String(), testUser.ID.String(), 250)
	require.NoError(t, err)
}

func TestLeaderboardService_GetGameLeaderboard(t *testing.T) {
	setupLeaderboardTestDB()
	testUser, testGame := seedLeaderboardData(t)

	repo := repository.NewLeaderboardRepository()
	svc := NewLeaderboardService(repo, repository.NewGameRepository())

	err := svc.AddGameScore(testGame.ID.String(), testUser.ID.String(), 250)
	require.NoError(t, err)

	resp, err := svc.GetGameLeaderboard("math-quiz", "alltime", testUser.ID.String(), 10)
	require.NoError(t, err)
	assert.Len(t, resp.Entries, 1)
	assert.Equal(t, 250, resp.Entries[0].Score)
	assert.Equal(t, "lbplayer", resp.Entries[0].Username)
	assert.NotNil(t, resp.UserRank)
	assert.Equal(t, "lbplayer", resp.UserRank.Username)
}

func TestLeaderboardService_GetGlobalLeaderboard(t *testing.T) {
	setupLeaderboardTestDB()
	testUser, _ := seedLeaderboardData(t)

	repo := repository.NewLeaderboardRepository()
	svc := NewLeaderboardService(repo, repository.NewGameRepository())

	database.RDB.ZAdd(context.Background(), "leaderboard:global:xp", redis.Z{
		Score:  float64(testUser.XP),
		Member: testUser.ID.String(),
	}).Err()

	resp, err := svc.GetGlobalLeaderboard(testUser.ID.String(), 10)
	require.NoError(t, err)
	assert.Len(t, resp.Entries, 1)
	assert.Equal(t, 500, resp.Entries[0].Score)
	assert.NotNil(t, resp.UserRank)
	assert.Equal(t, 1, resp.UserRank.Rank)
	assert.Equal(t, 5, resp.UserRank.Level)
}

func TestLeaderboardService_GetGameLeaderboard_Empty(t *testing.T) {
	setupLeaderboardTestDB()
	seedLeaderboardData(t)

	repo := repository.NewLeaderboardRepository()
	svc := NewLeaderboardService(repo, repository.NewGameRepository())

	resp, err := svc.GetGameLeaderboard("math-quiz", "alltime", "", 10)
	require.NoError(t, err)
	assert.Len(t, resp.Entries, 0)
}
