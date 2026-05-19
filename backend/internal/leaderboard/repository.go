package leaderboard

import (
	"context"
	"strconv"

	"github.com/agambondan/eduplay/backend/pkg/database"
	"github.com/redis/go-redis/v9"
)

type Entry struct {
	Rank     int    `json:"rank"`
	UserID   string `json:"user_id"`
	Username string `json:"username"`
	Score    int    `json:"score"`
}

type Repository interface {
	AddScore(key string, userID string, score float64) error
	GetTopN(key string, n int64) ([]redis.Z, error)
	GetUserRank(key string, userID string) (int64, error)
}

type repository struct{}

func NewRepository() Repository {
	return &repository{}
}

func (r *repository) AddScore(key string, userID string, score float64) error {
	ctx := context.Background()
	return database.RDB.ZAdd(ctx, key, redis.Z{Score: score, Member: userID}).Err()
}

func (r *repository) GetTopN(key string, n int64) ([]redis.Z, error) {
	ctx := context.Background()
	return database.RDB.ZRevRangeWithScores(ctx, key, 0, n-1).Result()
}

func (r *repository) GetUserRank(key string, userID string) (int64, error) {
	ctx := context.Background()
	rank, err := database.RDB.ZRevRank(ctx, key, userID).Result()
	if err != nil {
		return -1, err
	}
	return rank + 1, nil
}

func ParseScore(z redis.Z) (string, int) {
	uid := z.Member.(string)
	score, _ := strconv.Atoi(strconv.FormatFloat(z.Score, 'f', 0, 64))
	return uid, score
}
