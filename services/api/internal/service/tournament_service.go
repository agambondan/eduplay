package service

import (
	"errors"
	"fmt"
	"log"
	"math"
	"sort"
	"strings"
	"time"

	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	tournamentMatchDuration = 5 * time.Minute
	systemTournamentEmail   = "system-tournament@eduplay.local"
	systemTournamentUser    = "system_tournament"
)

var (
	errTournamentAlreadyStarted = errors.New("tournament sudah dimulai")
	errMatchAlreadyFinished     = errors.New("match sudah selesai")
)

type TournamentPlayerResponse struct {
	ID          string `json:"id"`
	UserID      string `json:"user_id,omitempty"`
	DisplayName string `json:"display_name"`
	IsBot       bool   `json:"is_bot"`
	Seed        int    `json:"seed"`
	Status      string `json:"status"`
	FinalRank   int    `json:"final_rank"`
}

type TournamentMatchResponse struct {
	ID             string                    `json:"id"`
	Round          int                       `json:"round"`
	Position       int                       `json:"position"`
	Player1        *TournamentPlayerResponse `json:"player1"`
	Player2        *TournamentPlayerResponse `json:"player2"`
	WinnerPlayerID string                    `json:"winner_player_id,omitempty"`
	Player1Score   int                       `json:"player1_score"`
	Player2Score   int                       `json:"player2_score"`
	Status         string                    `json:"status"`
	RoomID         string                    `json:"room_id"`
	EndsAt         *time.Time                `json:"ends_at"`
}

type TournamentResponse struct {
	ID                 string                     `json:"id"`
	Name               string                     `json:"name"`
	GameSlug           string                     `json:"game_slug"`
	Difficulty         string                     `json:"difficulty"`
	Mode               string                     `json:"mode"`
	InviteCode         string                     `json:"invite_code"`
	MaxPlayers         int                        `json:"max_players"`
	Status             string                     `json:"status"`
	HostID             string                     `json:"host_id"`
	ChampionID         string                     `json:"champion_id,omitempty"`
	Players            []TournamentPlayerResponse `json:"players"`
	Matches            []TournamentMatchResponse  `json:"matches"`
	CreatedAt          time.Time                  `json:"created_at"`
	ScheduledStartAt   *time.Time                 `json:"scheduled_start_at"`
	RegistrationEndsAt *time.Time                 `json:"registration_ends_at"`
	CurrentRoundEndsAt *time.Time                 `json:"current_round_ends_at"`
	StartedAt          *time.Time                 `json:"started_at"`
	FinishedAt         *time.Time                 `json:"finished_at"`
}

type CreateTournamentInput struct {
	Name       string `json:"name"`
	Difficulty string `json:"difficulty"`
	Mode       string `json:"mode"`
	MaxPlayers int    `json:"max_players"`
}

type ReportTournamentMatchInput struct {
	WinnerPlayerID string `json:"winner_player_id"`
	Player1Score   int    `json:"player1_score"`
	Player2Score   int    `json:"player2_score"`
}

type TournamentService interface {
	List(userID string) ([]TournamentResponse, error)
	Create(hostID string, input CreateTournamentInput) (*TournamentResponse, error)
	Get(id string) (*TournamentResponse, error)
	Join(id, userID string) (*TournamentResponse, error)
	Start(id, userID string) (*TournamentResponse, error)
	ReportMatch(id, matchID, userID string, input ReportTournamentMatchInput) (*TournamentResponse, error)
}

type tournamentService struct{}

func NewTournamentService() TournamentService {
	return &tournamentService{}
}

func StartTournamentScheduler() {
	EnsureScheduledOpenTournaments()
	StartDueOpenTournaments()

	go func() {
		ticker := time.NewTicker(time.Minute)
		defer ticker.Stop()

		for range ticker.C {
			EnsureScheduledOpenTournaments()
			StartDueOpenTournaments()
		}
	}()
}

func EnsureScheduledOpenTournaments() {
	starter := &tournamentService{}
	if err := starter.ensureScheduledOpenTournaments(time.Now()); err != nil {
		log.Printf("[scheduler] failed to ensure open tournaments: %v", err)
	}
}

