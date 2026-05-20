package service

import (
	"time"

	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/google/uuid"
)

type SubscriptionResponse struct {
	ID        string    `json:"id"`
	Plan      string    `json:"plan"`
	Status    string    `json:"status"`
	StartedAt time.Time `json:"started_at"`
	ExpiresAt time.Time `json:"expires_at"`
}

type SubscriptionService interface {
	CreateSubscription(userID string) (*SubscriptionResponse, error)
	GetUserSubscription(userID string) (*SubscriptionResponse, error)
	CancelSubscription(userID string) error
}

type subscriptionService struct{}

func NewSubscriptionService() SubscriptionService {
	return &subscriptionService{}
}

func (s *subscriptionService) CreateSubscription(userID string) (*SubscriptionResponse, error) {
	uid, _ := uuid.Parse(userID)

	var existing model.Subscription
	if err := database.DB.Where("user_id = ?", uid).First(&existing).Error; err == nil {
		return s.toResponse(&existing), nil
	}

	now := time.Now()
	sub := model.Subscription{
		UserID:    uid,
		Plan:      "premium",
		Status:    "active",
		StartedAt: now,
		ExpiresAt: now.AddDate(1, 0, 0),
	}

	if err := database.DB.Create(&sub).Error; err != nil {
		return nil, err
	}

	return s.toResponse(&sub), nil
}

func (s *subscriptionService) GetUserSubscription(userID string) (*SubscriptionResponse, error) {
	uid, _ := uuid.Parse(userID)

	var sub model.Subscription
	if err := database.DB.Where("user_id = ?", uid).First(&sub).Error; err != nil {
		return nil, err
	}

	return s.toResponse(&sub), nil
}

func (s *subscriptionService) CancelSubscription(userID string) error {
	uid, _ := uuid.Parse(userID)
	return database.DB.Model(&model.Subscription{}).Where("user_id = ?", uid).Update("status", "cancelled").Error
}

func (s *subscriptionService) toResponse(sub *model.Subscription) *SubscriptionResponse {
	return &SubscriptionResponse{
		ID:        sub.ID.String(),
		Plan:      sub.Plan,
		Status:    sub.Status,
		StartedAt: sub.StartedAt,
		ExpiresAt: sub.ExpiresAt,
	}
}
