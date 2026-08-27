package service

import (
	"encoding/json"
	"errors"
	"time"

	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/google/uuid"
)

type ChessService interface {
	List(userID string) ([]ChessMatchResponse, error)
	Create(userID string, input CreateChessInput) (*ChessMatchResponse, error)
	Get(id, userID string) (*ChessMatchResponse, error)
	Move(id, userID string, move string) (*ChessMatchResponse, error)
	Resign(id, userID string) (*ChessMatchResponse, error)
}

type chessService struct{}

func NewChessService() ChessService {
	return &chessService{}
}

type CreateChessInput struct {
	OpponentUsername string `json:"opponent_username"`
	VsBot            bool   `json:"vs_bot"`
	BotDifficulty    string `json:"bot_difficulty"`
	PlayerColor      string `json:"player_color"`
}

type ChessMatchResponse struct {
	ID            string          `json:"id"`
	Player1ID     string          `json:"player1_id"`
	Player2ID     string          `json:"player2_id,omitempty"`
	IsVsBot       bool            `json:"is_vs_bot"`
	BotDifficulty string          `json:"bot_difficulty,omitempty"`
	BotName       string          `json:"bot_name,omitempty"`
	Status        string          `json:"status"`
	PlayerColor   string          `json:"player_color"`
	CurrentTurn   string          `json:"current_turn"`
	FEN           string          `json:"fen"`
	Moves         []string        `json:"moves"`
	Player1Score  int             `json:"player1_score"`
	Player2Score  int             `json:"player2_score"`
	WinnerID      string          `json:"winner_id,omitempty"`
	WinReason     string          `json:"win_reason,omitempty"`
	TurnExpiresAt *time.Time      `json:"turn_expires_at,omitempty"`
	FinishedAt    *time.Time      `json:"finished_at,omitempty"`
	CreatedAt     time.Time       `json:"created_at"`
}

const startFEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

func (s *chessService) List(userID string) ([]ChessMatchResponse, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, errors.New("invalid user id")
	}

	var matches []model.ChessMatch
	database.DB.Where("player1_id = ? OR player2_id = ?", uid, uid).
		Order("created_at desc").
		Limit(20).
		Find(&matches)

	result := make([]ChessMatchResponse, len(matches))
	for i, m := range matches {
		result[i] = toChessResponse(m)
	}
	return result, nil
}

func (s *chessService) Create(userID string, input CreateChessInput) (*ChessMatchResponse, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, errors.New("invalid user id")
	}

	if input.VsBot {
		difficulty := input.BotDifficulty
		if difficulty == "" {
			difficulty = "medium"
		}
		playerColor := input.PlayerColor
		if playerColor == "" {
			playerColor = "white"
		}
		botName := getChessBotName(difficulty)

		match := model.ChessMatch{
			Player1ID:     uid,
			IsVsBot:       true,
			BotDifficulty: difficulty,
			BotName:       botName,
			Status:        "active",
			PlayerColor:   playerColor,
			CurrentTurn:   "white",
			FEN:           startFEN,
			MovesJSON:     "[]",
		}
		if err := database.DB.Create(&match).Error; err != nil {
			return nil, err
		}
		resp := toChessResponse(match)
		return &resp, nil
	}

	if input.OpponentUsername == "" {
		return nil, errors.New("opponent_username or vs_bot required")
	}

	var opponent model.User
	if err := database.DB.Where("username = ?", input.OpponentUsername).First(&opponent).Error; err != nil {
		return nil, errors.New("opponent not found")
	}
	if opponent.ID == uid {
		return nil, errors.New("cannot play against yourself")
	}

	match := model.ChessMatch{
		Player1ID:   uid,
		Player2ID:   &opponent.ID,
		Status:      "active",
		PlayerColor: "white",
		CurrentTurn: "white",
		FEN:         startFEN,
		MovesJSON:   "[]",
	}
	if err := database.DB.Create(&match).Error; err != nil {
		return nil, err
	}
	resp := toChessResponse(match)
	return &resp, nil
}

func (s *chessService) Get(id, userID string) (*ChessMatchResponse, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, errors.New("invalid user id")
	}

	var match model.ChessMatch
	if err := database.DB.First(&match, "id = ?", id).Error; err != nil {
		return nil, errors.New("match not found")
	}

	if match.Player1ID != uid && (match.Player2ID == nil || *match.Player2ID != uid) {
		return nil, errors.New("not your match")
	}

	resp := toChessResponse(match)
	return &resp, nil
}

