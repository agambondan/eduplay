package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/agambondan/eduplay/services/api/config"
	"github.com/agambondan/eduplay/services/api/pkg/database"
)

type Question struct {
	Question string   `json:"question"`
	Options  []string `json:"options,omitempty"`
	Answer   string   `json:"answer"`
}

type AIService interface {
	GenerateQuestions(gameType string, difficulty string, count int) ([]Question, error)
}

type aiService struct {
	cfg *config.Config
}

func NewAIService(cfg *config.Config) AIService {
	return &aiService{cfg: cfg}
}

func (s *aiService) GenerateQuestions(gameType string, difficulty string, count int) ([]Question, error) {
	ctx := context.Background()
	cacheKey := fmt.Sprintf("ai:questions:%s:%s", gameType, difficulty)

	val, _ := database.RDB.Get(ctx, cacheKey).Result()
	if val != "" {
		var questions []Question
		json.Unmarshal([]byte(val), &questions)
		return questions, nil
	}

	prompt := GetPrompt(gameType, difficulty, count)

	body := map[string]interface{}{
		"model":      s.cfg.Anthropic.Model,
		"max_tokens": 2000,
		"messages": []map[string]string{
			{"role": "user", "content": prompt},
		},
	}
	bodyBytes, _ := json.Marshal(body)

	req, _ := http.NewRequest("POST", "https://api.anthropic.com/v1/messages", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", s.cfg.Anthropic.APIKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	var apiResp struct {
		Content []struct {
			Text string `json:"text"`
		} `json:"content"`
	}
	json.Unmarshal(respBody, &apiResp)

	if len(apiResp.Content) == 0 {
		return nil, fmt.Errorf("empty response from AI")
	}

	var questions []Question
	text := apiResp.Content[0].Text
	json.Unmarshal([]byte(text), &questions)

	data, _ := json.Marshal(questions)
	database.RDB.Set(ctx, cacheKey, data, time.Hour)

	return questions, nil
}
