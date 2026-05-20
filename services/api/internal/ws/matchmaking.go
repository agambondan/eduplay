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

func (m *MatchmakingService) JoinQueue(userID, gameSlug, difficulty string) (*MatchResult, error) {
	ctx := context.Background()
	queueKey := fmt.Sprintf("matchmaking:%s:%s", gameSlug, difficulty)

	entry := MatchmakingEntry{
		UserID:     userID,
		GameSlug:   gameSlug,
		Difficulty: difficulty,
		JoinedAt:   time.Now(),
	}
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

	for i := 0; i < 10; i++ {
		time.Sleep(1 * time.Second)

		users, _ := database.RDB.LRange(ctx, queueKey, 0, -1).Result()
		for _, u := range users {
			if u != userID {
				m.removeFromQueue(ctx, queueKey, userID)
				m.removeFromQueue(ctx, queueKey, u)

				database.RDB.Del(ctx, fmt.Sprintf("matchmaking:entry:%s:%s", gameSlug, userID))
				database.RDB.Del(ctx, fmt.Sprintf("matchmaking:entry:%s:%s", gameSlug, u))

				roomID := fmt.Sprintf("math_battle:%s", difficulty)
				resultChan <- &MatchResult{
					MatchID:    roomID,
					RoomID:     roomID,
					OpponentID: u,
					OpponentName: m.getUsername(u),
				}
				return
			}
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

	if ch, ok := m.queues.Load(userID); ok {
		close(ch.(chan *MatchResult))
		m.queues.Delete(userID)
	}

	keys, _ := database.RDB.Keys(ctx, fmt.Sprintf("matchmaking:%s:*", gameSlug)).Result()
	for _, key := range keys {
		database.RDB.LRem(ctx, key, 0, userID)
	}
}

type MatchmakingEntry struct {
	UserID     string    `json:"user_id"`
	GameSlug   string    `json:"game_slug"`
	Difficulty string    `json:"difficulty"`
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
