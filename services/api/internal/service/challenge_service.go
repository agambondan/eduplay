package service

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ChallengeService interface {
	CreateChallenge(challengerID, opponentUsername, gameSlug, difficulty string) (*AsyncChallengeResponse, error)
	ListChallenges(userID, filter string) ([]AsyncChallengeResponse, error)
	GetChallenge(userID, challengeID string) (*AsyncChallengeDetail, error)
	SubmitChallenge(userID, challengeID string, answers []UserAnswer, score int) (*ChallengeResult, error)
}

type UserAnswer struct {
	QuestionID string `json:"question_id"`
	Answer     string `json:"answer"`
	TimeTaken  int    `json:"time_taken"`
}

type AsyncChallengeResponse struct {
	ID               string  `json:"id"`
	ChallengerName   string  `json:"challenger_name"`
	OpponentName     string  `json:"opponent_name"`
	GameName         string  `json:"game_name"`
	Difficulty       string  `json:"difficulty"`
	ChallengerScore  *int    `json:"challenger_score"`
	OpponentScore    *int    `json:"opponent_score"`
	Status           string  `json:"status"`
	ExpiresAt        string  `json:"expires_at"`
	CreatedAt        string  `json:"created_at"`
}

type AsyncChallengeDetail struct {
	AsyncChallengeResponse
	Questions []map[string]interface{} `json:"questions,omitempty"`
	Result    *ChallengeResult         `json:"result,omitempty"`
}

type ChallengeResult struct {
	WinnerID   string `json:"winner_id"`
	Result     string `json:"result"` // "win", "lose", "draw", "pending"
	XPEarned   int    `json:"xp_earned"`
}

type challengeService struct {
	aiSvc   AIService
	pushSvc *PushService
}

func NewChallengeService(aiSvc AIService, pushSvc *PushService) ChallengeService {
	return &challengeService{aiSvc: aiSvc, pushSvc: pushSvc}
}

func (s *challengeService) CreateChallenge(challengerID, opponentUsername, gameSlug, difficulty string) (*AsyncChallengeResponse, error) {
	cid, err := uuid.Parse(challengerID)
	if err != nil {
		return nil, errors.New("ID pengguna tidak valid")
	}

	var opponent model.User
	if err := database.DB.Where("username = ?", opponentUsername).First(&opponent).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("Pengguna tidak ditemukan")
		}
		return nil, err
	}

	if opponent.ID == cid {
		return nil, errors.New("Tidak bisa menantang diri sendiri")
	}

	var challenger model.User
	if err := database.DB.First(&challenger, "id = ?", cid).Error; err != nil {
		return nil, errors.New("Pengguna tidak ditemukan")
	}

	var game model.Game
	if err := database.DB.Where("slug = ?", gameSlug).First(&game).Error; err != nil {
		return nil, errors.New("Game tidak ditemukan")
	}

	questions, err := s.aiSvc.GenerateQuestions(gameSlug, difficulty, 10)
	if err != nil {
		return nil, errors.New("Gagal menghasilkan soal: " + err.Error())
	}

	questionsJSON, _ := json.Marshal(questions)
	answersJSON, _ := json.Marshal(make([]interface{}, len(questions)))

	challenge := model.AsyncChallenge{
		ChallengerID:  cid,
		OpponentID:    opponent.ID,
		GameID:        game.ID,
		Difficulty:    difficulty,
		QuestionsJSON: questionsJSON,
		AnswersJSON:   answersJSON,
		Status:        "pending",
		ExpiresAt:     time.Now().Add(48 * time.Hour),
	}

	if err := database.DB.Create(&challenge).Error; err != nil {
		return nil, err
	}

	if s.pushSvc != nil {
		s.pushSvc.SendToUser(opponent.ID, "Tantangan Baru!",
			fmt.Sprintf("%s menantangmu main %s!", challenger.Username, game.Name),
			fmt.Sprintf("%s/games/trivia-challenge?id=%s", s.getFrontendURL(), challenge.ID))
	}

	return &AsyncChallengeResponse{
		ID:         challenge.ID.String(),
		OpponentName: opponent.Username,
		Difficulty: difficulty,
		Status:     "pending",
		ExpiresAt:  challenge.ExpiresAt.Format(time.RFC3339),
		CreatedAt:  challenge.CreatedAt.Format(time.RFC3339),
	}, nil
}

