package service

import (
	"context"
	"encoding/json"
	"errors"
	"math/rand"
	"strconv"
	"strings"
	"time"

	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

type RoomService interface {
	CreateRoom(hostID, gameSlug string, settings RoomSettingsInput) (*RoomResponse, error)
	GetRoom(roomCode string) (*RoomDetailResponse, error)
	JoinRoom(roomCode, userID string) (*RoomResponse, error)
	LeaveRoom(roomCode, userID string) error
	StartRoom(roomCode, userID string) error
	UpdateSettings(roomCode, userID string, settings RoomSettingsInput) (*RoomResponse, error)
	KickPlayer(roomCode, hostID, targetID string) error
}

type RoomSettingsInput struct {
	Questions  int    `json:"questions"`
	Category   string `json:"category"`
	Difficulty string `json:"difficulty"`
	Timer      int    `json:"timer"`
	MaxPlayers int    `json:"max_players"`
	AllowBots  bool   `json:"allow_bots"`
}

type RoomMember struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Level    int    `json:"level"`
	IsHost   bool   `json:"is_host"`
}

type RoomData struct {
	RoomCode  string            `json:"room_code"`
	GameSlug  string            `json:"game_slug"`
	HostID    string            `json:"host_id"`
	Members   []RoomMember      `json:"members"`
	Settings  RoomSettingsInput `json:"settings"`
	Status    string            `json:"status"`
	CreatedAt time.Time         `json:"created_at"`
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

	settings = normalizeRoomSettings(settings)

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
		RoomCode:  roomCode,
		GameSlug:  gameSlug,
		HostID:    hostID,
		Members:   room.Members,
		Settings:  settings,
		Status:    "waiting",
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
			RoomCode:  room.RoomCode,
			GameSlug:  room.GameSlug,
			HostID:    room.HostID,
			Members:   room.Members,
			Settings:  room.Settings,
			Status:    room.Status,
			ExpiresAt: room.CreatedAt.Add(10 * time.Minute).Format(time.RFC3339),
		},
		GameName: game.Name,
	}, nil
}

func (s *roomService) JoinRoom(roomCode, userID string) (*RoomResponse, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, errors.New("ID pengguna tidak valid")
	}
	var u model.User
	if err := database.DB.First(&u, "id = ?", uid).Error; err != nil {
		return nil, errors.New("Pengguna tidak ditemukan")
	}

	room, err := s.mutateRoom(roomCode, func(room *RoomData) error {
		if room.Status != "waiting" {
			return errors.New("Room sudah dimulai")
		}
		for _, m := range room.Members {
			if m.ID == userID {
				return nil
			}
		}
		if len(room.Members) >= room.Settings.MaxPlayers {
			return errors.New("Room sudah penuh")
		}
		room.Members = append(room.Members, RoomMember{
			ID:       userID,
			Username: u.Username,
			Level:    u.Level,
			IsHost:   false,
		})
		return nil
	})
	if err != nil {
		return nil, err
	}

	database.RDB.SAdd(context.Background(), "room:"+roomCode+":members", userID)

	return s.toResponse(room), nil
}

func (s *roomService) LeaveRoom(roomCode, userID string) error {
	room, err := s.mutateRoom(roomCode, func(room *RoomData) error {
		newMembers := make([]RoomMember, 0, len(room.Members))
		for _, m := range room.Members {
			if m.ID != userID {
				newMembers = append(newMembers, m)
			}
		}
		room.Members = newMembers
		if len(room.Members) > 0 && room.HostID == userID {
			room.Members[0].IsHost = true
			room.HostID = room.Members[0].ID
		}
		return nil
	})
	if err != nil {
		return err
	}

	if len(room.Members) == 0 {
		database.RDB.Del(context.Background(), "room:"+roomCode)
		database.RDB.Del(context.Background(), "room:"+roomCode+":members")
		return nil
	}

	database.RDB.SRem(context.Background(), "room:"+roomCode+":members", userID)
	return nil
}

