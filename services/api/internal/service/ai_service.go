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
	cacheKey := fmt.Sprintf("ai:questions:%s:%s:%d", gameType, difficulty, count)

	val, _ := database.RDB.Get(ctx, cacheKey).Result()
	if val != "" {
		var questions []Question
		if err := json.Unmarshal([]byte(val), &questions); err == nil && len(questions) > 0 {
			return questions, nil
		}
	}

	prompt := GetPrompt(gameType, difficulty, count)

	body := map[string]interface{}{
		"model":      s.cfg.Anthropic.Model,
		"max_tokens": 2000,
		"messages": []map[string]string{
			{"role": "user", "content": prompt},
		},
	}
	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequest("POST", "https://api.anthropic.com/v1/messages", bytes.NewBuffer(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-api-key", s.cfg.Anthropic.APIKey)
	httpReq.Header.Set("anthropic-version", "2023-06-01")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("ai request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var apiResp struct {
		Content []struct {
			Text string `json:"text"`
		} `json:"content"`
	}
	if err := json.Unmarshal(respBody, &apiResp); err != nil {
		return nil, fmt.Errorf("failed to parse AI response: %w", err)
	}

	if len(apiResp.Content) == 0 {
		return nil, fmt.Errorf("empty response from AI")
	}

	var questions []Question
	if err := json.Unmarshal([]byte(apiResp.Content[0].Text), &questions); err != nil {
		return nil, fmt.Errorf("failed to parse questions from AI response: %w", err)
	}

	data, _ := json.Marshal(questions)
	database.RDB.Set(ctx, cacheKey, data, time.Hour)

	return questions, nil
}