func StartDueOpenTournaments() {
	var tournaments []model.Tournament
	if err := database.DB.
		Where("mode <> ? AND status = ? AND scheduled_start_at IS NOT NULL AND scheduled_start_at <= ?", "quick", "registration", time.Now()).
		Find(&tournaments).Error; err != nil {
		log.Printf("[scheduler] failed to query due tournaments: %v", err)
		return
	}

	starter := &tournamentService{}
	for i := range tournaments {
		if err := starter.ensureOpenTournamentStarted(&tournaments[i]); err != nil {
			log.Printf("[scheduler] failed to start tournament %s: %v", tournaments[i].ID, err)
		}
	}
}

func (s *tournamentService) ensureScheduledOpenTournaments(now time.Time) error {
	host, err := s.systemTournamentHost()
	if err != nil {
		return err
	}

	for _, mode := range []string{"open_daily", "open_weekly"} {
		scheduledStartAt, registrationEndsAt := tournamentSchedule(mode, now)
		if scheduledStartAt == nil || registrationEndsAt == nil {
			continue
		}

		var count int64
		if err := database.DB.Model(&model.Tournament{}).
			Where("mode = ? AND scheduled_start_at = ? AND status IN ?", mode, *scheduledStartAt, []string{"registration", "active"}).
			Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			continue
		}

		tournament := model.Tournament{
			Name:               automaticTournamentName(mode, *scheduledStartAt),
			GameSlug:           "math-tournament",
			Difficulty:         "medium",
			Mode:               mode,
			MaxPlayers:         8,
			Status:             "registration",
			HostID:             host.ID,
			ScheduledStartAt:   scheduledStartAt,
			RegistrationEndsAt: registrationEndsAt,
		}

		if err := database.DB.Transaction(func(tx *gorm.DB) error {
			inviteCode, err := s.generateInviteCode(tx)
			if err != nil {
				return err
			}
			tournament.InviteCode = inviteCode
			return tx.Create(&tournament).Error
		}); err != nil {
			return err
		}
	}

	return nil
}

func (s *tournamentService) List(userID string) ([]TournamentResponse, error) {
	var tournaments []model.Tournament
	if err := database.DB.Order("created_at desc").Limit(30).Find(&tournaments).Error; err != nil {
		return nil, err
	}

	items := make([]TournamentResponse, 0, len(tournaments))
	for _, tournament := range tournaments {
		if err := s.ensureOpenTournamentStarted(&tournament); err != nil {
			return nil, err
		}
		detail, err := s.buildResponse(tournament)
		if err != nil {
			return nil, err
		}
		items = append(items, *detail)
	}
	return items, nil
}

func (s *tournamentService) Create(hostID string, input CreateTournamentInput) (*TournamentResponse, error) {
	hostUUID, err := uuid.Parse(hostID)
	if err != nil {
		return nil, errors.New("user tidak valid")
	}

	if input.Name == "" {
		input.Name = "Quick Math Tournament"
	}
	if input.Difficulty == "" {
		input.Difficulty = "medium"
	}
	if !validDifficulty(input.Difficulty) {
		return nil, errors.New("difficulty tidak valid")
	}
	if input.Mode == "" {
		input.Mode = "quick"
	}
	if !validTournamentMode(input.Mode) {
		return nil, errors.New("mode tournament tidak valid")
	}
	if input.MaxPlayers == 0 {
		input.MaxPlayers = 8
	}
	if input.MaxPlayers != 4 && input.MaxPlayers != 8 && input.MaxPlayers != 16 {
		return nil, errors.New("max_players harus 4, 8, atau 16")
	}
	scheduledStartAt, registrationEndsAt := tournamentSchedule(input.Mode, time.Now())

	var tournament model.Tournament
	err = database.DB.Transaction(func(tx *gorm.DB) error {
		inviteCode, err := s.generateInviteCode(tx)
		if err != nil {
			return err
		}
		tournament = model.Tournament{
			Name:               input.Name,
			GameSlug:           "math-tournament",
			Difficulty:         input.Difficulty,
			Mode:               input.Mode,
			InviteCode:         inviteCode,
			MaxPlayers:         input.MaxPlayers,
			Status:             "registration",
			HostID:             hostUUID,
			ScheduledStartAt:   scheduledStartAt,
			RegistrationEndsAt: registrationEndsAt,
		}
		if err := tx.Create(&tournament).Error; err != nil {
			return err
		}
		return tx.Create(&model.TournamentPlayer{
			TournamentID: tournament.ID,
			UserID:       &hostUUID,
			Status:       "active",
		}).Error
	})
	if err != nil {
		return nil, err
	}

	return s.buildResponse(tournament)
}

