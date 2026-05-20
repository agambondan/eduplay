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

	baseURL := s.cfg.AI.BaseURL
	if baseURL == "" {
		baseURL = "https://openrouter.ai/api/v1"
	}
	endpoint := baseURL + "/chat/completions"

	body := map[string]interface{}{
		"model":       s.cfg.AI.Model,
		"max_tokens":  2000,
		"temperature": 0.7,
		"messages": []map[string]string{
			{"role": "user", "content": prompt},
		},
	}
	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequest("POST", endpoint, bytes.NewBuffer(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+s.cfg.AI.APIKey)

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

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("ai API error: %d - %s", resp.StatusCode, string(respBody))
	}

	var apiResp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(respBody, &apiResp); err != nil {
		return nil, fmt.Errorf("failed to parse AI response: %w", err)
	}

	if len(apiResp.Choices) == 0 {
		return nil, fmt.Errorf("empty response from AI")
	}

	var questions []Question
	if err := json.Unmarshal([]byte(apiResp.Choices[0].Message.Content), &questions); err != nil {
		return nil, fmt.Errorf("failed to parse questions from AI response: %w", err)
	}

	data, _ := json.Marshal(questions)
	database.RDB.Set(ctx, cacheKey, data, time.Hour)

	return questions, nil
}
