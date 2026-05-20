package service

import (
	"context"
	"testing"

	"github.com/agambondan/eduplay/services/api/config"
	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/internal/repository"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestDB() {
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		panic("failed to connect database")
	}
	db.AutoMigrate(&model.User{})
	database.DB = db

	mr, err := miniredis.Run()
	if err != nil {
		panic(err)
	}
	database.RDB = redis.NewClient(&redis.Options{
		Addr: mr.Addr(),
	})
}

func getTestConfig() *config.Config {
	cfg := &config.Config{}
	cfg.JWT.Secret = "testsecret"
	cfg.JWT.AccessExpiry = "15m"
	cfg.JWT.RefreshExpiry = "24h"
	return cfg
}

func TestAuthService_Register(t *testing.T) {
	setupTestDB()
	svc := NewAuthService(getTestConfig(), repository.NewUserRepository(), &mockAchievement{})

	req := RegisterRequest{
		Username: "testuser",
		Email:    "test@example.com",
		Password: "password123",
	}

	resp, err := svc.Register(req)
	require.NoError(t, err)
	assert.NotEmpty(t, resp.AccessToken)
	assert.NotEmpty(t, resp.RefreshToken)
	assert.Equal(t, "testuser", resp.User.Username)
	assert.Equal(t, "test@example.com", resp.User.Email)

	_, err = svc.Register(req)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "already exists")
}

func TestAuthService_Login(t *testing.T) {
	setupTestDB()
	svc := NewAuthService(getTestConfig(), repository.NewUserRepository(), &mockAchievement{})

	req := RegisterRequest{
		Username: "loginuser",
		Email:    "login@example.com",
		Password: "password123",
	}
	_, err := svc.Register(req)
	require.NoError(t, err)

	loginReq := LoginRequest{
		Email:    "login@example.com",
		Password: "password123",
	}
	resp, err := svc.Login(loginReq)
	require.NoError(t, err)
	assert.NotEmpty(t, resp.AccessToken)
	assert.Equal(t, "loginuser", resp.User.Username)

	wrongReq := LoginRequest{
		Email:    "login@example.com",
		Password: "wrongpassword",
	}
	_, err = svc.Login(wrongReq)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid credentials")
}

func TestAuthService_Logout(t *testing.T) {
	setupTestDB()
	svc := NewAuthService(getTestConfig(), repository.NewUserRepository(), &mockAchievement{})

	err := svc.Logout("test-jti-123", 1000)
	require.NoError(t, err)

	val, err := database.RDB.Get(context.Background(), "jwt:blacklist:test-jti-123").Result()
	require.NoError(t, err)
	assert.Equal(t, "revoked", val)
}
