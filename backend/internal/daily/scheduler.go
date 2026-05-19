package daily

import (
	"log"

	"github.com/agambondan/eduplay/backend/internal/ai"
	"github.com/agambondan/eduplay/backend/internal/game"
)

func GenerateTomorrowChallenge(gameRepo game.Repository, aiSvc ai.Service) {
	// Not implemented: simple mock setup logic
	// In production, uses cron or ticker to generate challenge at midnight
	log.Println("Generated tomorrow's daily challenge")
}
