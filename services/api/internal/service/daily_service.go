package service

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/internal/repository"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/google/uuid"
)

type DailyChallengeResponse struct {
	ChallengeID   string           `json:"challenge_id"`
	Game          *model.Game      `json:"game"`
	Questions     []map[string]interface{} `json:"questions"`
	ExpiresAt     time.Time        `json:"expires_at"`
	UserSubmitted bool             `json:"user_submitted"`
}

type DailySubmitResponse struct {
	XPEarned             int  `json:"xp_earned"`
	StreakUpdated        bool `json:"streak_updated"`
	AchievementsUnlocked bool `json:"achievements_unlocked"`
}

type DailyHistoryItem struct {
	Date      string `json:"date"`
	GameName  string `json:"game_name"`
	Score     int    `json:"score"`
	Completed bool   `json:"completed"`
}

type DailyHistoryResponse struct {
	History []DailyHistoryItem `json:"history"`
	Streak  int                `json:"streak"`
	Total   int                `json:"total"`
}

type DailyService interface {
	GetTodayChallenge(userID string) (*DailyChallengeResponse, error)
	SubmitChallenge(userID string, challengeID string, score int) (*DailySubmitResponse, error)
	GetHistory(userID string) (*DailyHistoryResponse, error)
}

type dailyService struct {
	gameRepo repository.GameRepository
	achSvc   interface {
		CheckAndUnlock(userID string, slug string) (bool, error)
		CheckDailyCount(userID string) error
	}
}

func NewDailyService(gameRepo repository.GameRepository, achSvc interface {
	CheckAndUnlock(userID string, slug string) (bool, error)
	CheckDailyCount(userID string) error
}) DailyService {
	return &dailyService{gameRepo: gameRepo, achSvc: achSvc}
}

func (s *dailyService) GetTodayChallenge(userID string) (*DailyChallengeResponse, error) {
	today := time.Now().Format("2006-01-02")
	ctx := context.Background()
	cacheKey := "daily:challenge:" + today

	var dc model.DailyChallenge
	val, _ := database.RDB.Get(ctx, cacheKey).Result()
	if val != "" {
		json.Unmarshal([]byte(val), &dc)
	} else {
		err := database.DB.Where("challenge_date = ?", today).First(&dc).Error
		if err != nil {
			return nil, errors.New("no challenge for today")
		}
		data, _ := json.Marshal(dc)
		database.RDB.Set(ctx, cacheKey, data, 24*time.Hour)
	}

	var game model.Game
	if err := database.DB.Where("id = ?", dc.GameID).First(&game).Error; err != nil {
		return nil, errors.New("game not found")
	}

	var questions []map[string]interface{}
	json.Unmarshal([]byte(dc.QuestionsJSON), &questions)

	userSubmitted := false
	if userID != "" {
		uid, _ := uuid.Parse(userID)
		var sub model.DailySubmission
		if err := database.DB.Where("user_id = ? AND challenge_id = ?", uid, dc.ID).First(&sub).Error; err == nil {
			userSubmitted = true
		}
	}

	expiresAt := time.Date(dc.ChallengeDate.Year(), dc.ChallengeDate.Month(), dc.ChallengeDate.Day(), 23, 59, 59, 0, time.UTC)

	return &DailyChallengeResponse{
		ChallengeID:   dc.ID.String(),
		Game:          &game,
		Questions:     questions,
		ExpiresAt:     expiresAt,
		UserSubmitted: userSubmitted,
	}, nil
}

func (s *dailyService) SubmitChallenge(userID string, challengeID string, score int) (*DailySubmitResponse, error) {
	uid, _ := uuid.Parse(userID)
	cid, _ := uuid.Parse(challengeID)

	var sub model.DailySubmission
	err := database.DB.Where("user_id = ? AND challenge_id = ?", uid, cid).First(&sub).Error
	if err == nil {
		return nil, errors.New("already submitted today")
	}

	submission := model.DailySubmission{
		UserID:      uid,
		ChallengeID: cid,
		Score:       score,
		CompletedAt: time.Now(),
	}

	if err := database.DB.Create(&submission).Error; err != nil {
		return nil, err
	}

	xp := (score / 10) * 2

	var u model.User
	streakUpdated := false
	if err := database.DB.Where("id = ?", userID).First(&u).Error; err == nil {
		now := time.Now()
		if u.LastActive == nil || now.Truncate(24*time.Hour).Sub(u.LastActive.Truncate(24*time.Hour)).Hours()/24 >= 1 {
			u.Streak++
			streakUpdated = true
		}
		u.XP += xp
		u.Level = model.LevelFromXP(u.XP)
		u.LastActive = &now
		database.DB.Save(&u)
	}

	achievementsUnlocked := false
	if s.achSvc != nil {
		if u.Streak >= 3 {
			unlocked, _ := s.achSvc.CheckAndUnlock(userID, "streak-3")
			if unlocked {
				achievementsUnlocked = true
			}
		}
		if u.Streak >= 7 {
			unlocked, _ := s.achSvc.CheckAndUnlock(userID, "streak-7")
			if unlocked {
				achievementsUnlocked = true
			}
		}
		if u.Streak >= 30 {
			unlocked, _ := s.achSvc.CheckAndUnlock(userID, "streak-30")
			if unlocked {
				achievementsUnlocked = true
			}
		}
		unlocked, _ := s.achSvc.CheckAndUnlock(userID, "first-game")
		if unlocked {
			achievementsUnlocked = true
		}
		s.achSvc.CheckDailyCount(userID)
	}

	return &DailySubmitResponse{
		XPEarned:            xp,
		StreakUpdated:       streakUpdated,
		AchievementsUnlocked: achievementsUnlocked,
	}, nil
}

func (s *dailyService) GetHistory(userID string) (*DailyHistoryResponse, error) {
	uid, _ := uuid.Parse(userID)

	var subs []model.DailySubmission
	if err := database.DB.Where("user_id = ?", uid).Order("completed_at desc").Find(&subs).Error; err != nil {
		return nil, err
	}

	var items []DailyHistoryItem
	for _, sub := range subs {
		var dc model.DailyChallenge
		if err := database.DB.Where("id = ?", sub.ChallengeID).First(&dc).Error; err != nil {
			continue
		}
		var game model.Game
		if err := database.DB.Where("id = ?", dc.GameID).First(&game).Error; err != nil {
			continue
		}
		items = append(items, DailyHistoryItem{
			Date:      dc.ChallengeDate.Format("2006-01-02"),
			GameName:  game.Name,
			Score:     sub.Score,
			Completed: true,
		})
	}

	var u model.User
	streak := 0
	if err := database.DB.Where("id = ?", userID).First(&u).Error; err == nil {
		streak = u.Streak
	}

	return &DailyHistoryResponse{
		History: items,
		Streak:  streak,
		Total:   len(items),
	}, nil
}
