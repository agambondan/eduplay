package ws

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/agambondan/eduplay/services/api/pkg/database"
)

type MatchmakingEntry struct {
	UserID     string    `json:"user_id"`
	GameSlug   string    `json:"game_slug"`
	Difficulty string    `json:"difficulty"`
	JoinedAt   time.Time `json:"joined_at"`
}

type MatchmakingService struct {
	hub *Hub
}

func NewMatchmakingService(hub *Hub) *MatchmakingService {
	return &MatchmakingService{hub: hub}
}

const matchmakingTimeout = 10 * time.Second

func (m *MatchmakingService) JoinQueue(userID, gameSlug, difficulty string) (*MatchResult, error) {
	ctx := context.Background()
	queueKey := fmt.Sprintf("matchmaking:%s:%s", gameSlug, difficulty)
	entryKey := fmt.Sprintf("matchmaking:entry:%s:%s", gameSlug, userID)

	entry := MatchmakingEntry{
		UserID:     userID,
		GameSlug:   gameSlug,
		Difficulty: difficulty,
		JoinedAt:   time.Now(),
	}
	data, _ := json.Marshal(entry)

	database.RDB.Set(ctx, entryKey, data, 30*time.Second)
	database.RDB.LPush(ctx, queueKey, userID)

	opponentID, err := m.findOpponent(ctx, queueKey, userID, difficulty)
	if err == nil && opponentID != "" {
		m.removeFromQueue(ctx, queueKey, userID)
		m.removeFromQueue(ctx, queueKey, opponentID)
		database.RDB.Del(ctx, entryKey)
		database.RDB.Del(ctx, fmt.Sprintf("matchmaking:entry:%s:%s", gameSlug, opponentID))

		roomID := fmt.Sprintf("math_battle:%s", difficulty)

		return &MatchResult{
			MatchID:    roomID,
			RoomID:     roomID,
			OpponentID: opponentID,
			OpponentName: m.getUsername(opponentID),
		}, nil
	}

	return &MatchResult{
		Status:     "timeout",
		RoomID:     fmt.Sprintf("math_battle:%s", difficulty),
		BotOptions: []string{"easy", "medium", "hard"},
	}, nil
}

func (m *MatchmakingService) findOpponent(ctx context.Context, queueKey, userID, difficulty string) (string, error) {
	for i := 0; i < 10; i++ {
		time.Sleep(1 * time.Second)
		users, _ := database.RDB.LRange(ctx, queueKey, 0, -1).Result()
		for _, u := range users {
			if u != userID {
				return u, nil
			}
		}
	}
	return "", fmt.Errorf("no opponent found")
}

func (m *MatchmakingService) removeFromQueue(ctx context.Context, queueKey, userID string) {
	database.RDB.LRem(ctx, queueKey, 0, userID)
}

func (m *MatchmakingService) CancelQueue(userID, gameSlug string) {
	ctx := context.Background()
	database.RDB.Del(ctx, fmt.Sprintf("matchmaking:entry:%s:%s", gameSlug, userID))

	keys, _ := database.RDB.Keys(ctx, fmt.Sprintf("matchmaking:%s:*", gameSlug)).Result()
	for _, key := range keys {
		database.RDB.LRem(ctx, key, 0, userID)
	}
}

func (m *MatchmakingService) getUsername(userID string) string {
	type user struct {
		Username string
	}
	var u user
	database.DB.Raw("SELECT username FROM users WHERE id = ?", userID).Scan(&u)
	return u.Username
}

type MatchResult struct {
	MatchID      string   `json:"match_id"`
	RoomID       string   `json:"room_id"`
	OpponentID   string   `json:"opponent_id,omitempty"`
	OpponentName string   `json:"opponent_name,omitempty"`
	Status       string   `json:"status,omitempty"`
	BotOptions   []string `json:"bot_options,omitempty"`
}
