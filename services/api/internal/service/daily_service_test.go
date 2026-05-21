package service

import (
	"testing"
	"time"

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

func setupDailyTestDB() {
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		panic("failed to connect database")
	}
	db.Migrator().DropTable(&model.User{}, &model.Game{}, &model.DailyChallenge{}, &model.DailySubmission{})
	db.AutoMigrate(&model.User{}, &model.Game{}, &model.DailyChallenge{}, &model.DailySubmission{})
	database.DB = db

	mr, err := miniredis.Run()
	if err != nil {
		panic(err)
	}
	database.RDB = redis.NewClient(&redis.Options{Addr: mr.Addr()})
}

func TestDailyService_GetTodayChallenge(t *testing.T) {
	setupDailyTestDB()
	testUser := model.User{Username: "dgtc", Email: "dgtc@t.com", Password: "pwd"}
	require.NoError(t, database.DB.Create(&testUser).Error)
	testGame := model.Game{Slug: "dgtc-game", Name: "DGTC", Category: "math"}
	require.NoError(t, database.DB.Create(&testGame).Error)

	nowStr := time.Now().Format("2006-01-02")
	require.NoError(t, database.DB.Exec(
		"INSERT INTO daily_challenges (game_id, questions_json, challenge_date, created_at) VALUES (?, ?, ?, datetime('now'))",
		testGame.ID, `[{"question":"1+1","options":["1","2"],"answer":"2"}]`, nowStr,
	).Error)

	var daily model.DailyChallenge
	database.DB.Where("game_id = ?", testGame.ID).First(&daily)

	svc := NewDailyService(repository.NewGameRepository(), &mockAchievement{})

	resp, err := svc.GetTodayChallenge("")
	require.NoError(t, err)
	assert.Equal(t, daily.ID.String(), resp.ChallengeID)
	assert.Equal(t, testGame.Slug, resp.Game.Slug)
	assert.Len(t, resp.Questions, 1)
	assert.False(t, resp.UserSubmitted)
}

func TestDailyService_SubmitChallenge(t *testing.T) {
	setupDailyTestDB()
	testUser := model.User{Username: "dscusr", Email: "dsc@t.com", Password: "pwd"}
	require.NoError(t, database.DB.Create(&testUser).Error)
	testGame := model.Game{Slug: "dsc-game", Name: "DSC", Category: "math"}
	require.NoError(t, database.DB.Create(&testGame).Error)

	nowStr := time.Now().Format("2006-01-02")
	require.NoError(t, database.DB.Exec(
		"INSERT INTO daily_challenges (game_id, questions_json, challenge_date, created_at) VALUES (?, ?, ?, datetime('now'))",
		testGame.ID, `[{"question":"2+2","options":["3","4"],"answer":"4"}]`, nowStr,
	).Error)
	var daily model.DailyChallenge
	database.DB.Where("game_id = ?", testGame.ID).First(&daily)

	svc := NewDailyService(repository.NewGameRepository(), &mockAchievement{})

	resp, err := svc.SubmitChallenge(testUser.ID.String(), daily.ID.String(), 50)
	require.NoError(t, err)
	assert.Equal(t, 10, resp.XPEarned)
	assert.True(t, resp.StreakUpdated)

	_, err = svc.SubmitChallenge(testUser.ID.String(), daily.ID.String(), 50)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "already submitted")
}

func TestDailyService_SubmitChallenge_UpdatesXPAndStreak(t *testing.T) {
	setupDailyTestDB()
	testUser := model.User{Username: "dsxusr", Email: "dsx@t.com", Password: "pwd"}
	require.NoError(t, database.DB.Create(&testUser).Error)
	testGame := model.Game{Slug: "dsx-game", Name: "DSX", Category: "math"}
	require.NoError(t, database.DB.Create(&testGame).Error)

	nowStr := time.Now().Format("2006-01-02")
	require.NoError(t, database.DB.Exec(
		"INSERT INTO daily_challenges (game_id, questions_json, challenge_date, created_at) VALUES (?, ?, ?, datetime('now'))",
		testGame.ID, `[{"question":"3+3","options":["5","6"],"answer":"6"}]`, nowStr,
	).Error)
	var daily model.DailyChallenge
	database.DB.Where("game_id = ?", testGame.ID).First(&daily)

	svc := NewDailyService(repository.NewGameRepository(), &mockAchievement{})

	resp, err := svc.SubmitChallenge(testUser.ID.String(), daily.ID.String(), 50)
	require.NoError(t, err)
	assert.Equal(t, 10, resp.XPEarned)
	assert.True(t, resp.StreakUpdated)

	var u model.User
	database.DB.Where("id = ?", testUser.ID).First(&u)
	assert.Equal(t, 10, u.XP)
	assert.GreaterOrEqual(t, u.Streak, 1)
}
