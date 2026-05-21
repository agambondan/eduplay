package service

import (
	"encoding/json"
	"errors"
	"fmt"
	"math/rand"
	"time"

	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

const battleshipBoardSize = 8

var battleshipShips = []int{4, 3, 3, 2, 2, 1}

type BattleshipService interface {
	List(userID string) ([]BattleshipMatchResponse, error)
	Create(userID string, input CreateBattleshipInput) (*BattleshipMatchResponse, error)
	Get(id, userID string) (*BattleshipMatchResponse, error)
	Target(id, userID string, row, col int) (*BattleshipMatchResponse, error)
	Shot(id, userID string, answer int) (*BattleshipMatchResponse, error)
	Reveal(id, userID string) (*BattleshipMatchResponse, error)
	Resign(id, userID string) (*BattleshipMatchResponse, error)
}

type battleshipService struct {
	pushSvc *PushService
}

func NewBattleshipService(pushSvc ...*PushService) BattleshipService {
	svc := &battleshipService{}
	if len(pushSvc) > 0 {
		svc.pushSvc = pushSvc[0]
	}
	return svc
}

type CreateBattleshipInput struct {
	OpponentUsername string `json:"opponent_username"`
	VsBot            bool   `json:"vs_bot"`
	BotDifficulty    string `json:"bot_difficulty" validate:"omitempty,oneof=easy medium hard"`
	Difficulty       string `json:"difficulty" validate:"required,oneof=easy medium hard"`
}

type BattleshipCellResponse struct {
	Ship     bool `json:"ship"`
	Hit      bool `json:"hit"`
	Miss     bool `json:"miss"`
	Revealed bool `json:"revealed,omitempty"`
}

type BattleshipQuestionResponse struct {
	ID     string               `json:"id"`
	Text   string               `json:"text"`
	Target BattleshipCoordinate `json:"target"`
}

type BattleshipCoordinate struct {
	Row int `json:"row"`
	Col int `json:"col"`
}

type BattleshipMatchResponse struct {
	ID               string                      `json:"id"`
	Difficulty       string                      `json:"difficulty"`
	Status           string                      `json:"status"`
	IsVsBot          bool                        `json:"is_vs_bot"`
	OpponentName     string                      `json:"opponent_name"`
	MySide           string                      `json:"my_side"`
	CurrentTurn      string                      `json:"current_turn"`
	MyTurn           bool                        `json:"my_turn"`
	MyScore          int                         `json:"my_score"`
	OpponentScore    int                         `json:"opponent_score"`
	WinnerID         string                      `json:"winner_id,omitempty"`
	WinnerSide       string                      `json:"winner_side,omitempty"`
	MyBoard          [][]BattleshipCellResponse  `json:"my_board"`
	TargetBoard      [][]BattleshipCellResponse  `json:"target_board"`
	PendingQuestion  *BattleshipQuestionResponse `json:"pending_question,omitempty"`
	TurnExpiresAt    *time.Time                  `json:"turn_expires_at,omitempty"`
	PendingExpiresAt *time.Time                  `json:"pending_expires_at,omitempty"`
	RevealUsed       bool                        `json:"reveal_used"`
	Log              []string                    `json:"log"`
	CreatedAt        time.Time                   `json:"created_at"`
	UpdatedAt        time.Time                   `json:"updated_at"`
	FinishedAt       *time.Time                  `json:"finished_at,omitempty"`
}

type battleshipCell struct {
	Ship   bool `json:"ship"`
	ShipID int  `json:"ship_id,omitempty"`
	Hit    bool `json:"hit"`
	Miss   bool `json:"miss"`
}

type battleshipQuestion struct {
	ID     string `json:"id"`
	Text   string `json:"text"`
	Answer int    `json:"answer"`
}

func (s *battleshipService) List(userID string) ([]BattleshipMatchResponse, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, errors.New("user tidak valid")
	}

	var matches []model.BattleshipMatch
	if err := database.DB.
		Where("player1_id = ? OR player2_id = ?", uid, uid).
		Order("updated_at desc").
		Limit(30).
		Find(&matches).Error; err != nil {
		return nil, err
	}

	items := make([]BattleshipMatchResponse, 0, len(matches))
	for _, match := range matches {
		if processBattleshipTimers(&match) {
			if database.DB.Save(&match).Error == nil {
				s.notifyCurrentTurn(&match)
			}
		}
		item, err := s.buildResponse(&match, uid)
		if err != nil {
			return nil, err
		}
		items = append(items, *item)
	}
	return items, nil
}

