package service

import (
	"encoding/json"
	"log"
	"time"

	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/internal/repository"
	"github.com/agambondan/eduplay/services/api/pkg/database"
)

func StartDailyScheduler(gameRepo repository.GameRepository, aiSvc AIService) {
	go func() {
		for {
			now := time.Now()
			next := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, now.Location())
			dur := time.Until(next)
			log.Printf("[scheduler] next daily reset in %v", dur)
			time.Sleep(dur)
			GenerateTomorrowChallenge(gameRepo, aiSvc)
		}
	}()
}

func GenerateTomorrowChallenge(gameRepo repository.GameRepository, aiSvc AIService) {
	games, err := gameRepo.FindAll()
	if err != nil || len(games) == 0 {
		log.Println("[scheduler] no games found for daily challenge")
		return
	}

	pick := games[time.Now().Day()%len(games)]
	tomorrow := time.Now().AddDate(0, 0, 1)
	tomorrowDate := tomorrow.Truncate(24 * time.Hour)

	var existing model.DailyChallenge
	if err := database.DB.Where("challenge_date = ?", tomorrowDate).First(&existing).Error; err == nil {
		log.Println("[scheduler] daily challenge already exists for tomorrow")
		return
	}

	questions, err := aiSvc.GenerateQuestions(pick.Category, "medium", 5)
	if err != nil {
		log.Printf("[scheduler] ai error: %v, using empty questions", err)
		questions = []Question{}
	}

	qJSON, _ := json.Marshal(questions)

	challenge := model.DailyChallenge{
		GameID:        pick.ID,
		QuestionsJSON: string(qJSON),
		ChallengeDate: tomorrowDate,
	}

	if err := database.DB.Create(&challenge).Error; err != nil {
		log.Printf("[scheduler] failed to create daily challenge: %v", err)
		return
	}

	log.Printf("[scheduler] created daily challenge for %s, game: %s", tomorrowDate.Format("2006-01-02"), pick.Name)
}
