package repository

import (
	"time"

	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/google/uuid"
)

type AdRepository struct{}

func NewAdRepository() *AdRepository { return &AdRepository{} }

// GetActiveBySlot returns the highest-priority direct ad for a slot that is currently live.
func (r *AdRepository) GetActiveBySlot(slot string) (*model.Ad, error) {
	var ad model.Ad
	now := time.Now()
	err := database.DB.
		Where("slot_type = ? AND is_active = true AND (start_at IS NULL OR start_at <= ?) AND (end_at IS NULL OR end_at >= ?)", slot, now, now).
		Order("priority DESC").
		First(&ad).Error
	if err != nil {
		return nil, err
	}
	return &ad, nil
}

func (r *AdRepository) List() ([]model.Ad, error) {
	var ads []model.Ad
	err := database.DB.Order("created_at DESC").Find(&ads).Error
	return ads, err
}

func (r *AdRepository) Create(ad *model.Ad) error {
	return database.DB.Create(ad).Error
}

func (r *AdRepository) Update(ad *model.Ad) error {
	return database.DB.Save(ad).Error
}

func (r *AdRepository) FindByID(id uuid.UUID) (*model.Ad, error) {
	var ad model.Ad
	err := database.DB.First(&ad, "id = ?", id).Error
	return &ad, err
}

func (r *AdRepository) Delete(id uuid.UUID) error {
	return database.DB.Delete(&model.Ad{}, "id = ?", id).Error
}