func (s *battleshipService) Create(userID string, input CreateBattleshipInput) (*BattleshipMatchResponse, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, errors.New("user tidak valid")
	}
	if input.Difficulty == "" {
		input.Difficulty = "medium"
	}
	if !validDifficulty(input.Difficulty) {
		return nil, errors.New("difficulty tidak valid")
	}
	if input.BotDifficulty == "" {
		input.BotDifficulty = input.Difficulty
	}
	if !validDifficulty(input.BotDifficulty) {
		return nil, errors.New("difficulty bot tidak valid")
	}

	turnExpiresAt := time.Now().Add(24 * time.Hour)
	match := model.BattleshipMatch{
		Player1ID:           uid,
		IsVsBot:             input.VsBot || input.OpponentUsername == "",
		BotDifficulty:       input.BotDifficulty,
		BotName:             battleshipBotName(input.BotDifficulty),
		Difficulty:          input.Difficulty,
		Status:              "active",
		CurrentTurn:         "player1",
		TurnExpiresAt:       &turnExpiresAt,
		Player1BoardJSON:    mustJSON(generateBattleshipBoard()),
		Player2BoardJSON:    mustJSON(generateBattleshipBoard()),
		Player1RevealedJSON: mustJSON([]BattleshipCoordinate{}),
		Player2RevealedJSON: mustJSON([]BattleshipCoordinate{}),
		LogJSON:             mustJSON([]string{"Match Battleship Math dimulai."}),
	}

	if !match.IsVsBot {
		var opponent model.User
		if err := database.DB.Where("username = ?", input.OpponentUsername).First(&opponent).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, errors.New("lawan tidak ditemukan")
			}
			return nil, err
		}
		if opponent.ID == uid {
			return nil, errors.New("tidak bisa menantang diri sendiri")
		}
		match.Player2ID = &opponent.ID
		match.BotDifficulty = ""
		match.BotName = ""
	}

	if err := database.DB.Create(&match).Error; err != nil {
		return nil, err
	}
	return s.buildResponse(&match, uid)
}

func (s *battleshipService) Get(id, userID string) (*BattleshipMatchResponse, error) {
	uid, match, err := s.getAuthorizedMatch(id, userID)
	if err != nil {
		return nil, err
	}
	if processBattleshipTimers(match) {
		if err := database.DB.Save(match).Error; err != nil {
			return nil, err
		}
		s.notifyCurrentTurn(match)
	}
	return s.buildResponse(match, uid)
}

func (s *battleshipService) Target(id, userID string, row, col int) (*BattleshipMatchResponse, error) {
	uid, match, err := s.getAuthorizedMatch(id, userID)
	if err != nil {
		return nil, err
	}
	if processBattleshipTimers(match) {
		if err := database.DB.Save(match).Error; err != nil {
			return nil, err
		}
		s.notifyCurrentTurn(match)
	}
	side, err := sideForBattleshipUser(match, uid)
	if err != nil {
		return nil, err
	}
	if match.Status != "active" {
		return nil, errors.New("match sudah selesai")
	}
	if match.CurrentTurn != side {
		return nil, errors.New("belum giliranmu")
	}
	if match.PendingForTurn != "" {
		return nil, errors.New("jawab soal aktif dulu")
	}
	if row < 0 || row >= battleshipBoardSize || col < 0 || col >= battleshipBoardSize {
		return nil, errors.New("koordinat tidak valid")
	}

	targetBoard, err := enemyBattleshipBoard(match, side)
	if err != nil {
		return nil, err
	}
	if targetBoard[row][col].Hit || targetBoard[row][col].Miss {
		return nil, errors.New("koordinat sudah pernah ditembak")
	}

	q := generateBattleshipQuestion(match.Difficulty)
	pendingExpiresAt := time.Now().Add(30 * time.Second)
	match.PendingQuestionJSON = mustJSON(q)
	match.PendingTargetJSON = mustJSON(BattleshipCoordinate{Row: row, Col: col})
	match.PendingForTurn = side
	match.PendingExpiresAt = &pendingExpiresAt
	if err := database.DB.Save(match).Error; err != nil {
		return nil, err
	}
	return s.buildResponse(match, uid)
}

