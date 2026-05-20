package service

import (
	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/internal/repository"
	"github.com/google/uuid"
)

type AdService struct {
	repo *repository.AdRepository
}

func NewAdService(repo *repository.AdRepository) *AdService {
	return &AdService{repo: repo}
}

func (s *AdService) GetActiveBySlot(slot string) (*model.Ad, error) {
	return s.repo.GetActiveBySlot(slot)
}

func (s *AdService) List() ([]model.Ad, error) {
	return s.repo.List()
}

func (s *AdService) Create(ad *model.Ad) error {
	return s.repo.Create(ad)
}

func (s *AdService) Update(id uuid.UUID, updates map[string]any) (*model.Ad, error) {
	ad, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if v, ok := updates["title"].(string); ok {
		ad.Title = v
	}
	if v, ok := updates["image_url"].(string); ok {
		ad.ImageURL = v
	}
	if v, ok := updates["click_url"].(string); ok {
		ad.ClickURL = v
	}
	if v, ok := updates["slot_type"].(string); ok {
		ad.SlotType = v
	}
	if v, ok := updates["is_active"].(bool); ok {
		ad.IsActive = v
	}
	if v, ok := updates["priority"].(float64); ok {
		ad.Priority = int(v)
	}
	return ad, s.repo.Update(ad)
}

func (s *AdService) Delete(id uuid.UUID) error {
	return s.repo.Delete(id)
}
