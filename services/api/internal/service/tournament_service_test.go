package service

import (
	"fmt"
	"testing"
	"time"

	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var tournamentDBSeq int64

func setupTournamentTestDB(t *testing.T) {
	t.Helper()

	tournamentDBSeq++
	db, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:tournamenttest%d?mode=memory&cache=private", tournamentDBSeq)), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&model.User{}, &model.Achievement{}, &model.UserAchievement{}, &model.Tournament{}, &model.TournamentPlayer{}, &model.TournamentMatch{}))
	database.DB = db
}

func createTournamentUser(t *testing.T, username string, xp int) model.User {
	t.Helper()

	user := model.User{
		Username: username,
		Email:    username + "@example.test",
		Password: "password",
		XP:       xp,
		Level:    model.LevelFromXP(xp),
	}
	require.NoError(t, database.DB.Create(&user).Error)
	return user
}

func seedTournamentAchievements(t *testing.T) {
	t.Helper()
	require.NoError(t, database.DB.Create(&[]model.Achievement{
		{Slug: "tournament-champion", Name: "Tournament Champion", Icon: "crown"},
		{Slug: "tournament-finalist", Name: "Tournament Finalist", Icon: "award"},
	}).Error)
}

func TestTournamentServiceStartSeedsByXPAndBuildsBracket(t *testing.T) {
	setupTournamentTestDB(t)
	seedTournamentAchievements(t)

	host := createTournamentUser(t, "host", 10)
	top := createTournamentUser(t, "top", 2000)
	second := createTournamentUser(t, "second", 1000)
	third := createTournamentUser(t, "third", 500)

	svc := NewTournamentService()
	tournament, err := svc.Create(host.ID.String(), CreateTournamentInput{Name: "Seed Test", MaxPlayers: 4})
	require.NoError(t, err)
	for _, user := range []model.User{top, second, third} {
		_, err = svc.Join(tournament.ID, user.ID.String())
		require.NoError(t, err)
	}

	started, err := svc.Start(tournament.ID, host.ID.String())
	require.NoError(t, err)

	seedsByUserID := map[string]int{}
	for _, player := range started.Players {
		seedsByUserID[player.UserID] = player.Seed
	}
	assert.Equal(t, 1, seedsByUserID[top.ID.String()])
	assert.Equal(t, 2, seedsByUserID[second.ID.String()])
	assert.Equal(t, 3, seedsByUserID[third.ID.String()])
	assert.Equal(t, 4, seedsByUserID[host.ID.String()])

	require.Len(t, started.Matches, 2)
	assert.Equal(t, 1, started.Matches[0].Player1.Seed)
	assert.Equal(t, 4, started.Matches[0].Player2.Seed)
	assert.Equal(t, 2, started.Matches[1].Player1.Seed)
	assert.Equal(t, 3, started.Matches[1].Player2.Seed)
}

func TestTournamentServiceCreateOpenTournamentWithInviteCode(t *testing.T) {
	setupTournamentTestDB(t)
	seedTournamentAchievements(t)

	host := createTournamentUser(t, "host", 10)
	guest := createTournamentUser(t, "guest", 20)

	svc := NewTournamentService()
	tournament, err := svc.Create(host.ID.String(), CreateTournamentInput{
		Name:       "Daily Cup",
		Difficulty: "hard",
		Mode:       "open_daily",
		MaxPlayers: 8,
	})
	require.NoError(t, err)
	require.NotEmpty(t, tournament.InviteCode)
	assert.Equal(t, "open_daily", tournament.Mode)
	require.NotNil(t, tournament.ScheduledStartAt)
	require.NotNil(t, tournament.RegistrationEndsAt)

	joined, err := svc.Join(tournament.InviteCode, guest.ID.String())
	require.NoError(t, err)
	assert.Len(t, joined.Players, 2)
}

func TestTournamentServiceAutoStartsOpenTournamentAfterSchedule(t *testing.T) {
	setupTournamentTestDB(t)
	seedTournamentAchievements(t)

	host := createTournamentUser(t, "host", 10)
	players := []model.User{
		createTournamentUser(t, "p2", 20),
		createTournamentUser(t, "p3", 30),
		createTournamentUser(t, "p4", 40),
	}

	svc := NewTournamentService()
	tournament, err := svc.Create(host.ID.String(), CreateTournamentInput{
		Name:       "Daily Auto Cup",
		Difficulty: "medium",
		Mode:       "open_daily",
		MaxPlayers: 8,
	})
	require.NoError(t, err)

	for _, user := range players {
		_, err = svc.Join(tournament.ID, user.ID.String())
		require.NoError(t, err)
	}

	past := time.Now().Add(-time.Minute)
	require.NoError(t, database.DB.Model(&model.Tournament{}).Where("id = ?", tournament.ID).Updates(map[string]interface{}{
		"scheduled_start_at":   past,
		"registration_ends_at": past.Add(time.Hour),
	}).Error)

	started, err := svc.Get(tournament.ID)
	require.NoError(t, err)
	assert.Equal(t, "active", started.Status)
	assert.NotNil(t, started.StartedAt)
	require.Len(t, started.Matches, 2)
	for _, match := range started.Matches {
		assert.Equal(t, "active", match.Status)
		assert.NotEmpty(t, match.RoomID)
	}
}

func TestTournamentServiceBotOnlyMatchesAutoResolve(t *testing.T) {
	setupTournamentTestDB(t)
	seedTournamentAchievements(t)

	host := createTournamentUser(t, "host", 10)

	svc := NewTournamentService()
	tournament, err := svc.Create(host.ID.String(), CreateTournamentInput{Name: "Bot Resolve Cup", MaxPlayers: 4})
	require.NoError(t, err)

	started, err := svc.Start(tournament.ID, host.ID.String())
	require.NoError(t, err)

	var humanMatch TournamentMatchResponse
	var botOnlyResolved bool
	for _, match := range started.Matches {
		if match.Player1 == nil || match.Player2 == nil {
			continue
		}
		if match.Player1.IsBot && match.Player2.IsBot {
			botOnlyResolved = true
			assert.Equal(t, "finished", match.Status)
			assert.NotEmpty(t, match.WinnerPlayerID)
			continue
		}
		if match.Player1.UserID == host.ID.String() || match.Player2.UserID == host.ID.String() {
			humanMatch = match
		}
	}
	require.True(t, botOnlyResolved)
	require.NotEmpty(t, humanMatch.ID)

	var botWinner *TournamentPlayerResponse
	if humanMatch.Player1.IsBot {
		botWinner = humanMatch.Player1
	} else {
		botWinner = humanMatch.Player2
	}
	require.NotNil(t, botWinner)

	finished, err := svc.ReportMatch(tournament.ID, humanMatch.ID, host.ID.String(), ReportTournamentMatchInput{
		WinnerPlayerID: botWinner.ID,
		Player1Score:   80,
		Player2Score:   100,
	})
	require.NoError(t, err)
	assert.Equal(t, "finished", finished.Status)
}

func TestTournamentServiceCancelsEmptyDueOpenTournament(t *testing.T) {
	setupTournamentTestDB(t)
	seedTournamentAchievements(t)

	svc := &tournamentService{}
	require.NoError(t, svc.ensureScheduledOpenTournaments(time.Date(2026, time.May, 21, 10, 0, 0, 0, time.UTC)))

	var tournament model.Tournament
	require.NoError(t, database.DB.Where("mode = ?", "open_daily").First(&tournament).Error)
	past := time.Now().Add(-time.Minute)
	require.NoError(t, database.DB.Model(&model.Tournament{}).Where("id = ?", tournament.ID).Updates(map[string]interface{}{
		"scheduled_start_at":   past,
		"registration_ends_at": past,
	}).Error)

	got, err := svc.Get(tournament.ID.String())
	require.NoError(t, err)
	assert.Equal(t, "cancelled", got.Status)
	assert.NotNil(t, got.FinishedAt)
}

func TestTournamentServiceCreatesScheduledOpenTournamentsWithSystemHost(t *testing.T) {
	setupTournamentTestDB(t)
	seedTournamentAchievements(t)

	svc := &tournamentService{}
	now := time.Date(2026, time.May, 21, 10, 0, 0, 0, time.UTC)
	require.NoError(t, svc.ensureScheduledOpenTournaments(now))

	var systemHost model.User
	require.NoError(t, database.DB.Where("email = ?", systemTournamentEmail).First(&systemHost).Error)
	assert.Equal(t, systemTournamentUser, systemHost.Username)
	assert.Equal(t, "system", systemHost.Role)

	var tournaments []model.Tournament
	require.NoError(t, database.DB.Order("mode asc").Find(&tournaments).Error)
	require.Len(t, tournaments, 2)

	for _, tournament := range tournaments {
		assert.Equal(t, systemHost.ID, tournament.HostID)
		assert.Equal(t, "registration", tournament.Status)
		assert.Equal(t, 8, tournament.MaxPlayers)
		assert.Equal(t, "medium", tournament.Difficulty)
		assert.NotEmpty(t, tournament.InviteCode)

		var participants int64
		require.NoError(t, database.DB.Model(&model.TournamentPlayer{}).Where("tournament_id = ?", tournament.ID).Count(&participants).Error)
		assert.Equal(t, int64(0), participants)
	}

	require.NoError(t, svc.ensureScheduledOpenTournaments(now))
	var count int64
	require.NoError(t, database.DB.Model(&model.Tournament{}).Count(&count).Error)
	assert.Equal(t, int64(2), count)
}

func TestTournamentServiceReportMatchAdvancesAndRewards(t *testing.T) {
	setupTournamentTestDB(t)
	seedTournamentAchievements(t)

	host := createTournamentUser(t, "host", 0)
	p2 := createTournamentUser(t, "p2", 100)
	p3 := createTournamentUser(t, "p3", 200)
	p4 := createTournamentUser(t, "p4", 300)

	svc := NewTournamentService()
	tournament, err := svc.Create(host.ID.String(), CreateTournamentInput{Name: "Advance Test", MaxPlayers: 4})
	require.NoError(t, err)
	for _, user := range []model.User{p2, p3, p4} {
		_, err = svc.Join(tournament.ID, user.ID.String())
		require.NoError(t, err)
	}

	started, err := svc.Start(tournament.ID, host.ID.String())
	require.NoError(t, err)
	require.Len(t, started.Matches, 2)

	firstWinner := started.Matches[0].Player1
	secondWinner := started.Matches[1].Player1

	_, err = svc.ReportMatch(tournament.ID, started.Matches[0].ID, host.ID.String(), ReportTournamentMatchInput{
		WinnerPlayerID: firstWinner.ID,
		Player1Score:   120,
		Player2Score:   90,
	})
	require.NoError(t, err)

	afterSecondSemi, err := svc.ReportMatch(tournament.ID, started.Matches[1].ID, host.ID.String(), ReportTournamentMatchInput{
		WinnerPlayerID: secondWinner.ID,
		Player1Score:   110,
		Player2Score:   95,
	})
	require.NoError(t, err)

	var finalMatch TournamentMatchResponse
	for _, match := range afterSecondSemi.Matches {
		if match.Round == 2 {
			finalMatch = match
		}
	}
	require.NotEmpty(t, finalMatch.ID)
	require.NotNil(t, finalMatch.Player1)
	require.NotNil(t, finalMatch.Player2)
	assert.Equal(t, "active", finalMatch.Status)

	finished, err := svc.ReportMatch(tournament.ID, finalMatch.ID, host.ID.String(), ReportTournamentMatchInput{
		WinnerPlayerID: finalMatch.Player1.ID,
		Player1Score:   130,
		Player2Score:   125,
	})
	require.NoError(t, err)
	assert.Equal(t, "finished", finished.Status)
	assert.Equal(t, finalMatch.Player1.UserID, finished.ChampionID)

	expectedRewards := map[string]int{
		finalMatch.Player1.UserID: 500,
		finalMatch.Player2.UserID: 300,
	}
	for _, match := range started.Matches {
		for _, player := range []*TournamentPlayerResponse{match.Player1, match.Player2} {
			if _, ok := expectedRewards[player.UserID]; !ok {
				expectedRewards[player.UserID] = 150
			}
		}
	}

	for userID, reward := range expectedRewards {
		var user model.User
		require.NoError(t, database.DB.Where("id = ?", userID).First(&user).Error)
		switch userID {
		case host.ID.String():
			assert.Equal(t, host.XP+reward, user.XP)
		case p2.ID.String():
			assert.Equal(t, p2.XP+reward, user.XP)
		case p3.ID.String():
			assert.Equal(t, p3.XP+reward, user.XP)
		case p4.ID.String():
			assert.Equal(t, p4.XP+reward, user.XP)
		}
	}

	var unlocked int64
	require.NoError(t, database.DB.Model(&model.UserAchievement{}).Count(&unlocked).Error)
	assert.Equal(t, int64(2), unlocked)
}