func (s *battleshipService) Shot(id, userID string, answer int) (*BattleshipMatchResponse, error) {
	uid, match, err := s.getAuthorizedMatch(id, userID)
	if err != nil {
		return nil, err
	}
	if processBattleshipTimers(match) {
		if err := database.DB.Save(match).Error; err != nil {
			return nil, err
		}
		s.notifyCurrentTurn(match)
	}
	side, err := sideForBattleshipUser(match, uid)
	if err != nil {
		return nil, err
	}
	if match.Status != "active" {
		return nil, errors.New("match sudah selesai")
	}
	if match.CurrentTurn != side || match.PendingForTurn != side {
		return nil, errors.New("pilih target dulu")
	}

	var q battleshipQuestion
	if err := json.Unmarshal(match.PendingQuestionJSON, &q); err != nil || q.ID == "" {
		return nil, errors.New("soal tidak valid")
	}
	var target BattleshipCoordinate
	if err := json.Unmarshal(match.PendingTargetJSON, &target); err != nil {
		return nil, errors.New("target tidak valid")
	}

	correct := answer == q.Answer
	if err := applyBattleshipShot(match, side, target, correct); err != nil {
		return nil, err
	}
	match.PendingQuestionJSON = nil
	match.PendingTargetJSON = nil
	match.PendingForTurn = ""
	match.PendingExpiresAt = nil

	if match.Status == "active" && match.IsVsBot {
		runBattleshipBotTurn(match)
	} else if match.Status == "active" {
		setBattleshipTurn(match, match.CurrentTurn)
	}

	if err := database.DB.Save(match).Error; err != nil {
		return nil, err
	}
	if match.Status == "active" && !match.IsVsBot && match.CurrentTurn != side {
		s.notifyCurrentTurn(match)
	}
	if match.Status == "finished" {
		s.recordMultiplayerResult(match)
	}
	return s.buildResponse(match, uid)
}

func (s *battleshipService) Reveal(id, userID string) (*BattleshipMatchResponse, error) {
	uid, match, err := s.getAuthorizedMatch(id, userID)
	if err != nil {
		return nil, err
	}
	if processBattleshipTimers(match) {
		if err := database.DB.Save(match).Error; err != nil {
			return nil, err
		}
		s.notifyCurrentTurn(match)
	}
	side, err := sideForBattleshipUser(match, uid)
	if err != nil {
		return nil, err
	}
	if match.Status != "active" {
		return nil, errors.New("match sudah selesai")
	}
	if revealUsed(match, side) {
		return nil, errors.New("reward reveal sudah digunakan")
	}

	board, err := enemyBattleshipBoard(match, side)
	if err != nil {
		return nil, err
	}
	revealed := revealedBattleshipCells(match, side)
	center := pickBattleshipRevealCenter(board, revealed)
	for r := center.Row - 1; r <= center.Row+1; r++ {
		for c := center.Col - 1; c <= center.Col+1; c++ {
			if r >= 0 && r < battleshipBoardSize && c >= 0 && c < battleshipBoardSize {
				revealed = appendUniqueCoordinate(revealed, BattleshipCoordinate{Row: r, Col: c})
			}
		}
	}
	saveRevealedBattleshipCells(match, side, revealed)
	setRevealUsed(match, side)
	appendBattleshipLog(match, fmt.Sprintf("%s membuka area sekitar %s.", sideLabel(side), coordinateName(center)))
	if err := database.DB.Save(match).Error; err != nil {
		return nil, err
	}
	return s.buildResponse(match, uid)
}

func (s *battleshipService) Resign(id, userID string) (*BattleshipMatchResponse, error) {
	uid, match, err := s.getAuthorizedMatch(id, userID)
	if err != nil {
		return nil, err
	}
	side, err := sideForBattleshipUser(match, uid)
	if err != nil {
		return nil, err
	}
	if match.Status != "active" {
		return s.buildResponse(match, uid)
	}
	if side == "player1" {
		finishBattleship(match, "player2")
	} else {
		finishBattleship(match, "player1")
	}
	appendBattleshipLog(match, "Pemain menyerah. Match selesai.")
	if err := database.DB.Save(match).Error; err != nil {
		return nil, err
	}
	s.recordMultiplayerResult(match)
	return s.buildResponse(match, uid)
}

func (s *battleshipService) getAuthorizedMatch(id, userID string) (uuid.UUID, *model.BattleshipMatch, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return uuid.Nil, nil, errors.New("user tidak valid")
	}
	mid, err := uuid.Parse(id)
	if err != nil {
		return uuid.Nil, nil, errors.New("match tidak valid")
	}
	var match model.BattleshipMatch
	if err := database.DB.First(&match, "id = ?", mid).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return uuid.Nil, nil, errors.New("match tidak ditemukan")
		}
		return uuid.Nil, nil, err
	}
	if _, err := sideForBattleshipUser(&match, uid); err != nil {
		return uuid.Nil, nil, err
	}
	return uid, &match, nil
}

