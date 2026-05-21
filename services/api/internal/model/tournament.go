package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Tournament struct {
	ID                 uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	Name               string     `gorm:"size:120;not null" json:"name"`
	GameSlug           string     `gorm:"size:50;not null;default:'math-tournament'" json:"game_slug"`
	Difficulty         string     `gorm:"size:10;not null;default:'medium'" json:"difficulty"`
	Mode               string     `gorm:"size:20;not null;default:'quick';index" json:"mode"`
	InviteCode         string     `gorm:"uniqueIndex;size:12;not null" json:"invite_code"`
	MaxPlayers         int        `gorm:"not null;default:8" json:"max_players"`
	Status             string     `gorm:"size:20;not null;default:'registration';index" json:"status"`
	HostID             uuid.UUID  `gorm:"type:uuid;not null;index" json:"host_id"`
	ChampionID         *uuid.UUID `gorm:"type:uuid" json:"champion_id"`
	ScheduledStartAt   *time.Time `json:"scheduled_start_at"`
	RegistrationEndsAt *time.Time `json:"registration_ends_at"`
	CurrentRoundEndsAt *time.Time `json:"current_round_ends_at"`
	StartedAt          *time.Time `json:"started_at"`
	FinishedAt         *time.Time `json:"finished_at"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
}

func (t *Tournament) BeforeCreate(tx *gorm.DB) error {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	if t.GameSlug == "" {
		t.GameSlug = "math-tournament"
	}
	if t.Status == "" {
		t.Status = "registration"
	}
	if t.Mode == "" {
		t.Mode = "quick"
	}
	return nil
}

type TournamentPlayer struct {
	ID           uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	TournamentID uuid.UUID  `gorm:"type:uuid;not null;index" json:"tournament_id"`
	UserID       *uuid.UUID `gorm:"type:uuid;index" json:"user_id"`
	BotName      string     `gorm:"size:80" json:"bot_name"`
	Seed         int        `gorm:"not null;default:0" json:"seed"`
	Status       string     `gorm:"size:20;not null;default:'active'" json:"status"`
	FinalRank    int        `gorm:"not null;default:0" json:"final_rank"`
	JoinedAt     time.Time  `json:"joined_at"`
}

func (p *TournamentPlayer) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	if p.JoinedAt.IsZero() {
		p.JoinedAt = time.Now()
	}
	if p.Status == "" {
		p.Status = "active"
	}
	return nil
}

type TournamentMatch struct {
	ID             uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	TournamentID   uuid.UUID  `gorm:"type:uuid;not null;index" json:"tournament_id"`
	Round          int        `gorm:"not null;index" json:"round"`
	Position       int        `gorm:"not null;index" json:"position"`
	Player1ID      *uuid.UUID `gorm:"type:uuid" json:"player1_id"`
	Player2ID      *uuid.UUID `gorm:"type:uuid" json:"player2_id"`
	WinnerPlayerID *uuid.UUID `gorm:"type:uuid" json:"winner_player_id"`
	Player1Score   int        `gorm:"not null;default:0" json:"player1_score"`
	Player2Score   int        `gorm:"not null;default:0" json:"player2_score"`
	Status         string     `gorm:"size:20;not null;default:'pending';index" json:"status"`
	RoomID         string     `gorm:"size:160;index" json:"room_id"`
	StartedAt      *time.Time `json:"started_at"`
	EndsAt         *time.Time `json:"ends_at"`
	FinishedAt     *time.Time `json:"finished_at"`
	CreatedAt      time.Time  `json:"created_at"`
}

func (m *TournamentMatch) BeforeCreate(tx *gorm.DB) error {
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	if m.Status == "" {
		m.Status = "pending"
	}
	return nil
}