func (s *challengeService) ListChallenges(userID, filter string) ([]AsyncChallengeResponse, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, errors.New("ID pengguna tidak valid")
	}

	query := database.DB.Table("async_challenges").
		Select(`async_challenges.id, async_challenges.difficulty, async_challenges.status,
			async_challenges.challenger_score, async_challenges.opponent_score,
			async_challenges.expires_at, async_challenges.created_at,
			challenger.username as challenger_name, opponent.username as opponent_name,
			games.name as game_name`).
		Joins("JOIN users as challenger ON challenger.id = async_challenges.challenger_id").
		Joins("JOIN users as opponent ON opponent.id = async_challenges.opponent_id").
		Joins("JOIN games ON games.id = async_challenges.game_id")

	switch filter {
	case "incoming":
		query = query.Where("async_challenges.opponent_id = ?", uid)
	case "outgoing":
		query = query.Where("async_challenges.challenger_id = ?", uid)
	case "completed":
		query = query.Where("(async_challenges.challenger_id = ? OR async_challenges.opponent_id = ?) AND async_challenges.status IN ('completed','expired')", uid, uid)
	default:
		query = query.Where("(async_challenges.challenger_id = ? OR async_challenges.opponent_id = ?)", uid, uid)
	}

	var rows []struct {
		ID              uuid.UUID
		ChallengerName  string
		OpponentName    string
		GameName        string
		Difficulty      string
		ChallengerScore *int
		OpponentScore   *int
		Status          string
		ExpiresAt       time.Time
		CreatedAt       time.Time
	}

	if err := query.Order("async_challenges.created_at DESC").Find(&rows).Error; err != nil {
		return nil, err
	}

	result := make([]AsyncChallengeResponse, len(rows))
	for i, r := range rows {
		result[i] = AsyncChallengeResponse{
			ID:              r.ID.String(),
			ChallengerName:  r.ChallengerName,
			OpponentName:    r.OpponentName,
			GameName:        r.GameName,
			Difficulty:      r.Difficulty,
			ChallengerScore: r.ChallengerScore,
			OpponentScore:   r.OpponentScore,
			Status:          r.Status,
			ExpiresAt:       r.ExpiresAt.Format(time.RFC3339),
			CreatedAt:       r.CreatedAt.Format(time.RFC3339),
		}
	}
	return result, nil
}

func (s *challengeService) GetChallenge(userID, challengeID string) (*AsyncChallengeDetail, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, errors.New("ID pengguna tidak valid")
	}

	cid, err := uuid.Parse(challengeID)
	if err != nil {
		return nil, errors.New("ID challenge tidak valid")
	}

	var challenge model.AsyncChallenge
	if err := database.DB.First(&challenge, "id = ?", cid).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("Challenge tidak ditemukan")
		}
		return nil, err
	}

	var challenger, opponent model.User
	database.DB.First(&challenger, challenge.ChallengerID)
	database.DB.First(&opponent, challenge.OpponentID)

	var game model.Game
	database.DB.First(&game, challenge.GameID)

	resp := &AsyncChallengeDetail{
		AsyncChallengeResponse: AsyncChallengeResponse{
			ID:              challenge.ID.String(),
			ChallengerName:  challenger.Username,
			OpponentName:    opponent.Username,
			GameName:        game.Name,
			Difficulty:      challenge.Difficulty,
			ChallengerScore: challenge.ChallengerScore,
			OpponentScore:   challenge.OpponentScore,
			Status:          challenge.Status,
			ExpiresAt:       challenge.ExpiresAt.Format(time.RFC3339),
			CreatedAt:       challenge.CreatedAt.Format(time.RFC3339),
		},
	}

	userIsChallenger := challenge.ChallengerID == uid
	userIsOpponent := challenge.OpponentID == uid

	if !userIsChallenger && !userIsOpponent {
		return nil, errors.New("Challenge ini bukan untukmu")
	}

	showQuestions := false
	if userIsChallenger && challenge.ChallengerScore == nil {
		showQuestions = true
	} else if userIsOpponent && challenge.OpponentScore == nil {
		showQuestions = true
	}

	if showQuestions {
		var questions []map[string]interface{}
		json.Unmarshal(challenge.QuestionsJSON, &questions)
		resp.Questions = questions
	}

	if challenge.Status == "completed" || challenge.Status == "expired" {
		result := s.calculateResult(&challenge, uid)
		resp.Result = result
	}

	return resp, nil
}