func (s *battleshipService) buildResponse(match *model.BattleshipMatch, uid uuid.UUID) (*BattleshipMatchResponse, error) {
	side, err := sideForBattleshipUser(match, uid)
	if err != nil {
		return nil, err
	}
	myBoard, err := ownBattleshipBoard(match, side)
	if err != nil {
		return nil, err
	}
	targetBoard, err := enemyBattleshipBoard(match, side)
	if err != nil {
		return nil, err
	}

	var pending *BattleshipQuestionResponse
	if match.PendingForTurn == side && len(match.PendingQuestionJSON) > 0 {
		var q battleshipQuestion
		var target BattleshipCoordinate
		if json.Unmarshal(match.PendingQuestionJSON, &q) == nil && json.Unmarshal(match.PendingTargetJSON, &target) == nil {
			pending = &BattleshipQuestionResponse{ID: q.ID, Text: q.Text, Target: target}
		}
	}

	var log []string
	_ = json.Unmarshal(match.LogJSON, &log)
	revealed := revealedBattleshipCells(match, side)

	winnerID := ""
	if match.WinnerID != nil {
		winnerID = match.WinnerID.String()
	}

	myScore, opponentScore := match.Player1Score, match.Player2Score
	if side == "player2" {
		myScore, opponentScore = match.Player2Score, match.Player1Score
	}

	return &BattleshipMatchResponse{
		ID:               match.ID.String(),
		Difficulty:       match.Difficulty,
		Status:           match.Status,
		IsVsBot:          match.IsVsBot,
		OpponentName:     battleshipOpponentName(match, side),
		MySide:           side,
		CurrentTurn:      match.CurrentTurn,
		MyTurn:           match.CurrentTurn == side && match.Status == "active",
		MyScore:          myScore,
		OpponentScore:    opponentScore,
		WinnerID:         winnerID,
		WinnerSide:       match.WinnerSide,
		MyBoard:          boardResponse(myBoard, true),
		TargetBoard:      boardResponseWithReveals(targetBoard, match.Status == "finished", revealed),
		PendingQuestion:  pending,
		TurnExpiresAt:    match.TurnExpiresAt,
		PendingExpiresAt: match.PendingExpiresAt,
		RevealUsed:       revealUsed(match, side),
		Log:              log,
		CreatedAt:        match.CreatedAt,
		UpdatedAt:        match.UpdatedAt,
		FinishedAt:       match.FinishedAt,
	}, nil
}

func sideForBattleshipUser(match *model.BattleshipMatch, uid uuid.UUID) (string, error) {
	if match.Player1ID == uid {
		return "player1", nil
	}
	if match.Player2ID != nil && *match.Player2ID == uid {
		return "player2", nil
	}
	return "", errors.New("kamu bukan peserta match ini")
}

func ownBattleshipBoard(match *model.BattleshipMatch, side string) ([][]battleshipCell, error) {
	if side == "player1" {
		return parseBattleshipBoard(match.Player1BoardJSON)
	}
	return parseBattleshipBoard(match.Player2BoardJSON)
}

func enemyBattleshipBoard(match *model.BattleshipMatch, side string) ([][]battleshipCell, error) {
	if side == "player1" {
		return parseBattleshipBoard(match.Player2BoardJSON)
	}
	return parseBattleshipBoard(match.Player1BoardJSON)
}

func saveBattleshipBoard(match *model.BattleshipMatch, side string, board [][]battleshipCell) {
	if side == "player1" {
		match.Player1BoardJSON = mustJSON(board)
		return
	}
	match.Player2BoardJSON = mustJSON(board)
}

func parseBattleshipBoard(raw json.RawMessage) ([][]battleshipCell, error) {
	var board [][]battleshipCell
	if err := json.Unmarshal(raw, &board); err != nil {
		return nil, err
	}
	return board, nil
}

func generateBattleshipBoard() [][]battleshipCell {
	board := make([][]battleshipCell, battleshipBoardSize)
	for r := range board {
		board[r] = make([]battleshipCell, battleshipBoardSize)
	}
	for shipIndex, shipSize := range battleshipShips {
		placed := false
		for attempts := 0; !placed && attempts < 200; attempts++ {
			row := rand.Intn(battleshipBoardSize)
			col := rand.Intn(battleshipBoardSize)
			horizontal := rand.Intn(2) == 0
			if !canPlaceBattleship(board, row, col, shipSize, horizontal) {
				continue
			}
			for i := 0; i < shipSize; i++ {
				r := row
				c := col
				if horizontal {
					c += i
				} else {
					r += i
				}
				board[r][c].Ship = true
				board[r][c].ShipID = shipIndex + 1
			}
			placed = true
		}
	}
	return board
}

func canPlaceBattleship(board [][]battleshipCell, row, col, size int, horizontal bool) bool {
	if horizontal && col+size > battleshipBoardSize {
		return false
	}
	if !horizontal && row+size > battleshipBoardSize {
		return false
	}
	for i := 0; i < size; i++ {
		r := row
		c := col
		if horizontal {
			c += i
		} else {
			r += i
		}
		if board[r][c].Ship {
			return false
		}
	}
	return true
}

