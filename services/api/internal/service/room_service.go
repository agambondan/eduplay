package service

import (
	"context"
	"encoding/json"
	"errors"
	"math/rand"
	"time"

	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/google/uuid"
)

type RoomService interface {
	CreateRoom(hostID, gameSlug string, settings RoomSettingsInput) (*RoomResponse, error)
	GetRoom(roomCode string) (*RoomDetailResponse, error)
	JoinRoom(roomCode, userID string) (*RoomResponse, error)
	LeaveRoom(roomCode, userID string) error
	StartRoom(roomCode, userID string) error
	KickPlayer(roomCode, hostID, targetID string) error
}

type RoomSettingsInput struct {
	Questions   int    `json:"questions"`
	Category    string `json:"category"`
	Timer       int    `json:"timer"`
	MaxPlayers  int    `json:"max_players"`
	AllowBots   bool   `json:"allow_bots"`
}

type RoomMember struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Level    int    `json:"level"`
	IsHost   bool   `json:"is_host"`
}

type RoomData struct {
	RoomCode  string       `json:"room_code"`
	GameSlug  string       `json:"game_slug"`
	HostID    string       `json:"host_id"`
	Members   []RoomMember `json:"members"`
	Settings  RoomSettingsInput `json:"settings"`
	Status    string       `json:"status"`
	CreatedAt time.Time    `json:"created_at"`
}

type RoomResponse struct {
	RoomCode  string            `json:"room_code"`
	GameSlug  string            `json:"game_slug"`
	HostID    string            `json:"host_id"`
	Members   []RoomMember      `json:"members"`
	Settings  RoomSettingsInput `json:"settings"`
	Status    string            `json:"status"`
	ExpiresAt string            `json:"expires_at"`
}

type RoomDetailResponse struct {
	RoomResponse
	GameName string `json:"game_name"`
}

type roomService struct{}

func NewRoomService() RoomService {
	return &roomService{}
}

func (s *roomService) CreateRoom(hostID, gameSlug string, settings RoomSettingsInput) (*RoomResponse, error) {
	uid, err := uuid.Parse(hostID)
	if err != nil {
		return nil, errors.New("ID pengguna tidak valid")
	}

	var game model.Game
	if err := database.DB.Where("slug = ?", gameSlug).First(&game).Error; err != nil {
		return nil, errors.New("Game tidak ditemukan")
	}

	var host model.User
	if err := database.DB.First(&host, "id = ?", uid).Error; err != nil {
		return nil, errors.New("Pengguna tidak ditemukan")
	}

	if settings.Questions == 0 {
		settings.Questions = 20
	}
	if settings.Timer == 0 {
		settings.Timer = 10
	}
	if settings.Category == "" {
		settings.Category = "mix"
	}
	if settings.MaxPlayers < 2 || settings.MaxPlayers > 4 {
		settings.MaxPlayers = 4
	}

	roomCode := s.generateRoomCode()

	room := RoomData{
		RoomCode: roomCode,
		GameSlug: gameSlug,
		HostID:   hostID,
		Members: []RoomMember{{
			ID:       hostID,
			Username: host.Username,
			Level:    host.Level,
			IsHost:   true,
		}},
		Settings:  settings,
		Status:    "waiting",
		CreatedAt: time.Now(),
	}

	data, _ := json.Marshal(room)
	ctx := context.Background()
	database.RDB.Set(ctx, "room:"+roomCode, data, 10*time.Minute)
	database.RDB.Expire(ctx, "room:"+roomCode, 10*time.Minute)
	database.RDB.SAdd(ctx, "room:"+roomCode+":members", hostID)
	database.RDB.Expire(ctx, "room:"+roomCode+":members", 10*time.Minute)

	return &RoomResponse{
		RoomCode: roomCode,
		GameSlug: gameSlug,
		HostID:   hostID,
		Members:  room.Members,
		Settings: settings,
		Status:   "waiting",
		ExpiresAt: time.Now().Add(10 * time.Minute).Format(time.RFC3339),
	}, nil
}

func (s *roomService) GetRoom(roomCode string) (*RoomDetailResponse, error) {
	room, err := s.getRoomData(roomCode)
	if err != nil {
		return nil, err
	}

	var game model.Game
	database.DB.Where("slug = ?", room.GameSlug).First(&game)

	return &RoomDetailResponse{
		RoomResponse: RoomResponse{
			RoomCode: room.RoomCode,
			GameSlug: room.GameSlug,
			HostID:   room.HostID,
			Members:  room.Members,
			Settings: room.Settings,
			Status:   room.Status,
			ExpiresAt: room.CreatedAt.Add(10 * time.Minute).Format(time.RFC3339),
		},
		GameName: game.Name,
	}, nil
}

