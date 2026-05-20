package service

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"

	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/google/uuid"
)

type ScoreChallengeService interface {
	Create(userID, gameSlug, difficulty string, score int) (*ScoreChallengeResponse, error)
	GetByShareLink(link string) (*ScoreChallengeDetail, error)
	Accept(link, userID string) (*ScoreChallengeDetail, error)
	SubmitScore(link, userID string, score int) (*ScoreChallengeResult, error)
	List(userID string) ([]ScoreChallengeResponse, error)
}

type ScoreChallengeResponse struct {
	ID               string `json:"id"`
	ChallengerName   string `json:"challenger_name"`
	OpponentName     string `json:"opponent_name,omitempty"`
	GameName         string `json:"game_name"`
	GameSlug         string `json:"game_slug"`
	Difficulty       string `json:"difficulty"`
	ChallengerScore  int    `json:"challenger_score"`
	OpponentScore    *int   `json:"opponent_score"`
	ShareLink        string `json:"share_link"`
	Status           string `json:"status"`
	ExpiresAt        string `json:"expires_at"`
	CreatedAt        string `json:"created_at"`
}

type ScoreChallengeDetail struct {
	ScoreChallengeResponse
	ChallengerLevel int  `json:"challenger_level"`
	IsChallenger    bool `json:"is_challenger"`
}

type ScoreChallengeResult struct {
	Result   string `json:"result"`
	XPEarned int    `json:"xp_earned"`
	UserScore int   `json:"user_score"`
	TargetScore int `json:"target_score"`
}

type scoreChallengeService struct{}

func NewScoreChallengeService() ScoreChallengeService {
	return &scoreChallengeService{}
}

func (s *scoreChallengeService) Create(userID, gameSlug, difficulty string, score int) (*ScoreChallengeResponse, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, errors.New("ID tidak valid")
	}

	var game model.Game
	if err := database.DB.Where("slug = ?", gameSlug).First(&game).Error; err != nil {
		return nil, errors.New("Game tidak ditemukan")
	}

	shareLink := s.generateLink()

	challenge := model.ScoreChallenge{
		ChallengerID:    uid,
		GameID:          game.ID,
		Difficulty:      difficulty,
		ChallengerScore: score,
		ShareLink:       shareLink,
		Status:          "pending",
		ExpiresAt:       time.Now().Add(48 * time.Hour),
	}

	if err := database.DB.Create(&challenge).Error; err != nil {
		return nil, err
	}

	var u model.User
	database.DB.First(&u, "id = ?", uid)

	return &ScoreChallengeResponse{
		ID:              challenge.ID.String(),
		ChallengerName:  u.Username,
		GameName:         game.Name,
		GameSlug:        gameSlug,
		Difficulty:      difficulty,
		ChallengerScore: score,
		ShareLink:       shareLink,
		Status:          "pending",
		ExpiresAt:       challenge.ExpiresAt.Format(time.RFC3339),
		CreatedAt:       challenge.CreatedAt.Format(time.RFC3339),
	}, nil
}

func (s *scoreChallengeService) GetByShareLink(link string) (*ScoreChallengeDetail, error) {
	var c model.ScoreChallenge
	if err := database.DB.Where("share_link = ?", link).First(&c).Error; err != nil {
		return nil, errors.New("Challenge tidak ditemukan")
	}

	if time.Now().After(c.ExpiresAt) {
		return nil, errors.New("Challenge sudah kadaluarsa")
	}

	var challenger model.User
	database.DB.First(&challenger, c.ChallengerID)

	var game model.Game
	database.DB.First(&game, c.GameID)

	resp := &ScoreChallengeDetail{
		ScoreChallengeResponse: ScoreChallengeResponse{
			ID:              c.ID.String(),
			ChallengerName:  challenger.Username,
			GameName:        game.Name,
			GameSlug:         game.Slug,
			Difficulty:      c.Difficulty,
			ChallengerScore: c.ChallengerScore,
			OpponentScore:   c.OpponentScore,
			ShareLink:       link,
			Status:          c.Status,
			ExpiresAt:       c.ExpiresAt.Format(time.RFC3339),
			CreatedAt:       c.CreatedAt.Format(time.RFC3339),
		},
		ChallengerLevel: challenger.Level,
	}

	return resp, nil
}

