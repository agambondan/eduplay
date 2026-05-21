package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type BlogPost struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	Slug        string     `gorm:"size:200;uniqueIndex;not null" json:"slug"`
	Title       string     `gorm:"size:255;not null" json:"title"`
	Excerpt     string     `gorm:"size:500" json:"excerpt"`
	Content     string     `gorm:"type:text;not null" json:"content"`
	Author      string     `gorm:"size:100;default:'EduPlay Team'" json:"author"`
	ImageURL    string     `gorm:"size:500" json:"image_url"`
	Category    string     `gorm:"size:50;index" json:"category"`
	Tags        string     `gorm:"size:500" json:"tags"`
	IsPublished bool       `gorm:"default:false" json:"is_published"`
	PublishedAt *time.Time `json:"published_at"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

func (b *BlogPost) BeforeCreate(tx *gorm.DB) error {
	if b.ID == uuid.Nil {
		b.ID = uuid.New()
	}
	return nil
}