func (s *challengeService) SubmitChallenge(userID, challengeID string, answers []UserAnswer, score int) (*ChallengeResult, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, errors.New("ID pengguna tidak valid")
	}

	cid, err := uuid.Parse(challengeID)
	if err != nil {
		return nil, errors.New("ID challenge tidak valid")
	}

	var challenge model.AsyncChallenge
	if err := database.DB.First(&challenge, "id = ?", cid).Error; err != nil {
		return nil, errors.New("Challenge tidak ditemukan")
	}

	if time.Now().After(challenge.ExpiresAt) {
		challenge.Status = "expired"
		database.DB.Save(&challenge)
		return nil, errors.New("Challenge sudah kadaluarsa")
	}

	if challenge.Status != "pending" {
		return nil, errors.New("Challenge sudah selesai")
	}

	now := time.Now()
	if challenge.ChallengerID == uid {
		if challenge.ChallengerScore != nil {
			return nil, errors.New("Kamu sudah mengerjakan challenge ini")
		}
		challenge.ChallengerScore = &score
		challenge.ChallengerDoneAt = &now
	} else if challenge.OpponentID == uid {
		if challenge.OpponentScore != nil {
			return nil, errors.New("Kamu sudah mengerjakan challenge ini")
		}
		challenge.OpponentScore = &score
		challenge.OpponentDoneAt = &now
	} else {
		return nil, errors.New("Challenge ini bukan untukmu")
	}

	if challenge.ChallengerScore != nil && challenge.OpponentScore != nil {
		result := s.calculateResult(&challenge, uid)
		challenge.WinnerID = nil
		if result.Result == "win" {
			wid, _ := uuid.Parse(result.WinnerID)
			challenge.WinnerID = &wid
		}
		challenge.Status = "completed"
		database.DB.Save(&challenge)
		return result, nil
	}

	database.DB.Save(&challenge)
	return &ChallengeResult{Result: "pending", XPEarned: 0}, nil
}

func (s *challengeService) getFrontendURL() string {
	if url := os.Getenv("FRONTEND_URL"); url != "" {
		return url
	}
	return "http://localhost:3000"
}

func (s *challengeService) calculateResult(challenge *model.AsyncChallenge, userID uuid.UUID) *ChallengeResult {
	cScore := 0
	oScore := 0
	if challenge.ChallengerScore != nil {
		cScore = *challenge.ChallengerScore
	}
	if challenge.OpponentScore != nil {
		oScore = *challenge.OpponentScore
	}

	userIsChallenger := challenge.ChallengerID == userID
	var userScore, opponentScore int
	if userIsChallenger {
		userScore = cScore
		opponentScore = oScore
	} else {
		userScore = oScore
		opponentScore = cScore
	}

	var resultStr string
	var winnerID string
	if userScore > opponentScore {
		resultStr = "win"
		winnerID = userID.String()
	} else if userScore < opponentScore {
		resultStr = "lose"
		if userIsChallenger {
			winnerID = challenge.OpponentID.String()
		} else {
			winnerID = challenge.ChallengerID.String()
		}
	} else {
		resultStr = "draw"
	}

	xpEarned := 0
	if resultStr == "win" {
		xpEarned = 50
	} else if resultStr == "draw" {
		xpEarned = 25
	}

	return &ChallengeResult{
		WinnerID: winnerID,
		Result:   resultStr,
		XPEarned: xpEarned,
	}
}

func StartChallengeExpiryCleanup() {
	go func() {
		for {
			time.Sleep(10 * time.Minute)
			database.DB.Model(&model.AsyncChallenge{}).
				Where("status = 'pending' AND expires_at < NOW()").
				Update("status", "expired")
		}
	}()
}
