package service

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"time"

	"github.com/agambondan/eduplay/services/api/config"
	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/google/uuid"
)

type SubscriptionResponse struct {
	ID          string `json:"id"`
	Plan        string `json:"plan"`
	Status      string `json:"status"`
	StartedAt   string `json:"started_at"`
	ExpiresAt   string `json:"expires_at"`
	RedirectURL string `json:"redirect_url,omitempty"`
	Token       string `json:"token,omitempty"`
}

type SubscriptionService interface {
	CreateSubscription(userID string) (*SubscriptionResponse, error)
	GetUserSubscription(userID string) (*SubscriptionResponse, error)
	CancelSubscription(userID string) error
	HandleMidtransWebhook(payload map[string]interface{}) error
}

type subscriptionService struct {
	cfg *config.Config
}

func NewSubscriptionService(cfg *config.Config) SubscriptionService {
	return &subscriptionService{cfg: cfg}
}

func (s *subscriptionService) isMockMode() bool {
	if s.cfg.Midtrans.ServerKey == "" {
		return true
	}
	val, err := database.RDB.Get(context.Background(), "feature:ENABLE_MOCK_PAYMENT").Result()
	if err != nil {
		return false
	}
	return val == "enabled"
}

func (s *subscriptionService) CreateSubscription(userID string) (*SubscriptionResponse, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, errors.New("ID pengguna tidak valid")
	}

	var existing model.Subscription
	if err := database.DB.Where("user_id = ? AND status = ?", uid, "active").First(&existing).Error; err == nil {
		return s.toResponse(&existing, ""), nil
	}

	if s.isMockMode() {
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
		return s.toResponse(&sub, ""), nil
	}

	orderID := "PREMIUM-" + uuid.New().String()[:8]
	token, redirectURL, err := s.createMidtransTransaction(orderID, uid)
	if err != nil {
		return nil, errors.New("Gagal memproses pembayaran")
	}

	now := time.Now()
	sub := model.Subscription{
		UserID:    uid,
		Plan:      "premium",
		Status:    "pending",
		StartedAt: now,
		ExpiresAt: now.AddDate(1, 0, 0),
	}
	if err := database.DB.Create(&sub).Error; err != nil {
		return nil, err
	}

	resp := s.toResponse(&sub, redirectURL)
	resp.Token = token
	return resp, nil
}

func (s *subscriptionService) createMidtransTransaction(orderID string, userID uuid.UUID) (string, string, error) {
	baseURL := "https://app.sandbox.midtrans.com/snap/v1/transactions"
	if s.cfg.Midtrans.IsProduction {
		baseURL = "https://app.midtrans.com/snap/v1/transactions"
	}

	var user model.User
	if err := database.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		return "", "", err
	}

	payload := map[string]interface{}{
		"transaction_details": map[string]interface{}{
			"order_id":     orderID,
			"gross_amount": 50000,
		},
		"credit_card": map[string]interface{}{
			"secure": true,
		},
		"customer_details": map[string]interface{}{
			"first_name": user.Username,
			"email":      user.Email,
		},
		"callbacks": map[string]interface{}{
			"finish": s.cfg.FrontendURL + "/profile?payment=success",
		},
	}

	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", baseURL, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	auth := base64.StdEncoding.EncodeToString([]byte(s.cfg.Midtrans.ServerKey + ":"))
	req.Header.Set("Authorization", "Basic "+auth)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	var result map[string]interface{}
	json.Unmarshal(respBody, &result)

	t, _ := result["token"].(string)
	r, _ := result["redirect_url"].(string)
	if t == "" || r == "" {
		return "", "", errors.New("midtrans: invalid response")
	}
	return t, r, nil
}

func (s *subscriptionService) GetUserSubscription(userID string) (*SubscriptionResponse, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, errors.New("ID pengguna tidak valid")
	}

	var sub model.Subscription
	if err := database.DB.Where("user_id = ?", uid).First(&sub).Error; err != nil {
		return nil, errors.New("Tidak ada langganan aktif")
	}

	if sub.Status == "active" && sub.ExpiresAt.Before(time.Now()) {
		database.DB.Model(&sub).Update("status", "expired")
		return nil, errors.New("Langganan sudah berakhir")
	}

	return s.toResponse(&sub, ""), nil
}

func (s *subscriptionService) CancelSubscription(userID string) error {
	uid, _ := uuid.Parse(userID)
	return database.DB.Model(&model.Subscription{}).Where("user_id = ?", uid).Update("status", "cancelled").Error
}

func (s *subscriptionService) HandleMidtransWebhook(payload map[string]interface{}) error {
	orderID, _ := payload["order_id"].(string)
	txnStatus, _ := payload["transaction_status"].(string)
	if orderID == "" || txnStatus == "" {
		return errors.New("invalid webhook payload")
	}

	if txnStatus == "settlement" || txnStatus == "capture" {
		database.DB.Model(&model.Subscription{}).
			Where("status = ?", "pending").
			Update("status", "active")
	}
	return nil
}

func (s *subscriptionService) toResponse(sub *model.Subscription, redirectURL string) *SubscriptionResponse {
	return &SubscriptionResponse{
		ID:          sub.ID.String(),
		Plan:        sub.Plan,
		Status:      sub.Status,
		StartedAt:   sub.StartedAt.Format(time.RFC3339),
		ExpiresAt:   sub.ExpiresAt.Format(time.RFC3339),
		RedirectURL: redirectURL,
	}
}
