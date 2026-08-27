package service

import (
	"context"
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strconv"
	"time"

	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/google/uuid"
)

type ExperimentService interface {
	List() ([]model.Experiment, error)
	Create(name, description string, variants []string, traffic float64) (*model.Experiment, error)
	GetVariant(experimentName, userID string) (string, error)
	TrackEvent(experimentName, userID, eventType string, metadata map[string]interface{}) error
	GetResults(experimentName string) (map[string]int, error)
	Toggle(id string) error
}

type experimentService struct{}

func NewExperimentService() ExperimentService {
	return &experimentService{}
}

func (s *experimentService) List() ([]model.Experiment, error) {
	var exps []model.Experiment
	if err := database.DB.Order("created_at desc").Find(&exps).Error; err != nil {
		return nil, err
	}
	return exps, nil
}

func (s *experimentService) Create(name, description string, variants []string, traffic float64) (*model.Experiment, error) {
	if len(variants) < 2 {
		return nil, errors.New("minimal 2 variants")
	}
	vJSON, _ := json.Marshal(variants)
	now := time.Now()
	exp := model.Experiment{
		Name:        name,
		Description: description,
		Variants:    string(vJSON),
		Traffic:     traffic,
		IsActive:    true,
		StartedAt:   &now,
	}
	if err := database.DB.Create(&exp).Error; err != nil {
		return nil, err
	}
	if err := s.seedVariants(name, variants); err != nil {
		return nil, err
	}
	return &exp, nil
}

func (s *experimentService) seedVariants(name string, variants []string) error {
	ctx := context.Background()
	for _, v := range variants {
		database.RDB.SAdd(ctx, "ab:variants:"+name, v)
	}
	return nil
}

func (s *experimentService) GetVariant(experimentName, userID string) (string, error) {
	cacheKey := "ab:assign:" + experimentName + ":" + userID

	ctx := context.Background()
	cached, err := database.RDB.Get(ctx, cacheKey).Result()
	if err == nil && cached != "" {
		return cached, nil
	}

	var exp model.Experiment
	if err := database.DB.Where("name = ? AND is_active = true", experimentName).First(&exp).Error; err != nil {
		return "", errors.New("experiment not found or inactive")
	}

	h := md5.Sum([]byte(experimentName + ":" + userID))
	hashInt, _ := strconv.ParseInt(hex.EncodeToString(h[:4]), 16, 64)
	bucket := int(hashInt % 100)

	if float64(bucket) >= exp.Traffic*100 {
		database.RDB.Set(ctx, cacheKey, "control", 24*time.Hour)
		return "control", nil
	}

	var variants []string
	if err := json.Unmarshal([]byte(exp.Variants), &variants); err != nil || len(variants) == 0 {
		database.RDB.Set(ctx, cacheKey, "control", 24*time.Hour)
		return "control", nil
	}

	variant := variants[bucket%len(variants)]

	database.RDB.Set(ctx, cacheKey, variant, 24*time.Hour)
	return variant, nil
}

func (s *experimentService) TrackEvent(experimentName, userID, eventType string, metadata map[string]interface{}) error {
	variant, err := s.GetVariant(experimentName, userID)
	if err != nil {
		return err
	}

	var exp model.Experiment
	if err := database.DB.Where("name = ?", experimentName).First(&exp).Error; err != nil {
		return err
	}

	metaJSON, _ := json.Marshal(metadata)
	uid, _ := uuid.Parse(userID)

	event := model.ExperimentEvent{
		ExperimentID: exp.ID,
		UserID:       uid,
		Variant:      variant,
		EventType:    eventType,
		MetadataJSON: string(metaJSON),
	}
	return database.DB.Create(&event).Error
}

func (s *experimentService) GetResults(experimentName string) (map[string]int, error) {
	var exp model.Experiment
	if err := database.DB.Where("name = ?", experimentName).First(&exp).Error; err != nil {
		return nil, errors.New("experiment not found")
	}

	type Result struct {
		Variant string
		Count   int
	}
	var results []Result
	database.DB.Model(&model.ExperimentEvent{}).
		Select("variant, COUNT(*) as count").
		Where("experiment_id = ?", exp.ID).
		Group("variant").
		Find(&results)

	out := make(map[string]int)
	for _, r := range results {
		out[r.Variant] = r.Count
	}
	return out, nil
}

func (s *experimentService) Toggle(id string) error {
	var exp model.Experiment
	if err := database.DB.First(&exp, "id = ?", id).Error; err != nil {
		return errors.New("experiment not found")
	}
	exp.IsActive = !exp.IsActive
	return database.DB.Save(&exp).Error
}

var _ ExperimentService = (*experimentService)(nil)