func generateBattleshipQuestion(difficulty string) battleshipQuestion {
	id := uuid.NewString()
	switch difficulty {
	case "easy":
		a := 2 + rand.Intn(9)
		b := 2 + rand.Intn(9)
		return battleshipQuestion{ID: id, Text: fmt.Sprintf("%d x %d", a, b), Answer: a * b}
	case "hard":
		a := 6 + rand.Intn(10)
		b := 4 + rand.Intn(10)
		c := 2 + rand.Intn(12)
		return battleshipQuestion{ID: id, Text: fmt.Sprintf("%d^2 + %d^2 - %d", a, b, c), Answer: a*a + b*b - c}
	default:
		a := 12 + rand.Intn(18)
		b := 3 + rand.Intn(9)
		if rand.Intn(2) == 0 {
			return battleshipQuestion{ID: id, Text: fmt.Sprintf("%d / %d", a*b, b), Answer: a}
		}
		return battleshipQuestion{ID: id, Text: fmt.Sprintf("%d x %d", a, b), Answer: a * b}
	}
}

func applyBattleshipShot(match *model.BattleshipMatch, side string, target BattleshipCoordinate, correct bool) error {
	targetSide := "player2"
	nextTurn := "player2"
	if side == "player2" {
		targetSide = "player1"
		nextTurn = "player1"
	}
	board, err := enemyBattleshipBoard(match, side)
	if err != nil {
		return err
	}
	cell := &board[target.Row][target.Col]
	if cell.Hit || cell.Miss {
		return errors.New("koordinat sudah ditembak")
	}
	if correct {
		addBattleshipScore(match, side, 5)
		if cell.Ship {
			cell.Hit = true
			addBattleshipScore(match, side, 20)
			appendBattleshipLog(match, fmt.Sprintf("%s mengenai kapal di %s.", sideLabel(side), coordinateName(target)))
			if isBattleshipSunk(board, cell.ShipID) {
				addBattleshipScore(match, side, 50)
				appendBattleshipLog(match, fmt.Sprintf("%s menenggelamkan kapal lawan.", sideLabel(side)))
			}
		} else {
			cell.Miss = true
			appendBattleshipLog(match, fmt.Sprintf("%s menembak %s, tetapi kosong.", sideLabel(side), coordinateName(target)))
		}
	} else {
		appendBattleshipLog(match, fmt.Sprintf("%s salah menjawab. Tembakan ke %s hangus.", sideLabel(side), coordinateName(target)))
	}
	saveBattleshipBoard(match, targetSide, board)
	if allBattleshipShipsDestroyed(board) {
		finishBattleship(match, side)
		return nil
	}
	match.CurrentTurn = nextTurn
	return nil
}

func runBattleshipBotTurn(match *model.BattleshipMatch) {
	if match.Status != "active" {
		return
	}
	accuracy := 0.55
	switch match.BotDifficulty {
	case "medium":
		accuracy = 0.72
	case "hard":
		accuracy = 0.88
	}
	if rand.Float64() > accuracy {
		appendBattleshipLog(match, fmt.Sprintf("%s salah menjawab. Gilirannya hangus.", match.BotName))
		setBattleshipTurn(match, "player1")
		return
	}

	board, err := parseBattleshipBoard(match.Player1BoardJSON)
	if err != nil {
		setBattleshipTurn(match, "player1")
		return
	}
	target := chooseBattleshipBotTarget(board, match.BotDifficulty)
	cell := &board[target.Row][target.Col]
	if cell.Ship {
		cell.Hit = true
		match.Player2Score += 25
		appendBattleshipLog(match, fmt.Sprintf("%s mengenai kapal di %s.", match.BotName, coordinateName(target)))
		if isBattleshipSunk(board, cell.ShipID) {
			match.Player2Score += 50
			appendBattleshipLog(match, fmt.Sprintf("%s menenggelamkan kapal.", match.BotName))
		}
	} else {
		cell.Miss = true
		match.Player2Score += 5
		appendBattleshipLog(match, fmt.Sprintf("%s menembak %s, tetapi kosong.", match.BotName, coordinateName(target)))
	}
	match.Player1BoardJSON = mustJSON(board)
	if allBattleshipShipsDestroyed(board) {
		finishBattleship(match, "player2")
		return
	}
	setBattleshipTurn(match, "player1")
}

func chooseBattleshipBotTarget(board [][]battleshipCell, difficulty string) BattleshipCoordinate {
	if difficulty == "medium" {
		if target, ok := adjacentBattleshipTarget(board); ok {
			return target
		}
	}
	if difficulty == "hard" {
		return probabilityBattleshipTarget(board)
	}
	return randomBattleshipTarget(board)
}