func (s *roomService) JoinRoom(roomCode, userID string) (*RoomResponse, error) {
	room, err := s.getRoomData(roomCode)
	if err != nil {
		return nil, err
	}

	if room.Status != "waiting" {
		return nil, errors.New("Room sudah dimulai")
	}

	for _, m := range room.Members {
		if m.ID == userID {
			return s.toResponse(room), nil
		}
	}

	if len(room.Members) >= 4 {
		return nil, errors.New("Room sudah penuh (maks 4 player)")
	}

	uid, _ := uuid.Parse(userID)
	var u model.User
	if err := database.DB.First(&u, "id = ?", uid).Error; err != nil {
		return nil, errors.New("Pengguna tidak ditemukan")
	}

	room.Members = append(room.Members, RoomMember{
		ID:       userID,
		Username: u.Username,
		Level:    u.Level,
		IsHost:   false,
	})

	data, _ := json.Marshal(room)
	database.RDB.Set(context.Background(), "room:"+roomCode, data, 10*time.Minute)
	database.RDB.SAdd(context.Background(), "room:"+roomCode+":members", userID)

	return s.toResponse(room), nil
}

func (s *roomService) LeaveRoom(roomCode, userID string) error {
	room, err := s.getRoomData(roomCode)
	if err != nil {
		return err
	}

	var newMembers []RoomMember
	for _, m := range room.Members {
		if m.ID != userID {
			newMembers = append(newMembers, m)
		}
	}
	room.Members = newMembers

	if len(room.Members) == 0 {
		database.RDB.Del(context.Background(), "room:"+roomCode)
		database.RDB.Del(context.Background(), "room:"+roomCode+":members")
		return nil
	}

	if room.HostID == userID && len(room.Members) > 0 {
		room.Members[0].IsHost = true
		room.HostID = room.Members[0].ID
	}

	data, _ := json.Marshal(room)
	database.RDB.Set(context.Background(), "room:"+roomCode, data, 10*time.Minute)
	database.RDB.SRem(context.Background(), "room:"+roomCode+":members", userID)

	return nil
}

func (s *roomService) StartRoom(roomCode, userID string) error {
	room, err := s.getRoomData(roomCode)
	if err != nil {
		return err
	}

	if room.HostID != userID {
		return errors.New("Hanya host yang bisa memulai game")
	}

	if len(room.Members) < 2 {
		return errors.New("Minimal 2 player untuk memulai")
	}

	room.Status = "playing"
	data, _ := json.Marshal(room)
	database.RDB.Set(context.Background(), "room:"+roomCode, data, 10*time.Minute)

	return nil
}

func (s *roomService) KickPlayer(roomCode, hostID, targetID string) error {
	room, err := s.getRoomData(roomCode)
	if err != nil {
		return err
	}

	if room.HostID != hostID {
		return errors.New("Hanya host yang bisa kick player")
	}

	if hostID == targetID {
		return errors.New("Tidak bisa kick diri sendiri")
	}

	return s.LeaveRoom(roomCode, targetID)
}

func (s *roomService) getRoomData(roomCode string) (*RoomData, error) {
	ctx := context.Background()
	data, err := database.RDB.Get(ctx, "room:"+roomCode).Result()
	if err != nil {
		return nil, errors.New("Room tidak ditemukan atau sudah kadaluarsa")
	}

	var room RoomData
	if err := json.Unmarshal([]byte(data), &room); err != nil {
		return nil, errors.New("Data room rusak")
	}

	return &room, nil
}

func (s *roomService) toResponse(room *RoomData) *RoomResponse {
	return &RoomResponse{
		RoomCode:  room.RoomCode,
		GameSlug:  room.GameSlug,
		HostID:    room.HostID,
		Members:   room.Members,
		Settings:  room.Settings,
		Status:    room.Status,
		ExpiresAt: room.CreatedAt.Add(10 * time.Minute).Format(time.RFC3339),
	}
}

func (s *roomService) generateRoomCode() string {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	code := make([]byte, 6)
	for i := range code {
		code[i] = chars[rand.Intn(len(chars))]
	}

	ctx := context.Background()
	exists, _ := database.RDB.Exists(ctx, "room:"+string(code)).Result()
	if exists > 0 {
		return s.generateRoomCode()
	}

	return string(code)
}
