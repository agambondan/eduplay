package database

import (
    "context"
    "github.com/agambondan/eduplay/services/api/config"
    "github.com/agambondan/eduplay/services/api/pkg/logger"
    "github.com/redis/go-redis/v9"
)

var RDB *redis.Client

func ConnectRedis(cfg *config.Config) {
    opt, err := redis.ParseURL(cfg.Redis.URL)
    if err != nil {
        logger.Log.Fatal("Invalid redis URL")
    }

    RDB = redis.NewClient(opt)

    ctx := context.Background()
    _, err = RDB.Ping(ctx).Result()
    if err != nil {
        logger.Log.Fatal("Failed to connect to redis")
    }
}
