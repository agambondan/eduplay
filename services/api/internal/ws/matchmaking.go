package ws

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/agambondan/eduplay/services/api/pkg/database"
)

type MatchmakingService struct {
	hub    *Hub
	queues sync.Map
}

func NewMatchmakingService(hub *Hub) *MatchmakingService {
	return &MatchmakingService{hub: hub}
}

func (m *MatchmakingService) getUserSkill(userID, gameSlug string) int {
	var avgScore float64
	database.DB.Raw(`
		SELECT COALESCE(AVG(gs.score), 0)
		FROM game_sessions gs
		JOIN games g ON g.id = gs.game_id
		WHERE gs.user_id = ? AND g.slug = ?
	`, userID, gameSlug).Scan(&avgScore)
	return int(avgScore)
}

func (m *MatchmakingService) JoinQueue(userID, gameSlug, difficulty string) (*MatchResult, error) {
	ctx := context.Background()
	skill := m.getUserSkill(userID, gameSlug)

	entry := MatchmakingEntry{
		UserID:     userID,
		GameSlug:   gameSlug,
		Difficulty: difficulty,
		Skill:      skill,
		JoinedAt:   time.Now(),
	}

	queueKey := fmt.Sprintf("matchmaking:%s:%s", gameSlug, difficulty)

	data, _ := json.Marshal(entry)

	database.RDB.Set(ctx, fmt.Sprintf("matchmaking:entry:%s:%s", gameSlug, userID), data, 30*time.Second)

	resultChan := make(chan *MatchResult, 1)

	m.queues.Store(userID, resultChan)

	go m.waitForMatch(ctx, userID, gameSlug, difficulty, queueKey, resultChan)

	select {
	case result := <-resultChan:
		m.queues.Delete(userID)
		return result, nil
	case <-time.After(10 * time.Second):
		m.queues.Delete(userID)
		m.removeFromQueue(ctx, queueKey, userID)
		return &MatchResult{
			Status:     "timeout",
			RoomID:     fmt.Sprintf("math_battle:%s", difficulty),
			BotOptions: []string{"easy", "medium", "hard"},
		}, nil
	}
}

func (m *MatchmakingService) waitForMatch(ctx context.Context, userID, gameSlug, difficulty, queueKey string, resultChan chan<- *MatchResult) {
	database.RDB.LPush(ctx, queueKey, userID)

	mySkill := m.getUserSkill(userID, gameSlug)
	skillRange := 50

	for i := 0; i < 10; i++ {
		time.Sleep(1 * time.Second)

		users, _ := database.RDB.LRange(ctx, queueKey, 0, -1).Result()
		for _, opponent := range users {
			if opponent == userID {
				continue
			}

			oppEntry, _ := database.RDB.Get(ctx, fmt.Sprintf("matchmaking:entry:%s:%s", gameSlug, opponent)).Result()
			if oppEntry == "" {
				continue
			}
			var opp MatchmakingEntry
			json.Unmarshal([]byte(oppEntry), &opp)

			skillDiff := mySkill - opp.Skill
			if skillDiff < 0 {
				skillDiff = -skillDiff
			}
			if skillDiff > skillRange {
				continue
			}

			lockKey := fmt.Sprintf("matchmaking:lock:%s:%s", gameSlug, userID)
			locked, _ := database.RDB.SetNX(ctx, lockKey, opponent, 5*time.Second).Result()
			if !locked {
				continue
			}

			m.removeFromQueue(ctx, queueKey, userID)
			m.removeFromQueue(ctx, queueKey, opponent)

			database.RDB.Del(ctx, fmt.Sprintf("matchmaking:entry:%s:%s", gameSlug, userID))
			database.RDB.Del(ctx, fmt.Sprintf("matchmaking:entry:%s:%s", gameSlug, opponent))

			roomID := fmt.Sprintf("math_battle:%s", difficulty)
			resultChan <- &MatchResult{
				MatchID:    roomID,
				RoomID:     roomID,
				OpponentID: opponent,
				OpponentName: m.getUsername(opponent),
			}
			return
		}

		if i >= 3 && i < 6 {
			skillRange = 150
		} else if i >= 6 {
			skillRange = 500
		}
	}

	m.removeFromQueue(ctx, queueKey, userID)
}

func (m *MatchmakingService) removeFromQueue(ctx context.Context, queueKey, userID string) {
	database.RDB.LRem(ctx, queueKey, 0, userID)
}

func (m *MatchmakingService) CancelQueue(userID, gameSlug string) {
	ctx := context.Background()
	database.RDB.Del(ctx, fmt.Sprintf("matchmaking:entry:%s:%s", gameSlug, userID))

	m.queues.Delete(userID)

	keys, _ := database.RDB.Keys(ctx, fmt.Sprintf("matchmaking:%s:*", gameSlug)).Result()
	for _, key := range keys {
		database.RDB.LRem(ctx, key, 0, userID)
	}
}

type MatchmakingEntry struct {
	UserID     string    `json:"user_id"`
	GameSlug   string    `json:"game_slug"`
	Difficulty string    `json:"difficulty"`
	Skill      int       `json:"skill"`
	JoinedAt   time.Time `json:"joined_at"`
}

type MatchResult struct {
	MatchID      string   `json:"match_id"`
	RoomID       string   `json:"room_id"`
	OpponentID   string   `json:"opponent_id,omitempty"`
	OpponentName string   `json:"opponent_name,omitempty"`
	Status       string   `json:"status,omitempty"`
	BotOptions   []string `json:"bot_options,omitempty"`
}

func (m *MatchmakingService) getUsername(userID string) string {
	type user struct {
		Username string
	}
	var u user
	database.DB.Raw("SELECT username FROM users WHERE id = ?", userID).Scan(&u)
	return u.Username
}