func (s *tournamentService) Get(id string) (*TournamentResponse, error) {
	tournament, err := s.getTournament(id)
	if err != nil {
		return nil, err
	}
	if err := s.ensureOpenTournamentStarted(tournament); err != nil {
		return nil, err
	}
	return s.buildResponse(*tournament)
}

func (s *tournamentService) Join(id, userID string) (*TournamentResponse, error) {
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return nil, errors.New("user tidak valid")
	}

	tournament, err := s.getTournament(id)
	if err != nil {
		return nil, err
	}
	if tournament.Status != "registration" {
		return nil, errors.New("registrasi tournament sudah ditutup")
	}
	if tournament.RegistrationEndsAt != nil && time.Now().After(*tournament.RegistrationEndsAt) {
		return nil, errors.New("registrasi tournament sudah berakhir")
	}

	var count int64
	if err := database.DB.Model(&model.TournamentPlayer{}).Where("tournament_id = ?", tournament.ID).Count(&count).Error; err != nil {
		return nil, err
	}
	if int(count) >= tournament.MaxPlayers {
		return nil, errors.New("tournament sudah penuh")
	}

	var existing int64
	if err := database.DB.Model(&model.TournamentPlayer{}).Where("tournament_id = ? AND user_id = ?", tournament.ID, userUUID).Count(&existing).Error; err != nil {
		return nil, err
	}
	if existing > 0 {
		return s.buildResponse(*tournament)
	}

	if err := database.DB.Create(&model.TournamentPlayer{TournamentID: tournament.ID, UserID: &userUUID, Status: "active"}).Error; err != nil {
		return nil, err
	}

	if err := s.ensureOpenTournamentStarted(tournament); err != nil {
		return nil, err
	}
	return s.buildResponse(*tournament)
}

func (s *tournamentService) Start(id, userID string) (*TournamentResponse, error) {
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return nil, errors.New("user tidak valid")
	}

	tournament, err := s.getTournament(id)
	if err != nil {
		return nil, err
	}
	if tournament.HostID != userUUID {
		return nil, errors.New("hanya host yang bisa mulai tournament")
	}
	if tournament.Status != "registration" {
		return nil, errors.New("tournament sudah dimulai")
	}
	if tournament.Mode != "quick" && tournament.ScheduledStartAt != nil && time.Now().Before(*tournament.ScheduledStartAt) {
		return nil, errors.New("open tournament belum mencapai jadwal mulai")
	}

	if err := s.startRegistrationTournament(tournament); err != nil {
		return nil, err
	}
	return s.buildResponse(*tournament)
}

func (s *tournamentService) startRegistrationTournament(tournament *model.Tournament) error {
	var players []model.TournamentPlayer
	if err := database.DB.Where("tournament_id = ?", tournament.ID).Find(&players).Error; err != nil {
		return err
	}
	if len(players) == 0 {
		return errors.New("belum ada peserta")
	}

	targetSize := nextBracketSize(len(players))
	if targetSize > tournament.MaxPlayers {
		targetSize = tournament.MaxPlayers
	}
	if targetSize < 4 {
		targetSize = 4
	}

	now := time.Now()
	firstRoundEndsAt := now.Add(tournamentMatchDuration)
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		startGuard := tx.Model(&model.Tournament{}).
			Where("id = ? AND status = ?", tournament.ID, "registration").
			Update("status", "starting")
		if startGuard.Error != nil {
			return startGuard.Error
		}
		if startGuard.RowsAffected == 0 {
			return errTournamentAlreadyStarted
		}

		for len(players) < targetSize {
			bot := model.TournamentPlayer{
				TournamentID: tournament.ID,
				BotName:      fmt.Sprintf("Bot %02d", len(players)+1),
				Status:       "active",
			}
			if err := tx.Create(&bot).Error; err != nil {
				return err
			}
			players = append(players, bot)
		}

		seeded, err := s.assignSeeds(tx, players)
		if err != nil {
			return err
		}

		for i := 0; i < len(seeded)/2; i++ {
			p1 := seeded[i]
			p2 := seeded[len(seeded)-1-i]
			position := i + 1
			roomID := fmt.Sprintf("tournament:%s:r1:m%d", tournament.ID.String(), position)
			match := model.TournamentMatch{
				TournamentID: tournament.ID,
				Round:        1,
				Position:     position,
				Player1ID:    &p1.ID,
				Player2ID:    &p2.ID,
				Status:       "active",
				RoomID:       roomID,
				StartedAt:    &now,
				EndsAt:       &firstRoundEndsAt,
			}
			if err := tx.Create(&match).Error; err != nil {
				return err
			}
		}

		tournament.Status = "active"
		tournament.StartedAt = &now
		tournament.CurrentRoundEndsAt = &firstRoundEndsAt
		if err := tx.Save(tournament).Error; err != nil {
			return err
		}
		return s.resolveBotOnlyMatches(tx, tournament)
	})
	return err
}

