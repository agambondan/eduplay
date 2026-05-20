package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/agambondan/eduplay/services/api/pkg/database"
)

func key(prefix, id string) string {
	return fmt.Sprintf("cache:%s:%s", prefix, id)
}

func Get[T any](ctx context.Context, prefix, id string) (*T, error) {
	val, err := database.RDB.Get(ctx, key(prefix, id)).Result()
	if err != nil {
		return nil, err
	}
	var data T
	if err := json.Unmarshal([]byte(val), &data); err != nil {
		return nil, err
	}
	return &data, nil
}

func Set[T any](ctx context.Context, prefix, id string, data *T, ttl time.Duration) error {
	bytes, err := json.Marshal(data)
	if err != nil {
		return err
	}
	return database.RDB.Set(ctx, key(prefix, id), bytes, ttl).Err()
}

func Del(ctx context.Context, prefix, id string) error {
	return database.RDB.Del(ctx, key(prefix, id)).Err()
}

func DelByPrefix(ctx context.Context, prefix string) error {
	iter := database.RDB.Scan(ctx, 0, fmt.Sprintf("cache:%s:*", prefix), 0).Iterator()
	for iter.Next(ctx) {
		database.RDB.Del(ctx, iter.Val())
	}
	return iter.Err()
}

func GetOrSet[T any](ctx context.Context, prefix, id string, ttl time.Duration, fn func() (*T, error)) (*T, error) {
	cached, err := Get[T](ctx, prefix, id)
	if err == nil {
		return cached, nil
	}
	data, err := fn()
	if err != nil {
		return nil, err
	}
	if err := Set(ctx, prefix, id, data, ttl); err != nil {
		return nil, err
	}
	return data, nil
}
