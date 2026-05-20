package service

import (
	"context"
	"errors"
	"time"

	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/internal/repository"
	"github.com/agambondan/eduplay/services/api/pkg/cache"
	"github.com/agambondan/eduplay/services/api/pkg/profanity"
)

type UserService interface {
	GetProfile(id string) (*model.User, error)
	UpdateProfile(id string, username string) (*model.User, error)
	GetStats(id string) (*repository.Stats, error)
	UpdateStreak(id string) error
}

type userService struct {
	repo repository.UserRepository
}

func NewUserService(repo repository.UserRepository) UserService {
	return &userService{repo: repo}
}

func (s *userService) GetProfile(id string) (*model.User, error) {
	ctx := context.Background()
	return cache.GetOrSet(ctx, "user_profile", id, 30*time.Second, func() (*model.User, error) {
		return s.repo.FindByID(id)
	})
}

func (s *userService) UpdateProfile(id string, username string) (*model.User, error) {
	filter := profanity.NewFilter()
	if !filter.IsClean(username) {
		return nil, errors.New("Username mengandung kata yang tidak pantas")
	}

	u, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	u.Username = username
	if err := s.repo.Update(u); err != nil {
		return nil, err
	}
	ctx := context.Background()
	cache.Del(ctx, "user_profile", id)
	return u, nil
}

func (s *userService) GetStats(id string) (*repository.Stats, error) {
	ctx := context.Background()
	return cache.GetOrSet(ctx, "user_stats", id, 30*time.Second, func() (*repository.Stats, error) {
		return s.repo.GetStats(id)
	})
}

func (s *userService) UpdateStreak(id string) error {
	return s.repo.UpdateStreak(id)
}
