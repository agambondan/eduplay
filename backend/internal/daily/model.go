package daily

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type DailyChallenge struct {
	ID            uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	GameID        uuid.UUID `gorm:"type:uuid;not null" json:"game_id"`
	QuestionsJSON string    `gorm:"type:jsonb;not null" json:"questions"`
	ChallengeDate time.Time `gorm:"type:date;uniqueIndex;not null" json:"challenge_date"`
	CreatedAt     time.Time `json:"created_at"`
}

func (dc *DailyChallenge) BeforeCreate(tx *gorm.DB) error {
	if dc.ID == uuid.Nil {
		dc.ID = uuid.New()
	}
	return nil
}

type DailySubmission struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID      uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_user_challenge" json:"user_id"`
	ChallengeID uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_user_challenge" json:"challenge_id"`
	Score       int       `gorm:"not null" json:"score"`
	CompletedAt time.Time `json:"completed_at"`
}
