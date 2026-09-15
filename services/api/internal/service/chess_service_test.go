package service

import (
	"testing"

	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupChessTestDB(t *testing.T) {
	t.Helper()

	db, err := gorm.Open(sqlite.Open("file:chess?mode=memory&cache=shared"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.Migrator().DropTable(
		&model.MatchParticipant{},
		&model.MultiplayerMatch{},
		&model.ChessMatch{},
		&model.Game{},
		&model.User{},
	))
	require.NoError(t, db.AutoMigrate(
		&model.User{},
		&model.Game{},
		&model.ChessMatch{},
		&model.MultiplayerMatch{},
		&model.MatchParticipant{},
	))
	database.DB = db
}

func createChessTestUser(t *testing.T, username string) model.User {
	t.Helper()
	user := model.User{
		ID:       uuid.New(),
		Username: username,
		Email:    username + "@example.com",
		Password: "hash",
	}
	require.NoError(t, database.DB.Create(&user).Error)
	return user
}

// TestChessMoveRejectsIllegalMove is a regression test: Move() used to
// accept literally any string as a "move" with zero validation, and never
// updated the stored FEN, so an illegal move (or garbage input) would be
// silently recorded as if it happened.
func TestChessMoveRejectsIllegalMove(t *testing.T) {
	setupChessTestDB(t)
	user := createChessTestUser(t, "player1")

	svc := NewChessService()
	match, err := svc.Create(user.ID.String(), CreateChessInput{VsBot: true, BotDifficulty: "easy"})
	require.NoError(t, err)
	require.Equal(t, startFEN, match.FEN)

	_, err = svc.Move(match.ID, user.ID.String(), "not-a-move")
	require.Error(t, err)

	// The FEN must still reflect the untouched starting position.
	got, err := svc.Get(match.ID, user.ID.String())
	require.NoError(t, err)
	require.Equal(t, startFEN, got.FEN)
	require.Empty(t, got.Moves)
}

// TestChessMoveUpdatesFEN is a regression test: previously match.FEN was
// only ever set once at Create() and never touched again in Move(), so the
// stored board state was permanently frozen at the starting position.
func TestChessMoveUpdatesFEN(t *testing.T) {
	setupChessTestDB(t)
	user := createChessTestUser(t, "player1")

	svc := NewChessService()
	match, err := svc.Create(user.ID.String(), CreateChessInput{VsBot: true, BotDifficulty: "easy"})
	require.NoError(t, err)

	updated, err := svc.Move(match.ID, user.ID.String(), "e4")
	require.NoError(t, err)
	require.NotEqual(t, startFEN, updated.FEN)
	require.Contains(t, updated.FEN, "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR")
	require.Equal(t, "black", updated.CurrentTurn)
	require.Equal(t, []string{"e4"}, updated.Moves)
}

// TestChessBotGameAllowsMovingBothSidesAsOwner covers the frontend's actual
// flow for vs-bot matches: the human's browser computes the bot's reply
// locally and submits it through this same endpoint under the human's own
// account (there is no separate bot user). The old strict
// "PlayerColor != CurrentTurn" gate rejected that second submission as "not
// your turn", so the bot's moves could never actually be persisted.
func TestChessBotGameAllowsMovingBothSidesAsOwner(t *testing.T) {
	setupChessTestDB(t)
	user := createChessTestUser(t, "player1")

	svc := NewChessService()
	match, err := svc.Create(user.ID.String(), CreateChessInput{VsBot: true, BotDifficulty: "easy", PlayerColor: "white"})
	require.NoError(t, err)

	_, err = svc.Move(match.ID, user.ID.String(), "e4")
	require.NoError(t, err, "human's own-color move should succeed")

	_, err = svc.Move(match.ID, user.ID.String(), "e5")
	require.NoError(t, err, "submitting the bot's (opposite-color) move under the same account must also succeed")
}

// TestChessMoveEnforcesTurnInPvP verifies that, unlike vs-bot matches, a PvP
// match still rejects a player trying to move out of turn — two real,
// independent, untrusted players cannot move for each other.
func TestChessMoveEnforcesTurnInPvP(t *testing.T) {
	setupChessTestDB(t)
	white := createChessTestUser(t, "white_player")
	black := createChessTestUser(t, "black_player")

	svc := NewChessService()
	match, err := svc.Create(white.ID.String(), CreateChessInput{OpponentUsername: black.Username})
	require.NoError(t, err)

	_, err = svc.Move(match.ID, black.ID.String(), "e5")
	require.Error(t, err, "black must not be able to move before white's first move")

	_, err = svc.Move(match.ID, white.ID.String(), "e4")
	require.NoError(t, err)

	_, err = svc.Move(match.ID, white.ID.String(), "d4")
	require.Error(t, err, "white must not be able to move twice in a row")
}

// TestChessMoveDetectsCheckmate plays out Fool's Mate (the fastest possible
// checkmate) and verifies the match is finished with the correct winner.
// Previously the game could only ever end via explicit Resign() — there was
// no checkmate/stalemate detection at all.
func TestChessMoveDetectsCheckmate(t *testing.T) {
	setupChessTestDB(t)
	white := createChessTestUser(t, "white_player2")
	black := createChessTestUser(t, "black_player2")

	svc := NewChessService()
	match, err := svc.Create(white.ID.String(), CreateChessInput{OpponentUsername: black.Username})
	require.NoError(t, err)

	moves := []struct {
		userID uuid.UUID
		move   string
	}{
		{white.ID, "f3"},
		{black.ID, "e5"},
		{white.ID, "g4"},
	}
	for _, m := range moves {
		_, err := svc.Move(match.ID, m.userID.String(), m.move)
		require.NoError(t, err)
	}

	final, err := svc.Move(match.ID, black.ID.String(), "Qh4#")
	require.NoError(t, err)

	require.Equal(t, "finished", final.Status)
	require.Equal(t, "checkmate", final.WinReason)
	require.Equal(t, black.ID.String(), final.WinnerID)
}