func randomBattleshipTarget(board [][]battleshipCell) BattleshipCoordinate {
	options := make([]BattleshipCoordinate, 0, battleshipBoardSize*battleshipBoardSize)
	for r := range board {
		for c := range board[r] {
			if !board[r][c].Hit && !board[r][c].Miss {
				options = append(options, BattleshipCoordinate{Row: r, Col: c})
			}
		}
	}
	if len(options) == 0 {
		return BattleshipCoordinate{}
	}
	return options[rand.Intn(len(options))]
}

func adjacentBattleshipTarget(board [][]battleshipCell) (BattleshipCoordinate, bool) {
	directions := []BattleshipCoordinate{{Row: -1}, {Row: 1}, {Col: -1}, {Col: 1}}
	options := make([]BattleshipCoordinate, 0)
	for r := range board {
		for c, cell := range board[r] {
			if !cell.Ship || !cell.Hit {
				continue
			}
			for _, dir := range directions {
				nr := r + dir.Row
				nc := c + dir.Col
				if nr >= 0 && nr < battleshipBoardSize && nc >= 0 && nc < battleshipBoardSize && !board[nr][nc].Hit && !board[nr][nc].Miss {
					options = append(options, BattleshipCoordinate{Row: nr, Col: nc})
				}
			}
		}
	}
	if len(options) == 0 {
		return BattleshipCoordinate{}, false
	}
	return options[rand.Intn(len(options))], true
}

func probabilityBattleshipTarget(board [][]battleshipCell) BattleshipCoordinate {
	best := make([]BattleshipCoordinate, 0)
	bestScore := -1
	for r := range board {
		for c, cell := range board[r] {
			if cell.Hit || cell.Miss {
				continue
			}
			score := 1
			if (r+c)%2 == 0 {
				score += 2
			}
			for _, dir := range []BattleshipCoordinate{{Row: -1}, {Row: 1}, {Col: -1}, {Col: 1}} {
				nr := r + dir.Row
				nc := c + dir.Col
				if nr >= 0 && nr < battleshipBoardSize && nc >= 0 && nc < battleshipBoardSize {
					if board[nr][nc].Hit && board[nr][nc].Ship {
						score += 6
					}
					if !board[nr][nc].Hit && !board[nr][nc].Miss {
						score += 1
					}
				}
			}
			if score > bestScore {
				bestScore = score
				best = []BattleshipCoordinate{{Row: r, Col: c}}
			} else if score == bestScore {
				best = append(best, BattleshipCoordinate{Row: r, Col: c})
			}
		}
	}
	if len(best) == 0 {
		return randomBattleshipTarget(board)
	}
	return best[rand.Intn(len(best))]
}

func allBattleshipShipsDestroyed(board [][]battleshipCell) bool {
	total := 0
	hit := 0
	for _, row := range board {
		for _, cell := range row {
			if cell.Ship {
				total++
				if cell.Hit {
					hit++
				}
			}
		}
	}
	return total > 0 && hit >= total
}

func isBattleshipSunk(board [][]battleshipCell, shipID int) bool {
	if shipID == 0 {
		return false
	}
	found := false
	for _, row := range board {
		for _, cell := range row {
			if cell.ShipID == shipID {
				found = true
				if !cell.Hit {
					return false
				}
			}
		}
	}
	return found
}

func processBattleshipTimers(match *model.BattleshipMatch) bool {
	if match.Status != "active" {
		return false
	}
	now := time.Now()
	changed := false

	if match.PendingExpiresAt != nil && now.After(*match.PendingExpiresAt) && match.PendingForTurn != "" {
		appendBattleshipLog(match, fmt.Sprintf("%s timeout menjawab soal. Giliran hangus.", sideLabel(match.PendingForTurn)))
		nextTurn := "player1"
		if match.PendingForTurn == "player1" {
			nextTurn = "player2"
		}
		match.PendingQuestionJSON = nil
		match.PendingTargetJSON = nil
		match.PendingForTurn = ""
		match.PendingExpiresAt = nil
		setBattleshipTurnFromTime(match, nextTurn, now)
		changed = true
		if match.IsVsBot && match.CurrentTurn == "player2" {
			runBattleshipBotTurn(match)
			return true
		}
	}

	if match.TurnExpiresAt != nil && now.After(*match.TurnExpiresAt) {
		appendBattleshipLog(match, fmt.Sprintf("%s melewati batas 24 jam. Giliran hangus.", sideLabel(match.CurrentTurn)))
		nextTurn := "player1"
		if match.CurrentTurn == "player1" {
			nextTurn = "player2"
		}
		match.PendingQuestionJSON = nil
		match.PendingTargetJSON = nil
		match.PendingForTurn = ""
		match.PendingExpiresAt = nil
		setBattleshipTurnFromTime(match, nextTurn, now)
		changed = true
		if match.IsVsBot && match.CurrentTurn == "player2" {
			runBattleshipBotTurn(match)
			return true
		}
	}

	return changed
}