func (s *scoreChallengeService) Accept(link, userID string) (*ScoreChallengeDetail, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, errors.New("ID tidak valid")
	}

	var c model.ScoreChallenge
	if err := database.DB.Where("share_link = ?", link).First(&c).Error; err != nil {
		return nil, errors.New("Challenge tidak ditemukan")
	}

	if c.ChallengerID == uid {
		return nil, errors.New("Tidak bisa接受 tantangan sendiri")
	}

	c.OpponentID = &uid
	database.DB.Save(&c)

	return s.GetByShareLink(link)
}

func (s *scoreChallengeService) SubmitScore(link, userID string, score int) (*ScoreChallengeResult, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, errors.New("ID tidak valid")
	}

	var c model.ScoreChallenge
	if err := database.DB.Where("share_link = ?", link).First(&c).Error; err != nil {
		return nil, errors.New("Challenge tidak ditemukan")
	}

	if c.OpponentID == nil || *c.OpponentID != uid {
		if c.ChallengerID != uid {
			return nil, errors.New("Kamu tidak diundang dalam challenge ini")
		}
		return nil, errors.New("Kamu adalah pembuat challenge, bukan penerima")
	}

	if c.OpponentScore != nil {
		return nil, errors.New("Kamu sudah mengirimkan skor")
	}

	c.OpponentScore = &score
	c.Status = "completed"

	var result string
	var winnerID uuid.UUID
	if score > c.ChallengerScore {
		result = "win"
		winnerID = uid
	} else if score < c.ChallengerScore {
		result = "lose"
		winnerID = c.ChallengerID
	} else {
		result = "draw"
	}

	if winnerID != uuid.Nil {
		c.WinnerID = &winnerID
	}
	database.DB.Save(&c)

	xpEarned := 0
	if result == "win" {
		xpEarned = 50
	} else if result == "draw" {
		xpEarned = 25
	}

	return &ScoreChallengeResult{
		Result:      result,
		XPEarned:    xpEarned,
		UserScore:   score,
		TargetScore: c.ChallengerScore,
	}, nil
}

func (s *scoreChallengeService) List(userID string) ([]ScoreChallengeResponse, error) {
	uid, _ := uuid.Parse(userID)
	var challenges []model.ScoreChallenge
	database.DB.Where("challenger_id = ? OR opponent_id = ?", uid, uid).
		Order("created_at DESC").Limit(20).Find(&challenges)

	result := make([]ScoreChallengeResponse, len(challenges))
	for i, c := range challenges {
		var challenger model.User
		database.DB.First(&challenger, c.ChallengerID)
		var game model.Game
		database.DB.First(&game, c.GameID)

		resp := ScoreChallengeResponse{
			ID:              c.ID.String(),
			ChallengerName:  challenger.Username,
			GameName:        game.Name,
			GameSlug:        game.Slug,
			Difficulty:      c.Difficulty,
			ChallengerScore: c.ChallengerScore,
			OpponentScore:   c.OpponentScore,
			ShareLink:       c.ShareLink,
			Status:          c.Status,
			ExpiresAt:       c.ExpiresAt.Format(time.RFC3339),
			CreatedAt:       c.CreatedAt.Format(time.RFC3339),
		}
		if c.OpponentID != nil {
			var opp model.User
			database.DB.First(&opp, c.OpponentID)
			resp.OpponentName = opp.Username
		}
		result[i] = resp
	}
	return result, nil
}

func (s *scoreChallengeService) generateLink() string {
	b := make([]byte, 8)
	rand.Read(b)
	return hex.EncodeToString(b)
}
