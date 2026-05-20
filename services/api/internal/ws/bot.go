package ws

import (
	"math/rand"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

type BotConfig struct {
	MinDelay time.Duration
	MaxDelay time.Duration
	Accuracy float64
}

var botConfigs = map[string]BotConfig{
	"easy":   {MinDelay: 4 * time.Second, MaxDelay: 8 * time.Second, Accuracy: 0.55},
	"medium": {MinDelay: 2 * time.Second, MaxDelay: 4 * time.Second, Accuracy: 0.75},
	"hard":   {MinDelay: 500 * time.Millisecond, MaxDelay: 2 * time.Second, Accuracy: 0.92},
	"expert": {MinDelay: 300 * time.Millisecond, MaxDelay: 1 * time.Second, Accuracy: 0.99},
}

var botNamePool = map[string][]string{
	"easy":   {"Rudi Bot", "Siti Bot", "Bimo Bot", "Ayu Bot", "Dani Bot"},
	"medium": {"Alex Bot", "Maya Bot", "Rio Bot", "Nisa Bot", "Bagas Bot"},
	"hard":   {"Cipher", "Nexus", "Titan", "Vega", "Zeta"},
	"expert": {"MAESTRO", "OMEGA", "APEX"},
}

type BotAnswer struct {
	Answer    string
	IsCorrect bool
	TimeTaken time.Duration
}

type RuleBasedBot struct {
	UserID      string
	Difficulty  string
	DisplayName string
	config      BotConfig
}

func NewRuleBasedBot(difficulty, gameID string) *RuleBasedBot {
	cfg := botConfigs[difficulty]
	if cfg.Accuracy == 0 {
		cfg = botConfigs["medium"]
		difficulty = "medium"
	}

	names := botNamePool[difficulty]
	if len(names) == 0 {
		names = botNamePool["medium"]
	}
	name := names[rand.Intn(len(names))]

	return &RuleBasedBot{
		UserID:      "bot_" + uuid.New().String()[:8],
		Difficulty:  difficulty,
		DisplayName: name,
		config:      cfg,
	}
}

func (b *RuleBasedBot) GetDelay() time.Duration {
	delay := b.config.MinDelay + time.Duration(rand.Int63n(int64(b.config.MaxDelay-b.config.MinDelay)))
	return delay
}

func (b *RuleBasedBot) AnswerQuestion(q QuestionPayload) BotAnswer {
	delay := b.GetDelay()
	time.Sleep(delay)

	isCorrect := rand.Float64() < b.config.Accuracy

	if isCorrect {
		correctAnswer := extractCorrectAnswer(q.Text, q.Options)
		if correctAnswer != "" {
			return BotAnswer{Answer: correctAnswer, IsCorrect: true, TimeTaken: delay}
		}
	}

	if len(q.Options) > 0 {
		wrong := q.Options[rand.Intn(len(q.Options))]
		return BotAnswer{Answer: wrong, IsCorrect: false, TimeTaken: delay}
	}

	return BotAnswer{Answer: "0", IsCorrect: false, TimeTaken: delay}
}

func extractCorrectAnswer(text string, options []string) string {
	for _, opt := range options {
		if _, err := strconv.Atoi(strings.TrimSpace(opt)); err == nil {
			return opt
		}
	}
	if len(options) > 0 {
		return options[0]
	}
	return ""
}