func finishBattleship(match *model.BattleshipMatch, winnerSide string) {
	now := time.Now()
	match.Status = "finished"
	match.CurrentTurn = ""
	match.WinnerSide = winnerSide
	match.FinishedAt = &now
	if winnerSide == "player1" {
		wid := match.Player1ID
		match.WinnerID = &wid
		match.Player1Score += 200
	} else if match.Player2ID != nil {
		wid := *match.Player2ID
		match.WinnerID = &wid
		match.Player2Score += 200
	} else if winnerSide == "player2" {
		match.Player2Score += 200
	}
}

func addBattleshipScore(match *model.BattleshipMatch, side string, delta int) {
	if side == "player1" {
		match.Player1Score += delta
		if match.Player1Score < 0 {
			match.Player1Score = 0
		}
		return
	}
	match.Player2Score += delta
	if match.Player2Score < 0 {
		match.Player2Score = 0
	}
}

func setBattleshipTurn(match *model.BattleshipMatch, side string) {
	setBattleshipTurnFromTime(match, side, time.Now())
}

func setBattleshipTurnFromTime(match *model.BattleshipMatch, side string, now time.Time) {
	match.CurrentTurn = side
	turnExpiresAt := now.Add(24 * time.Hour)
	match.TurnExpiresAt = &turnExpiresAt
}

func appendBattleshipLog(match *model.BattleshipMatch, item string) {
	var log []string
	_ = json.Unmarshal(match.LogJSON, &log)
	log = append([]string{item}, log...)
	if len(log) > 8 {
		log = log[:8]
	}
	match.LogJSON = mustJSON(log)
}

func boardResponse(board [][]battleshipCell, revealShips bool) [][]BattleshipCellResponse {
	return boardResponseWithReveals(board, revealShips, nil)
}

func boardResponseWithReveals(board [][]battleshipCell, revealShips bool, revealed []BattleshipCoordinate) [][]BattleshipCellResponse {
	revealedMap := make(map[string]bool, len(revealed))
	for _, coord := range revealed {
		revealedMap[fmt.Sprintf("%d:%d", coord.Row, coord.Col)] = true
	}
	result := make([][]BattleshipCellResponse, len(board))
	for r := range board {
		result[r] = make([]BattleshipCellResponse, len(board[r]))
		for c, cell := range board[r] {
			revealedCell := revealedMap[fmt.Sprintf("%d:%d", r, c)]
			showShip := revealShips || revealedCell
			result[r][c] = BattleshipCellResponse{Ship: showShip && cell.Ship, Hit: cell.Hit, Miss: cell.Miss, Revealed: revealedCell}
		}
	}
	return result
}

func revealedBattleshipCells(match *model.BattleshipMatch, side string) []BattleshipCoordinate {
	var coords []BattleshipCoordinate
	if side == "player1" {
		_ = json.Unmarshal(match.Player1RevealedJSON, &coords)
		return coords
	}
	_ = json.Unmarshal(match.Player2RevealedJSON, &coords)
	return coords
}

func saveRevealedBattleshipCells(match *model.BattleshipMatch, side string, coords []BattleshipCoordinate) {
	if side == "player1" {
		match.Player1RevealedJSON = mustJSON(coords)
		return
	}
	match.Player2RevealedJSON = mustJSON(coords)
}

func revealUsed(match *model.BattleshipMatch, side string) bool {
	if side == "player1" {
		return match.Player1RevealUsed
	}
	return match.Player2RevealUsed
}

func setRevealUsed(match *model.BattleshipMatch, side string) {
	if side == "player1" {
		match.Player1RevealUsed = true
		return
	}
	match.Player2RevealUsed = true
}

func pickBattleshipRevealCenter(board [][]battleshipCell, revealed []BattleshipCoordinate) BattleshipCoordinate {
	revealedMap := make(map[string]bool, len(revealed))
	for _, coord := range revealed {
		revealedMap[fmt.Sprintf("%d:%d", coord.Row, coord.Col)] = true
	}
	shipOptions := make([]BattleshipCoordinate, 0)
	fallback := make([]BattleshipCoordinate, 0)
	for r := range board {
		for c, cell := range board[r] {
			key := fmt.Sprintf("%d:%d", r, c)
			if revealedMap[key] || cell.Hit || cell.Miss {
				continue
			}
			coord := BattleshipCoordinate{Row: r, Col: c}
			if cell.Ship {
				shipOptions = append(shipOptions, coord)
			}
			fallback = append(fallback, coord)
		}
	}
	if len(shipOptions) > 0 {
		return shipOptions[rand.Intn(len(shipOptions))]
	}
	if len(fallback) > 0 {
		return fallback[rand.Intn(len(fallback))]
	}
	return BattleshipCoordinate{}
}

