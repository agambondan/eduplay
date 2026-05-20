package service

import (
	"encoding/base64"
	"strconv"
	"time"

	"github.com/SherClockHolmes/webpush-go"
	"github.com/agambondan/eduplay/services/api/config"
	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/agambondan/eduplay/services/api/pkg/logger"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type PushSubscriptionRequest struct {
	Endpoint  string `json:"endpoint" validate:"required"`
	P256DHKey string `json:"p256dh_key" validate:"required"`
	AuthKey   string `json:"auth_key" validate:"required"`
}

type PushService struct {
	cfg *config.Config
}

func NewPushService(cfg *config.Config) *PushService {
	return &PushService{cfg: cfg}
}

func (s *PushService) Subscribe(userID string, req PushSubscriptionRequest) error {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return err
	}

	sub := model.PushSubscription{
		UserID:    uid,
		Endpoint:  req.Endpoint,
		P256DHKey: req.P256DHKey,
		AuthKey:   req.AuthKey,
	}

	database.DB.Where("user_id = ?", uid).Delete(&model.PushSubscription{})
	return database.DB.Create(&sub).Error
}

func (s *PushService) Unsubscribe(userID string) error {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return err
	}
	return database.DB.Where("user_id = ?", uid).Delete(&model.PushSubscription{}).Error
}

func (s *PushService) SendToUser(userID uuid.UUID, title, body, url string) {
	var subs []model.PushSubscription
	database.DB.Where("user_id = ?", userID).Find(&subs)
	for _, sub := range subs {
		s.sendPush(sub, title, body, url)
	}
}

func (s *PushService) SendToAll(title, body, url string) {
	var subs []model.PushSubscription
	database.DB.Find(&subs)
	for _, sub := range subs {
		s.sendPush(sub, title, body, url)
	}
}

func (s *PushService) sendPush(sub model.PushSubscription, title, body, url string) {
	sDec, _ := base64.URLEncoding.DecodeString(sub.P256DHKey)
	aDec, _ := base64.URLEncoding.DecodeString(sub.AuthKey)

	subscriber := webpush.Subscription{
		Endpoint: sub.Endpoint,
		Keys: webpush.Keys{
			P256dh: string(sDec),
			Auth:   string(aDec),
		},
	}

	payload := `{"title":"` + title + `","body":"` + body + `","icon":"/icons/icon-192x192.png","data":{"url":"` + url + `"}}`

	_, err := webpush.SendNotification([]byte(payload), &subscriber, &webpush.Options{
		Subscriber:      "admin@eduplay.id",
		VAPIDPublicKey:  s.cfg.VAPID.PublicKey,
		VAPIDPrivateKey: s.cfg.VAPID.PrivateKey,
		TTL:             86400,
	})
	if err != nil {
		logger.Log.Warn("push notification failed", zap.Error(err), zap.String("endpoint", sub.Endpoint))
	}
}

func SendDailyPushReminders(cfg *config.Config) {
	pushSvc := NewPushService(cfg)

	var users []model.User
	today := time.Now().Format("2006-01-02")
	database.DB.Where("last_active IS NULL OR last_active != ?", today).Find(&users)

	for _, u := range users {
		pushSvc.SendToUser(u.ID, "Daily Challenge EduPlay", "Ayo main daily challenge hari ini! Bonus XP 2x!", "/daily")
	}
	logger.Log.Info("push reminders sent", zap.Int("count", len(users)))
}

func SendStreakAlertPush(cfg *config.Config) {
	pushSvc := NewPushService(cfg)

	var users []model.User
	today := time.Now().Format("2006-01-02")
	database.DB.Where("streak >= 3 AND (last_active IS NULL OR last_active != ?)", today).Find(&users)

	for _, u := range users {
		msg := "Kamu sudah mencapai streak " + strconv.Itoa(u.Streak) + " hari. Ayo main sekarang!"
		pushSvc.SendToUser(u.ID, "Streak mau putus!", msg, "/")
	}
}