func (s *tournamentService) ReportMatch(id, matchID, userID string, input ReportTournamentMatchInput) (*TournamentResponse, error) {
	tournament, err := s.getTournament(id)
	if err != nil {
		return nil, err
	}
	if tournament.Status != "active" {
		return nil, errors.New("tournament tidak aktif")
	}

	matchUUID, err := uuid.Parse(matchID)
	if err != nil {
		return nil, errors.New("match tidak valid")
	}
	winnerUUID, err := uuid.Parse(input.WinnerPlayerID)
	if err != nil {
		return nil, errors.New("winner_player_id tidak valid")
	}

	var match model.TournamentMatch
	if err := database.DB.Where("id = ? AND tournament_id = ?", matchUUID, tournament.ID).First(&match).Error; err != nil {
		return nil, errors.New("match tidak ditemukan")
	}
	if match.Status == "finished" {
		return s.buildResponse(*tournament)
	}
	if match.Player1ID == nil || match.Player2ID == nil {
		return nil, errors.New("match belum lengkap")
	}
	if winnerUUID != *match.Player1ID && winnerUUID != *match.Player2ID {
		return nil, errors.New("winner bukan peserta match")
	}

	requesterUUID, err := uuid.Parse(userID)
	if err != nil {
		return nil, errors.New("user tidak valid")
	}
	if !s.canReportMatch(requesterUUID, *tournament, match) {
		return nil, errors.New("tidak punya akses report match")
	}

	now := time.Now()
	err = database.DB.Transaction(func(tx *gorm.DB) error {
		match.WinnerPlayerID = &winnerUUID
		match.Player1Score = input.Player1Score
		match.Player2Score = input.Player2Score
		match.Status = "finished"
		match.FinishedAt = &now
		finishGuard := tx.Model(&model.TournamentMatch{}).
			Where("id = ? AND status = ?", match.ID, "active").
			Updates(map[string]interface{}{
				"winner_player_id": match.WinnerPlayerID,
				"player1_score":    match.Player1Score,
				"player2_score":    match.Player2Score,
				"status":           match.Status,
				"finished_at":      match.FinishedAt,
			})
		if finishGuard.Error != nil {
			return finishGuard.Error
		}
		if finishGuard.RowsAffected == 0 {
			return errMatchAlreadyFinished
		}

		loserID := *match.Player1ID
		if winnerUUID == *match.Player1ID {
			loserID = *match.Player2ID
		}
		if err := tx.Model(&model.TournamentPlayer{}).Where("id = ?", loserID).Updates(map[string]interface{}{
			"status":     "eliminated",
			"final_rank": s.rankForRound(tx, *tournament, match.Round),
		}).Error; err != nil {
			return err
		}

		totalRounds := s.totalRounds(tx, tournament.ID)
		if match.Round >= totalRounds {
			return s.finishTournament(tx, tournament, winnerUUID, loserID, now)
		}

		if err := s.advanceWinner(tx, tournament, match, winnerUUID); err != nil {
			return err
		}
		return s.resolveBotOnlyMatches(tx, tournament)
	})
	if err != nil {
		if errors.Is(err, errMatchAlreadyFinished) {
			return s.buildResponse(*tournament)
		}
		return nil, err
	}

	return s.buildResponse(*tournament)
}

func (s *tournamentService) getTournament(id string) (*model.Tournament, error) {
	tournamentUUID, err := uuid.Parse(id)
	var tournament model.Tournament
	query := database.DB
	if err == nil {
		query = query.Where("id = ?", tournamentUUID)
	} else {
		query = query.Where("invite_code = ?", strings.ToUpper(strings.TrimSpace(id)))
	}
	if err := query.First(&tournament).Error; err != nil {
		return nil, errors.New("tournament tidak ditemukan")
	}
	return &tournament, nil
}