func appendUniqueCoordinate(coords []BattleshipCoordinate, next BattleshipCoordinate) []BattleshipCoordinate {
	for _, coord := range coords {
		if coord.Row == next.Row && coord.Col == next.Col {
			return coords
		}
	}
	return append(coords, next)
}

func battleshipOpponentName(match *model.BattleshipMatch, side string) string {
	if match.IsVsBot {
		return match.BotName
	}
	var user model.User
	if side == "player1" && match.Player2ID != nil {
		if database.DB.Select("username").First(&user, "id = ?", *match.Player2ID).Error == nil {
			return user.Username
		}
	}
	if side == "player2" {
		if database.DB.Select("username").First(&user, "id = ?", match.Player1ID).Error == nil {
			return user.Username
		}
	}
	return "Lawan"
}

func battleshipBotName(difficulty string) string {
	switch difficulty {
	case "easy":
		return "Bot Latihan"
	case "hard":
		return "Bot Presisi"
	default:
		return "Bot Taktis"
	}
}

func sideLabel(side string) string {
	if side == "player1" {
		return "Player 1"
	}
	return "Player 2"
}

func coordinateName(c BattleshipCoordinate) string {
	return fmt.Sprintf("%c%d", 'A'+rune(c.Row), c.Col+1)
}

func mustJSON(v interface{}) json.RawMessage {
	b, _ := json.Marshal(v)
	return b
}

func (s *battleshipService) notifyCurrentTurn(match *model.BattleshipMatch) {
	if s.pushSvc == nil || match.Status != "active" || match.IsVsBot {
		return
	}

	var userID uuid.UUID
	switch match.CurrentTurn {
	case "player1":
		userID = match.Player1ID
	case "player2":
		if match.Player2ID == nil {
			return
		}
		userID = *match.Player2ID
	default:
		return
	}

	go s.pushSvc.SendToUser(
		userID,
		"Giliran Battleship Math",
		"Pilih koordinat dan jawab soal sebelum timer habis.",
		"/games/battleship-math",
	)
}

func (s *battleshipService) recordMultiplayerResult(match *model.BattleshipMatch) {
	var existing int64
	roomCode := "battleship:" + match.ID.String()
	database.DB.Model(&model.MultiplayerMatch{}).Where("room_code = ?", roomCode).Count(&existing)
	if existing > 0 {
		return
	}

	var game model.Game
	if err := database.DB.Where("slug = ?", "battleship-math").First(&game).Error; err != nil {
		return
	}
	now := time.Now()
	mpMatch := model.MultiplayerMatch{
		RoomCode:   roomCode,
		GameID:     game.ID,
		MatchType:  "turn_based",
		Difficulty: match.Difficulty,
		Status:     "finished",
		WinnerID:   match.WinnerID,
		StartedAt:  &match.CreatedAt,
		FinishedAt: &now,
	}
	if err := database.DB.Create(&mpMatch).Error; err != nil {
		return
	}

	p1Winner := match.WinnerSide == "player1"
	database.DB.Create(&model.MatchParticipant{
		MatchID:        mpMatch.ID,
		UserID:         &match.Player1ID,
		Score:          match.Player1Score,
		Rank:           rankForWinner(p1Winner),
		IsWinner:       p1Winner,
		JoinedAt:       match.CreatedAt,
		FinishedAt:     &now,
		CorrectAnswers: match.Player1Score / 25,
	})
	if match.IsVsBot {
		database.DB.Create(&model.MatchParticipant{
			MatchID:       mpMatch.ID,
			BotType:       "rule_based",
			BotDifficulty: match.BotDifficulty,
			BotName:       match.BotName,
			Score:         match.Player2Score,
			Rank:          rankForWinner(match.WinnerSide == "player2"),
			IsWinner:      match.WinnerSide == "player2",
			JoinedAt:      match.CreatedAt,
			FinishedAt:    &now,
		})
		return
	}
	if match.Player2ID != nil {
		p2Winner := match.WinnerSide == "player2"
		database.DB.Create(&model.MatchParticipant{
			MatchID:        mpMatch.ID,
			UserID:         match.Player2ID,
			Score:          match.Player2Score,
			Rank:           rankForWinner(p2Winner),
			IsWinner:       p2Winner,
			JoinedAt:       match.CreatedAt,
			FinishedAt:     &now,
			CorrectAnswers: match.Player2Score / 25,
		})
	}
}

func rankForWinner(winner bool) int {
	if winner {
		return 1
	}
	return 2
}
