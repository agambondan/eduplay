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
	// Generate for today if not exists
	GenerateChallengeForDate(time.Now(), gameRepo, aiSvc)

	go func() {
		for {
			now := time.Now()
			next := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, now.Location())
			dur := time.Until(next)
			log.Printf("[scheduler] next daily reset in %v", dur)
			time.Sleep(dur)
			GenerateChallengeForDate(time.Now(), gameRepo, aiSvc)
		}
	}()
}

func GenerateChallengeForDate(targetDate time.Time, gameRepo repository.GameRepository, aiSvc AIService) {
	games, err := gameRepo.FindAll()
	if err != nil || len(games) == 0 {
		log.Println("[scheduler] no games found for daily challenge")
		return
	}

	// Use date-based seed for consistency
	day := targetDate.YearDay()
	pick := games[day%len(games)]
	targetDateOnly := targetDate.Truncate(24 * time.Hour)

	var existing model.DailyChallenge
	if err := database.DB.Where("challenge_date = ?", targetDateOnly).First(&existing).Error; err == nil {
		log.Printf("[scheduler] daily challenge already exists for %s", targetDateOnly.Format("2006-01-02"))
		return
	}

	questions, err := aiSvc.GenerateQuestions(pick.Category, "medium", 5)
	if err != nil {
		log.Printf("[scheduler] ai error: %v, using fallback questions", err)
		questions = GetFallbackQuestions(pick.Category)
	}

	qJSON, _ := json.Marshal(questions)

	challenge := model.DailyChallenge{
		GameID:        pick.ID,
		QuestionsJSON: string(qJSON),
		ChallengeDate: targetDateOnly,
	}

	if err := database.DB.Create(&challenge).Error; err != nil {
		log.Printf("[scheduler] failed to create daily challenge for %s: %v", targetDateOnly.Format("2006-01-02"), err)
		return
	}

	log.Printf("[scheduler] created daily challenge for %s, game: %s", targetDateOnly.Format("2006-01-02"), pick.Name)
}

func GetFallbackQuestions(category string) []Question {
	switch category {
	case "math":
		return []Question{
			{Question: "15 + 27", Answer: "42", Options: []string{"40", "42", "45", "38"}},
			{Question: "12 * 8", Answer: "96", Options: []string{"84", "96", "104", "88"}},
			{Question: "100 / 4", Answer: "25", Options: []string{"20", "25", "30", "15"}},
			{Question: "65 - 19", Answer: "46", Options: []string{"46", "56", "36", "44"}},
			{Question: "9 * 9", Answer: "81", Options: []string{"72", "81", "90", "89"}},
		}
	case "language":
		return []Question{
			{Question: "Sinonim dari 'Senang' adalah...", Answer: "Bahagia", Options: []string{"Sedih", "Marah", "Bahagia", "Lapar"}},
			{Question: "Lawan kata 'Besar' adalah...", Answer: "Kecil", Options: []string{"Tinggi", "Kecil", "Luas", "Lebar"}},
		}
	default:
		return []Question{
			{Question: "Ibukota Indonesia adalah...", Answer: "Jakarta", Options: []string{"Jakarta", "Bandung", "Surabaya", "Medan"}},
			{Question: "Benua terbesar adalah...", Answer: "Asia", Options: []string{"Eropa", "Afrika", "Asia", "Amerika"}},
		}
	}
}