func (s *chessService) Move(id, userID, move string) (*ChessMatchResponse, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, errors.New("invalid user id")
	}

	var match model.ChessMatch
	if err := database.DB.First(&match, "id = ?", id).Error; err != nil {
		return nil, errors.New("match not found")
	}

	if match.Status != "active" {
		return nil, errors.New("game is already finished")
	}

	isPlayer1 := match.Player1ID == uid
	isPlayer2 := match.Player2ID != nil && *match.Player2ID == uid
	if !isPlayer1 && !isPlayer2 {
		return nil, errors.New("not your match")
	}

	if match.IsVsBot {
		if isPlayer1 && match.PlayerColor != match.CurrentTurn {
			return nil, errors.New("not your turn")
		}
	} else {
		if isPlayer1 && match.CurrentTurn != "white" {
			return nil, errors.New("not your turn")
		}
		if isPlayer2 && match.CurrentTurn != "black" {
			return nil, errors.New("not your turn")
		}
	}

	var moves []string
	json.Unmarshal([]byte(match.MovesJSON), &moves)
	moves = append(moves, move)
	movesJSON, _ := json.Marshal(moves)

	nextTurn := "black"
	if match.CurrentTurn == "black" {
		nextTurn = "white"
	}

	updates := map[string]interface{}{
		"current_turn": nextTurn,
		"moves_json":   string(movesJSON),
	}
	database.DB.Model(&match).Updates(updates)

	match.CurrentTurn = nextTurn
	match.MovesJSON = string(movesJSON)
	resp := toChessResponse(match)
	return &resp, nil
}

func (s *chessService) Resign(id, userID string) (*ChessMatchResponse, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, errors.New("invalid user id")
	}

	var match model.ChessMatch
	if err := database.DB.First(&match, "id = ?", id).Error; err != nil {
		return nil, errors.New("match not found")
	}

	if match.Status != "active" {
		return nil, errors.New("game already finished")
	}

	isPlayer1 := match.Player1ID == uid
	isPlayer2 := match.Player2ID != nil && *match.Player2ID == uid
	if !isPlayer1 && !isPlayer2 {
		return nil, errors.New("not your match")
	}

	winnerID := match.Player1ID
	if isPlayer1 {
		if match.Player2ID != nil {
			winnerID = *match.Player2ID
		}
	}

	now := time.Now()
	database.DB.Model(&match).Updates(map[string]interface{}{
		"status":      "finished",
		"winner_id":   winnerID,
		"win_reason":  "resign",
		"finished_at": now,
	})

	match.Status = "finished"
	match.WinnerID = &winnerID
	match.WinReason = "resign"
	match.FinishedAt = &now

	s.recordChessResult(match)

	resp := toChessResponse(match)
	return &resp, nil
}

func (s *chessService) recordChessResult(match model.ChessMatch) {
	gameID := s.getGameID("chess")
	if gameID == uuid.Nil {
		return
	}

	mpMatch := model.MultiplayerMatch{
		GameID:     gameID,
		MatchType:  "bot",
		Status:     "finished",
		WinnerID:   match.WinnerID,
		FinishedAt: match.FinishedAt,
		CreatedAt:  time.Now(),
	}
	if !match.IsVsBot {
		mpMatch.MatchType = "quickmatch"
	}
	database.DB.Create(&mpMatch)

	var participants []model.MatchParticipant
	addParticipant := func(userID uuid.UUID, isWinner bool, score int) {
		p := model.MatchParticipant{
			MatchID:  mpMatch.ID,
			UserID:   &userID,
			Score:    score,
			IsWinner: isWinner,
			JoinedAt: match.CreatedAt,
		}
		if isWinner {
			p.XPEarned = 100
		} else {
			p.XPEarned = 25
		}
		participants = append(participants, p)
	}

	addParticipant(match.Player1ID, match.WinnerID != nil && *match.WinnerID == match.Player1ID, match.Player1Score)
	if match.Player2ID != nil {
		addParticipant(*match.Player2ID, match.WinnerID != nil && *match.WinnerID == *match.Player2ID, match.Player2Score)
	}
	if len(participants) > 0 {
		database.DB.Create(&participants)
	}
}

func (s *chessService) getGameID(slug string) uuid.UUID {
	var game model.Game
	if err := database.DB.Where("slug = ?", slug).First(&game).Error; err == nil {
		return game.ID
	}
	return uuid.Nil
}

func getChessBotName(difficulty string) string {
	switch difficulty {
	case "easy":
		return "Pion Bot"
	case "medium":
		return "Benteng Bot"
	case "hard":
		return "Ratu Bot"
	default:
		return "Chess Bot"
	}
}

func toChessResponse(m model.ChessMatch) ChessMatchResponse {
	var moves []string
	json.Unmarshal([]byte(m.MovesJSON), &moves)
	if moves == nil {
		moves = []string{}
	}

	resp := ChessMatchResponse{
		ID:            m.ID.String(),
		Player1ID:     m.Player1ID.String(),
		IsVsBot:       m.IsVsBot,
		BotDifficulty: m.BotDifficulty,
		BotName:       m.BotName,
		Status:        m.Status,
		PlayerColor:   m.PlayerColor,
		CurrentTurn:   m.CurrentTurn,
		FEN:           m.FEN,
		Moves:         moves,
		Player1Score:  m.Player1Score,
		Player2Score:  m.Player2Score,
		WinReason:     m.WinReason,
		TurnExpiresAt: m.TurnExpiresAt,
		FinishedAt:    m.FinishedAt,
		CreatedAt:     m.CreatedAt,
	}
	if m.Player2ID != nil {
		resp.Player2ID = m.Player2ID.String()
	}
	if m.WinnerID != nil {
		resp.WinnerID = m.WinnerID.String()
	}

	fen := m.FEN
	if fen == "" {
		fen = startFEN
	}
	resp.FEN = fen

	return resp
}

var _ ChessService = (*chessService)(nil)
