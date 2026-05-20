package service

import (
	"errors"
	"time"

	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type FriendResponse struct {
	ID          string     `json:"id"`
	Username    string     `json:"username"`
	Status      string     `json:"status"`
	AvatarColor string     `json:"avatar_color"`
	Level       int        `json:"level"`
	XP          int        `json:"xp"`
	Streak      int        `json:"streak"`
	LastActive  *time.Time `json:"last_active"`
}

type SearchUserResult struct {
	ID          string `json:"id"`
	Username    string `json:"username"`
	AvatarColor string `json:"avatar_color"`
	Level       int    `json:"level"`
	XP          int    `json:"xp"`
}

type FriendService interface {
	SendRequest(userID, friendUsername string) error
	AcceptRequest(userID, friendID string) error
	DeclineRequest(userID, friendID string) error
	ListFriends(userID string) ([]FriendResponse, error)
	ListRequests(userID string) ([]FriendResponse, error)
	RemoveFriend(userID, friendID string) error
	SearchUsers(userID, query string) ([]SearchUserResult, error)
}

type friendService struct{}

func NewFriendService() FriendService {
	return &friendService{}
}

func (s *friendService) SendRequest(userID, friendUsername string) error {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return errors.New("ID pengguna tidak valid")
	}

	var friend model.User
	if err := database.DB.Where("username = ?", friendUsername).First(&friend).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("Pengguna tidak ditemukan")
		}
		return err
	}

	if friend.ID == uid {
		return errors.New("Tidak bisa mengirim permintaan pertemanan ke diri sendiri")
	}

	var existing model.Friend
	err = database.DB.Where(
		"(user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)",
		uid, friend.ID, friend.ID, uid,
	).First(&existing).Error

	if err == nil {
		if existing.Status == "accepted" {
			return errors.New("Kalian sudah berteman")
		}
		if existing.Status == "pending" {
			return errors.New("Permintaan pertemanan sudah dikirim")
		}
		if existing.Status == "declined" {
			existing.Status = "pending"
			existing.ID = uuid.Nil
			return database.DB.Create(&existing).Error
		}
	}

	f := model.Friend{
		UserID:   uid,
		FriendID: friend.ID,
		Status:   "pending",
	}
	return database.DB.Create(&f).Error
}

func (s *friendService) AcceptRequest(userID, friendID string) error {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return errors.New("ID pengguna tidak valid")
	}
	fid, err := uuid.Parse(friendID)
	if err != nil {
		return errors.New("ID teman tidak valid")
	}

	var f model.Friend
	if err := database.DB.Where("user_id = ? AND friend_id = ? AND status = ?", fid, uid, "pending").First(&f).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("Permintaan pertemanan tidak ditemukan")
		}
		return err
	}

	return database.DB.Model(&f).Update("status", "accepted").Error
}

func (s *friendService) DeclineRequest(userID, friendID string) error {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return errors.New("ID pengguna tidak valid")
	}
	fid, err := uuid.Parse(friendID)
	if err != nil {
		return errors.New("ID teman tidak valid")
	}

	var f model.Friend
	if err := database.DB.Where("user_id = ? AND friend_id = ? AND status = ?", fid, uid, "pending").First(&f).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("Permintaan pertemanan tidak ditemukan")
		}
		return err
	}

	return database.DB.Model(&f).Update("status", "declined").Error
}

func (s *friendService) ListFriends(userID string) ([]FriendResponse, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, errors.New("ID pengguna tidak valid")
	}

	var rows []struct {
		FriendID    uuid.UUID
		Username    string
		AvatarColor string
		Level       int
		XP          int
		Streak      int
		LastActive  *time.Time
	}

	err = database.DB.Table("friends").
		Select(`CASE WHEN friends.user_id = ? THEN friends.friend_id ELSE friends.user_id END AS friend_id,
			users.username, users.avatar_color, users.level, users.xp, users.streak, users.last_active`, uid).
		Joins("JOIN users ON users.id = CASE WHEN friends.user_id = ? THEN friends.friend_id ELSE friends.user_id END", uid).
		Where("(friends.user_id = ? OR friends.friend_id = ?) AND friends.status = ?", uid, uid, "accepted").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	result := make([]FriendResponse, len(rows))
	for i, r := range rows {
		result[i] = FriendResponse{
			ID:          r.FriendID.String(),
			Username:    r.Username,
			Status:      "accepted",
			AvatarColor: r.AvatarColor,
			Level:       r.Level,
			XP:          r.XP,
			Streak:      r.Streak,
			LastActive:  r.LastActive,
		}
	}
	return result, nil
}

func (s *friendService) ListRequests(userID string) ([]FriendResponse, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, errors.New("ID pengguna tidak valid")
	}

	var rows []struct {
		ID          uuid.UUID
		Username    string
		AvatarColor string
		Level       int
		XP          int
		Streak      int
		LastActive  *time.Time
	}

	err = database.DB.Table("friends").
		Select("friends.id, users.username, users.avatar_color, users.level, users.xp, users.streak, users.last_active").
		Joins("JOIN users ON users.id = friends.user_id").
		Where("friends.friend_id = ? AND friends.status = ?", uid, "pending").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	result := make([]FriendResponse, len(rows))
	for i, r := range rows {
		result[i] = FriendResponse{
			ID:          r.ID.String(),
			Username:    r.Username,
			Status:      "pending",
			AvatarColor: r.AvatarColor,
			Level:       r.Level,
			XP:          r.XP,
			Streak:      r.Streak,
			LastActive:  r.LastActive,
		}
	}
	return result, nil
}

func (s *friendService) RemoveFriend(userID, friendID string) error {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return errors.New("ID pengguna tidak valid")
	}
	fid, err := uuid.Parse(friendID)
	if err != nil {
		return errors.New("ID teman tidak valid")
	}

	result := database.DB.Where(
		"(user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)",
		uid, fid, fid, uid,
	).Delete(&model.Friend{})

	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("Pertemanan tidak ditemukan")
	}
	return nil
}

func (s *friendService) SearchUsers(userID, query string) ([]SearchUserResult, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, errors.New("ID pengguna tidak valid")
	}

	var users []model.User
	if err := database.DB.Where("username ILIKE ? AND id != ?", query+"%", uid).
		Limit(10).Find(&users).Error; err != nil {
		return nil, err
	}

	result := make([]SearchUserResult, len(users))
	for i, u := range users {
		result[i] = SearchUserResult{
			ID:          u.ID.String(),
			Username:    u.Username,
			AvatarColor: u.AvatarColor,
			Level:       u.Level,
			XP:          u.XP,
		}
	}
	return result, nil
}
