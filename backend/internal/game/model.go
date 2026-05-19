package game

import (
    "time"

    "github.com/google/uuid"
    "gorm.io/gorm"
)

type Game struct {
    ID          uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
    Slug        string    `gorm:"uniqueIndex;size:50;not null" json:"slug"`
    Name        string    `gorm:"size:100;not null" json:"name"`
    Description string    `gorm:"type:text" json:"description"`
    Category    string    `gorm:"size:50;not null" json:"category"`
    IsActive    bool      `gorm:"default:true" json:"is_active"`
    CreatedAt   time.Time `json:"created_at"`
}

func (g *Game) BeforeCreate(tx *gorm.DB) error {
    if g.ID == uuid.Nil {
        g.ID = uuid.New()
    }
    return nil
}

type GameSession struct {
    ID         uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
    UserID     uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
    GameID     uuid.UUID `gorm:"type:uuid;not null" json:"game_id"`
    Score      int       `gorm:"not null;default:0" json:"score"`
    Duration   int       `json:"duration"`
    Difficulty string    `gorm:"size:10" json:"difficulty"`
    XPEarned   int       `gorm:"default:0" json:"xp_earned"`
    CreatedAt  time.Time `json:"created_at"`
}

func (gs *GameSession) BeforeCreate(tx *gorm.DB) error {
    if gs.ID == uuid.Nil {
        gs.ID = uuid.New()
    }
    return nil
}

type UserHighscore struct {
    UserID    uuid.UUID `gorm:"type:uuid;primaryKey" json:"user_id"`
    GameID    uuid.UUID `gorm:"type:uuid;primaryKey" json:"game_id"`
    Highscore int       `gorm:"default:0" json:"highscore"`
    UpdatedAt time.Time `json:"updated_at"`
}