func (s *roomService) StartRoom(roomCode, userID string) error {
	_, err := s.mutateRoom(roomCode, func(room *RoomData) error {
		if room.HostID != userID {
			return errors.New("Hanya host yang bisa memulai game")
		}
		if room.Status != "waiting" {
			return errors.New("Room sudah dimulai")
		}
		if len(room.Members) < 2 && !room.Settings.AllowBots {
			return errors.New("Minimal 2 player untuk memulai")
		}
		if room.Settings.AllowBots {
			for len(room.Members) < room.Settings.MaxPlayers {
				n := len(room.Members)
				room.Members = append(room.Members, RoomMember{
					ID:       "bot_room_" + room.RoomCode + "_" + strconv.Itoa(n+1),
					Username: botRoomName(n),
					Level:    1,
					IsHost:   false,
				})
			}
		}
		room.Status = "playing"
		return nil
	})
	return err
}

func (s *roomService) UpdateSettings(roomCode, userID string, settings RoomSettingsInput) (*RoomResponse, error) {
	room, err := s.mutateRoom(roomCode, func(room *RoomData) error {
		if room.HostID != userID {
			return errors.New("Hanya host yang bisa mengubah pengaturan")
		}
		if room.Status != "waiting" {
			return errors.New("Room sudah dimulai")
		}
		room.Settings = normalizeRoomSettings(settings)
		if len(room.Members) > room.Settings.MaxPlayers {
			return errors.New("Max player lebih kecil dari jumlah player saat ini")
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return s.toResponse(room), nil
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

// mutateRoom loads the room under a Redis WATCH and writes back whatever
// mutate leaves in *RoomData, but only if nobody else changed the key in
// between — otherwise it retries. Without this, two concurrent requests
// (e.g. two joins racing the MaxPlayers check, or a join racing a leave)
// each read the same snapshot and the second write silently clobbers the
// first instead of being rejected or merged.
func (s *roomService) mutateRoom(roomCode string, mutate func(room *RoomData) error) (*RoomData, error) {
	ctx := context.Background()
	key := "room:" + roomCode

	for attempt := 0; attempt < 5; attempt++ {
		var result *RoomData
		err := database.RDB.Watch(ctx, func(tx *redis.Tx) error {
			raw, err := tx.Get(ctx, key).Result()
			if err != nil {
				return errRoomNotFound
			}
			var room RoomData
			if err := json.Unmarshal([]byte(raw), &room); err != nil {
				return errors.New("Data room rusak")
			}
			if err := mutate(&room); err != nil {
				return err
			}
			data, err := json.Marshal(room)
			if err != nil {
				return err
			}
			_, err = tx.TxPipelined(ctx, func(pipe redis.Pipeliner) error {
				pipe.Set(ctx, key, data, 10*time.Minute)
				return nil
			})
			if err != nil {
				return err
			}
			result = &room
			return nil
		}, key)

		if err == nil {
			return result, nil
		}
		if errors.Is(err, redis.TxFailedErr) {
			continue
		}
		if errors.Is(err, errRoomNotFound) {
			return nil, errors.New("Room tidak ditemukan atau sudah kadaluarsa")
		}
		return nil, err
	}
	return nil, errors.New("Room sedang sibuk, coba lagi")
}

var errRoomNotFound = errors.New("room not found")

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

func normalizeRoomSettings(settings RoomSettingsInput) RoomSettingsInput {
	switch {
	case settings.Questions <= 0:
		settings.Questions = 20
	case settings.Questions < 5:
		settings.Questions = 5
	case settings.Questions > 30:
		settings.Questions = 30
	}

	if settings.Timer <= 0 {
		settings.Timer = 10
	} else if settings.Timer < 5 {
		settings.Timer = 5
	} else if settings.Timer > 30 {
		settings.Timer = 30
	}

	settings.Category = strings.TrimSpace(strings.ToLower(settings.Category))
	if settings.Category == "" {
		settings.Category = "mix"
	}

	settings.Difficulty = strings.TrimSpace(strings.ToLower(settings.Difficulty))
	switch settings.Difficulty {
	case "easy", "medium", "hard":
	default:
		settings.Difficulty = "medium"
	}

	if settings.MaxPlayers < 2 {
		settings.MaxPlayers = 2
	} else if settings.MaxPlayers > 4 {
		settings.MaxPlayers = 4
	}

	return settings
}

func botRoomName(index int) string {
	names := []string{"Rudi Bot", "Siti Bot", "Bimo Bot", "Ayu Bot"}
	if index >= 0 && index < len(names) {
		return names[index]
	}
	return "Edu Bot"
}