func (s *tournamentService) ensureOpenTournamentStarted(tournament *model.Tournament) error {
	if tournament.Mode == "quick" || tournament.Status != "registration" || tournament.ScheduledStartAt == nil {
		return nil
	}
	if time.Now().Before(*tournament.ScheduledStartAt) {
		return nil
	}

	var count int64
	if err := database.DB.Model(&model.TournamentPlayer{}).Where("tournament_id = ?", tournament.ID).Count(&count).Error; err != nil {
		return err
	}
	if count == 0 {
		now := time.Now()
		if err := database.DB.Model(&model.Tournament{}).Where("id = ?", tournament.ID).Updates(map[string]interface{}{
			"status":      "cancelled",
			"finished_at": &now,
		}).Error; err != nil {
			return err
		}
		tournament.Status = "cancelled"
		tournament.FinishedAt = &now
		return nil
	}
	if err := s.startRegistrationTournament(tournament); err != nil && !errors.Is(err, errTournamentAlreadyStarted) {
		return err
	}
	return database.DB.Where("id = ?", tournament.ID).First(tournament).Error
}

func (s *tournamentService) systemTournamentHost() (*model.User, error) {
	var user model.User
	err := database.DB.Where("email = ?", systemTournamentEmail).First(&user).Error
	if err == nil {
		return &user, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	user = model.User{
		Username: systemTournamentUser,
		Email:    systemTournamentEmail,
		Password: "system-user-no-login",
		Role:     "system",
		IsActive: true,
	}
	if err := database.DB.Create(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (s *tournamentService) buildResponse(tournament model.Tournament) (*TournamentResponse, error) {
	var players []model.TournamentPlayer
	if err := database.DB.Where("tournament_id = ?", tournament.ID).Order("seed asc, joined_at asc").Find(&players).Error; err != nil {
		return nil, err
	}
	playerResponses, playerMap := s.playerResponses(players)

	var matches []model.TournamentMatch
	if err := database.DB.Where("tournament_id = ?", tournament.ID).Order("round asc, position asc").Find(&matches).Error; err != nil {
		return nil, err
	}

	matchResponses := make([]TournamentMatchResponse, 0, len(matches))
	for _, match := range matches {
		var winnerID string
		if match.WinnerPlayerID != nil {
			winnerID = match.WinnerPlayerID.String()
		}
		matchResponses = append(matchResponses, TournamentMatchResponse{
			ID:             match.ID.String(),
			Round:          match.Round,
			Position:       match.Position,
			Player1:        playerMap[idString(match.Player1ID)],
			Player2:        playerMap[idString(match.Player2ID)],
			WinnerPlayerID: winnerID,
			Player1Score:   match.Player1Score,
			Player2Score:   match.Player2Score,
			Status:         match.Status,
			RoomID:         match.RoomID,
			EndsAt:         match.EndsAt,
		})
	}

	var championID string
	if tournament.ChampionID != nil {
		championID = tournament.ChampionID.String()
	}
	return &TournamentResponse{
		ID:                 tournament.ID.String(),
		Name:               tournament.Name,
		GameSlug:           tournament.GameSlug,
		Difficulty:         tournament.Difficulty,
		Mode:               tournament.Mode,
		InviteCode:         tournament.InviteCode,
		MaxPlayers:         tournament.MaxPlayers,
		Status:             tournament.Status,
		HostID:             tournament.HostID.String(),
		ChampionID:         championID,
		Players:            playerResponses,
		Matches:            matchResponses,
		CreatedAt:          tournament.CreatedAt,
		ScheduledStartAt:   tournament.ScheduledStartAt,
		RegistrationEndsAt: tournament.RegistrationEndsAt,
		CurrentRoundEndsAt: tournament.CurrentRoundEndsAt,
		StartedAt:          tournament.StartedAt,
		FinishedAt:         tournament.FinishedAt,
	}, nil
}

func (s *tournamentService) playerResponses(players []model.TournamentPlayer) ([]TournamentPlayerResponse, map[string]*TournamentPlayerResponse) {
	responses := make([]TournamentPlayerResponse, 0, len(players))
	responseMap := make(map[string]*TournamentPlayerResponse, len(players))

	userIDs := make([]uuid.UUID, 0, len(players))
	for _, player := range players {
		if player.UserID != nil {
			userIDs = append(userIDs, *player.UserID)
		}
	}

	users := map[uuid.UUID]model.User{}
	if len(userIDs) > 0 {
		var userRows []model.User
		database.DB.Where("id IN ?", userIDs).Find(&userRows)
		for _, user := range userRows {
			users[user.ID] = user
		}
	}

	for _, player := range players {
		displayName := player.BotName
		userID := ""
		if player.UserID != nil {
			userID = player.UserID.String()
			displayName = "Player"
			if user, ok := users[*player.UserID]; ok {
				displayName = user.Username
			}
		}
		item := TournamentPlayerResponse{
			ID:          player.ID.String(),
			UserID:      userID,
			DisplayName: displayName,
			IsBot:       player.UserID == nil,
			Seed:        player.Seed,
			Status:      player.Status,
			FinalRank:   player.FinalRank,
		}
		responses = append(responses, item)
		copyItem := item
		responseMap[player.ID.String()] = &copyItem
	}

	return responses, responseMap
}

func (s *tournamentService) assignSeeds(tx *gorm.DB, players []model.TournamentPlayer) ([]model.TournamentPlayer, error) {
	type seededPlayer struct {
		model.TournamentPlayer
		xp int
	}
	seeded := make([]seededPlayer, 0, len(players))
	for _, player := range players {
		xp := -1
		if player.UserID != nil {
			var user model.User
			if err := tx.Select("id", "xp").Where("id = ?", *player.UserID).First(&user).Error; err == nil {
				xp = user.XP
			}
		}
		seeded = append(seeded, seededPlayer{TournamentPlayer: player, xp: xp})
	}
	sort.Slice(seeded, func(i, j int) bool {
		if seeded[i].xp == seeded[j].xp {
			return seeded[i].JoinedAt.Before(seeded[j].JoinedAt)
		}
		return seeded[i].xp > seeded[j].xp
	})

	ordered := make([]model.TournamentPlayer, 0, len(seeded))
	for i, player := range seeded {
		player.TournamentPlayer.Seed = i + 1
		if err := tx.Model(&model.TournamentPlayer{}).Where("id = ?", player.ID).Update("seed", player.Seed).Error; err != nil {
			return nil, err
		}
		ordered = append(ordered, player.TournamentPlayer)
	}
	return ordered, nil
}

func (s *tournamentService) canReportMatch(userID uuid.UUID, tournament model.Tournament, match model.TournamentMatch) bool {
	if tournament.HostID == userID {
		return true
	}
	var count int64
	database.DB.Model(&model.TournamentPlayer{}).
		Where("id IN ? AND user_id = ?", []uuid.UUID{*match.Player1ID, *match.Player2ID}, userID).
		Count(&count)
	return count > 0
}

func (s *tournamentService) advanceWinner(tx *gorm.DB, tournament *model.Tournament, match model.TournamentMatch, winnerID uuid.UUID) error {
	nextRound := match.Round + 1
	nextPosition := (match.Position + 1) / 2

	var nextMatch model.TournamentMatch
	err := tx.Where("tournament_id = ? AND round = ? AND position = ?", tournament.ID, nextRound, nextPosition).First(&nextMatch).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		roomID := fmt.Sprintf("tournament:%s:r%d:m%d", tournament.ID.String(), nextRound, nextPosition)
		nextMatch = model.TournamentMatch{
			TournamentID: tournament.ID,
			Round:        nextRound,
			Position:     nextPosition,
			Status:       "pending",
			RoomID:       roomID,
		}
		if err := tx.Create(&nextMatch).Error; err != nil {
			return err
		}
	} else if err != nil {
		return err
	}

	updates := map[string]interface{}{}
	if match.Position%2 == 1 {
		updates["player1_id"] = winnerID
	} else {
		updates["player2_id"] = winnerID
	}

	var filled model.TournamentMatch
	if err := tx.Where("id = ?", nextMatch.ID).First(&filled).Error; err != nil {
		return err
	}
	if (updates["player1_id"] != nil && filled.Player2ID != nil) || (updates["player2_id"] != nil && filled.Player1ID != nil) {
		updates["status"] = "active"
		now := time.Now()
		endsAt := now.Add(tournamentMatchDuration)
		updates["started_at"] = &now
		updates["ends_at"] = &endsAt
		tournament.CurrentRoundEndsAt = &endsAt
		if err := tx.Model(&model.Tournament{}).Where("id = ?", tournament.ID).Update("current_round_ends_at", &endsAt).Error; err != nil {
			return err
		}
	}
	return tx.Model(&model.TournamentMatch{}).Where("id = ?", nextMatch.ID).Updates(updates).Error
}

func (s *tournamentService) resolveBotOnlyMatches(tx *gorm.DB, tournament *model.Tournament) error {
	for {
		var matches []model.TournamentMatch
		if err := tx.Where("tournament_id = ? AND status = ?", tournament.ID, "active").
			Order("round asc, position asc").
			Find(&matches).Error; err != nil {
			return err
		}

		resolvedAny := false
		for _, match := range matches {
			if match.Player1ID == nil || match.Player2ID == nil || match.WinnerPlayerID != nil {
				continue
			}

			var players []model.TournamentPlayer
			if err := tx.Where("id IN ?", []uuid.UUID{*match.Player1ID, *match.Player2ID}).Find(&players).Error; err != nil {
				return err
			}
			if len(players) != 2 {
				continue
			}

			bots := make([]model.TournamentPlayer, 0, 2)
			for _, player := range players {
				if player.UserID == nil {
					bots = append(bots, player)
				}
			}
			if len(bots) != 2 {
				continue
			}

			winner := bots[0]
			loser := bots[1]
			if loser.Seed > 0 && (winner.Seed == 0 || loser.Seed < winner.Seed) {
				winner, loser = loser, winner
			}

			now := time.Now()
			match.WinnerPlayerID = &winner.ID
			match.Status = "finished"
			match.FinishedAt = &now
			if match.Player1ID != nil && *match.Player1ID == winner.ID {
				match.Player1Score = 100
				match.Player2Score = 80
			} else {
				match.Player1Score = 80
				match.Player2Score = 100
			}
			if err := tx.Save(&match).Error; err != nil {
				return err
			}
			if err := tx.Model(&model.TournamentPlayer{}).Where("id = ?", loser.ID).Updates(map[string]interface{}{
				"status":     "eliminated",
				"final_rank": s.rankForRound(tx, *tournament, match.Round),
			}).Error; err != nil {
				return err
			}

			totalRounds := s.totalRounds(tx, tournament.ID)
			if match.Round >= totalRounds {
				if err := s.finishTournament(tx, tournament, winner.ID, loser.ID, now); err != nil {
					return err
				}
			} else if err := s.advanceWinner(tx, tournament, match, winner.ID); err != nil {
				return err
			}
			resolvedAny = true
		}

		if !resolvedAny || tournament.Status == "finished" {
			return nil
		}
	}
}

func (s *tournamentService) finishTournament(tx *gorm.DB, tournament *model.Tournament, winnerPlayerID uuid.UUID, runnerUpPlayerID uuid.UUID, finishedAt time.Time) error {
	var winner model.TournamentPlayer
	if err := tx.Where("id = ?", winnerPlayerID).First(&winner).Error; err != nil {
		return err
	}

	tournament.Status = "finished"
	tournament.FinishedAt = &finishedAt
	tournament.CurrentRoundEndsAt = nil
	if winner.UserID != nil {
		tournament.ChampionID = winner.UserID
	}
	if err := tx.Save(tournament).Error; err != nil {
		return err
	}

	if err := tx.Model(&model.TournamentPlayer{}).Where("id = ?", winnerPlayerID).Updates(map[string]interface{}{
		"status":     "champion",
		"final_rank": 1,
	}).Error; err != nil {
		return err
	}
	if err := tx.Model(&model.TournamentPlayer{}).Where("id = ?", runnerUpPlayerID).Updates(map[string]interface{}{
		"status":     "runner_up",
		"final_rank": 2,
	}).Error; err != nil {
		return err
	}
	if winner.UserID != nil {
		if err := s.unlockAchievementBySlug(tx, *winner.UserID, "tournament-champion"); err != nil {
			return err
		}
	}
	var runnerUp model.TournamentPlayer
	if err := tx.Where("id = ?", runnerUpPlayerID).First(&runnerUp).Error; err == nil && runnerUp.UserID != nil {
		if err := s.unlockAchievementBySlug(tx, *runnerUp.UserID, "tournament-finalist"); err != nil {
			return err
		}
	}

	var participants []model.TournamentPlayer
	if err := tx.Where("tournament_id = ? AND user_id IS NOT NULL", tournament.ID).Find(&participants).Error; err != nil {
		return err
	}
	for _, participant := range participants {
		xp := 50
		if participant.ID == winnerPlayerID {
			xp = 500
		} else if participant.ID == runnerUpPlayerID {
			xp = 300
		} else if participant.FinalRank == 3 {
			xp = 150
		}
		var user model.User
		if err := tx.Where("id = ?", *participant.UserID).First(&user).Error; err != nil {
			return err
		}
		user.XP += xp
		user.Level = model.LevelFromXP(user.XP)
		if err := tx.Save(&user).Error; err != nil {
			return err
		}
	}

	return nil
}

func (s *tournamentService) unlockAchievementBySlug(tx *gorm.DB, userID uuid.UUID, slug string) error {
	var achievement model.Achievement
	if err := tx.Where("slug = ?", slug).First(&achievement).Error; err != nil {
		return nil
	}
	return tx.Where("user_id = ? AND achievement_id = ?", userID, achievement.ID).
		Attrs(model.UserAchievement{UnlockedAt: time.Now()}).
		FirstOrCreate(&model.UserAchievement{
			UserID:        userID,
			AchievementID: achievement.ID,
		}).Error
}

func (s *tournamentService) generateInviteCode(tx *gorm.DB) (string, error) {
	for i := 0; i < 8; i++ {
		code := strings.ToUpper(strings.ReplaceAll(uuid.NewString(), "-", ""))[:8]
		var count int64
		if err := tx.Model(&model.Tournament{}).Where("invite_code = ?", code).Count(&count).Error; err != nil {
			return "", err
		}
		if count == 0 {
			return code, nil
		}
	}
	return "", errors.New("gagal membuat invite code unik")
}

func (s *tournamentService) totalRounds(tx *gorm.DB, tournamentID uuid.UUID) int {
	var firstRoundCount int64
	tx.Model(&model.TournamentMatch{}).Where("tournament_id = ? AND round = 1", tournamentID).Count(&firstRoundCount)
	if firstRoundCount <= 1 {
		return 1
	}
	return int(math.Log2(float64(firstRoundCount * 2)))
}

func (s *tournamentService) rankForRound(tx *gorm.DB, tournament model.Tournament, round int) int {
	bracketSize := s.bracketSize(tx, tournament.ID)
	if round <= 1 {
		return bracketSize/2 + 1
	}
	return int(math.Pow(2, float64(s.totalRounds(tx, tournament.ID)-round))) + 1
}

func (s *tournamentService) bracketSize(tx *gorm.DB, tournamentID uuid.UUID) int {
	var firstRoundCount int64
	tx.Model(&model.TournamentMatch{}).Where("tournament_id = ? AND round = 1", tournamentID).Count(&firstRoundCount)
	if firstRoundCount <= 0 {
		return 0
	}
	return int(firstRoundCount * 2)
}

func nextBracketSize(count int) int {
	if count <= 4 {
		return 4
	}
	if count <= 8 {
		return 8
	}
	return 16
}

func validDifficulty(value string) bool {
	return value == "easy" || value == "medium" || value == "hard"
}

func validTournamentMode(value string) bool {
	return value == "quick" || value == "open_daily" || value == "open_weekly"
}

func tournamentSchedule(mode string, now time.Time) (*time.Time, *time.Time) {
	if mode == "quick" {
		return nil, nil
	}

	scheduled := time.Date(now.Year(), now.Month(), now.Day(), 15, 0, 0, 0, now.Location())
	if mode == "open_daily" {
		if !scheduled.After(now.Add(30 * time.Minute)) {
			scheduled = scheduled.AddDate(0, 0, 1)
		}
		registrationStart := scheduled.Add(-30 * time.Minute)
		if now.Before(registrationStart) {
			return &scheduled, &scheduled
		}
		return &scheduled, &scheduled
	}

	for scheduled.Weekday() != time.Saturday || !scheduled.After(now.Add(30*time.Minute)) {
		scheduled = scheduled.AddDate(0, 0, 1)
	}
	return &scheduled, &scheduled
}

func automaticTournamentName(mode string, scheduled time.Time) string {
	label := "Daily"
	if mode == "open_weekly" {
		label = "Weekly"
	}
	return fmt.Sprintf("%s Math Tournament - %s", label, scheduled.Format("02 Jan 15:04"))
}

func idString(id *uuid.UUID) string {
	if id == nil {
		return ""
	}
	return id.String()
}
