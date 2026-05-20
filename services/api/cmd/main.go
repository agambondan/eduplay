package main

import (
	"os"
	"time"

	"github.com/agambondan/eduplay/services/api/config"
	"github.com/agambondan/eduplay/services/api/internal/controller"
	"github.com/agambondan/eduplay/services/api/internal/middleware"
	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/internal/repository"
	"github.com/agambondan/eduplay/services/api/internal/service"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/agambondan/eduplay/services/api/pkg/email"
	"github.com/agambondan/eduplay/services/api/pkg/logger"
	"github.com/getsentry/sentry-go"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		panic("Failed to load config: " + err.Error())
	}

	logger.Init(cfg.App.Env)
	defer logger.Log.Sync()

	if dsn := os.Getenv("SENTRY_DSN"); dsn != "" {
		if err := sentry.Init(sentry.ClientOptions{
			Dsn:              dsn,
			Environment:      cfg.App.Env,
			TracesSampleRate: 0.2,
		}); err != nil {
			logger.Log.Warn("sentry init failed", zap.Error(err))
		}
		defer sentry.Flush(2 * time.Second)
	}

	database.ConnectPostgres(cfg)
	database.ConnectRedis(cfg)

	var emailCl *email.ResendClient
	if cfg.Resend.APIKey != "" {
		emailCl = email.NewResendClient(cfg.Resend.APIKey, cfg.Resend.From, logger.Log)
		logger.Log.Info("email service initialized")
	}

	// Auto Migration
	database.DB.AutoMigrate(
		&model.User{},
		&model.Game{},
		&model.GameSession{},
		&model.UserHighscore{},
		&model.DailyChallenge{},
		&model.DailySubmission{},
		&model.Achievement{},
		&model.UserAchievement{},
		&model.PushSubscription{},
		&model.SupportTicket{},
		&model.Subscription{},
	)

	seedData()

	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"message": err.Error(),
			})
		},
	})

	app.Use(recover.New())
	app.Use(middleware.RequestLogger())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.FrontendURL,
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowCredentials: true,
	}))

	apiV1 := app.Group("/api/v1")

	// Repositories
	userRepo := repository.NewUserRepository()
	gameRepo := repository.NewGameRepository()
	leadRepo := repository.NewLeaderboardRepository()
	achRepo := repository.NewAchievementRepository()

	// Services
	achSvc := service.NewAchievementService(achRepo)
	authSvc := service.NewAuthService(cfg, userRepo, emailCl, achSvc)
	userSvc := service.NewUserService(userRepo)
	leadSvc := service.NewLeaderboardService(leadRepo, gameRepo)
	gameSvc := service.NewGameService(gameRepo, achSvc, leadSvc)
	dailySvc := service.NewDailyService(gameRepo, achSvc)
	aiSvc := service.NewAIService(cfg)
	pushSvc := service.NewPushService(cfg)
	supportSvc := service.NewSupportService(emailCl)
	subSvc := service.NewSubscriptionService()

	// Controllers
	authHandler := controller.NewAuthController(authSvc)
	userHandler := controller.NewUserController(userSvc)
	gameHandler := controller.NewGameController(gameSvc)
	leadHandler := controller.NewLeaderboardController(leadSvc)
	dailyHandler := controller.NewDailyController(dailySvc)
	achHandler := controller.NewAchievementController(achSvc)
	aiHandler := controller.NewAIController(aiSvc)
	adminSvc := service.NewAdminService()
	adminHandler := controller.NewAdminController(adminSvc)
	pushHandler := controller.NewPushController(pushSvc, cfg)
	supportHandler := controller.NewSupportController(supportSvc)
	subHandler := controller.NewSubscriptionController(subSvc)

	// Routes
	authGroup := apiV1.Group("/auth")
	authGroup.Post("/register", authHandler.Register)
	authGroup.Post("/login", authHandler.Login)
	authGroup.Post("/google", authHandler.GoogleLogin)
	authGroup.Post("/refresh", authHandler.Refresh)
	authGroup.Post("/logout", middleware.AuthMiddleware(cfg), authHandler.Logout)
	authGroup.Post("/forgot-password", authHandler.ForgotPassword)
	authGroup.Post("/reset-password", authHandler.ResetPassword)
	authGroup.Get("/verify-email", authHandler.VerifyEmail)
	authGroup.Post("/request-verification", middleware.AuthMiddleware(cfg), authHandler.RequestVerification)

	userGroup := apiV1.Group("/user", middleware.AuthMiddleware(cfg))
	userGroup.Get("/me", userHandler.GetMe)
	userGroup.Get("/stats", userHandler.GetStats)
	userGroup.Patch("/profile", userHandler.UpdateProfile)
	userGroup.Get("/achievements", achHandler.GetUserAchievements)

	gameGroup := apiV1.Group("/games")
	gameGroup.Get("/", gameHandler.ListGames)
	gameGroup.Get("/:slug", gameHandler.GetGame)
	gameGroup.Post("/:slug/score", middleware.AuthMiddleware(cfg), gameHandler.SubmitScore)

	leadGroup := apiV1.Group("/leaderboard", middleware.OptionalAuthMiddleware(cfg))
	leadGroup.Get("/game/:slug", leadHandler.GetGameLeaderboard)
	leadGroup.Get("/global", leadHandler.GetGlobalLeaderboard)

	dailyGroup := apiV1.Group("/daily")
	dailyGroup.Get("/", dailyHandler.GetDailyChallenge)
	dailyGroup.Post("/submit", middleware.AuthMiddleware(cfg), dailyHandler.SubmitDailyChallenge)
	dailyGroup.Get("/history", middleware.AuthMiddleware(cfg), dailyHandler.GetHistory)

	aiGroup := apiV1.Group("/ai", middleware.AuthMiddleware(cfg), limiter.New(limiter.Config{
		Max:        10,
		Expiration: 1 * time.Minute,
	}))
	aiGroup.Post("/questions", aiHandler.GenerateQuestions)

	adminGroup := apiV1.Group("/admin", middleware.AuthMiddleware(cfg), middleware.AdminMiddleware())
	adminGroup.Get("/dashboard", adminHandler.GetDashboard)
	adminGroup.Get("/users", adminHandler.ListUsers)
	adminGroup.Post("/users/:id/ban", adminHandler.BanUser)
	adminGroup.Post("/users/:id/unban", adminHandler.UnbanUser)
	adminGroup.Get("/games", adminHandler.ListGames)
	adminGroup.Post("/games/:id/toggle", adminHandler.ToggleGame)
	adminGroup.Post("/leaderboard/reset", adminHandler.ResetLeaderboard)
	adminGroup.Get("/feature-flags", adminHandler.GetFeatureFlags)
	adminGroup.Post("/feature-flags/:key", adminHandler.SetFeatureFlag)
	adminGroup.Get("/reported-usernames", adminHandler.ListReportedUsernames)

	pushGroup := apiV1.Group("/push", middleware.AuthMiddleware(cfg))
	pushGroup.Post("/subscribe", pushHandler.Subscribe)
	pushGroup.Post("/unsubscribe", pushHandler.Unsubscribe)
	apiV1.Get("/push/vapid-public-key", pushHandler.VapidPublicKey)

	apiV1.Post("/support", supportHandler.CreateTicket)

	subGroup := apiV1.Group("/subscribe", middleware.AuthMiddleware(cfg))
	subGroup.Post("/", subHandler.Subscribe)
	subGroup.Get("/status", subHandler.Status)
	subGroup.Post("/cancel", subHandler.Cancel)

	// Start schedulers
	service.StartDailyScheduler(gameRepo, aiSvc)

	logger.Log.Info("Server starting", zap.String("port", cfg.App.Port))
	if err := app.Listen(":" + cfg.App.Port); err != nil {
		logger.Log.Fatal("Server failed to start", zap.Error(err))
	}
}

func seedData() {
	seedGames()
	seedAchievements()
}

func seedGames() {
	games := []model.Game{
		{Slug: "math-quiz", Name: "Math Quiz Blitz", Description: "Jawab soal matematika secepat mungkin dalam 60 detik!", Category: "math", IsActive: true},
		{Slug: "times-table", Name: "Times Table Challenge", Description: "Drilling tabel perkalian 1-12 secara gamified.", Category: "math", IsActive: true},
		{Slug: "mental-math", Name: "Mental Math Speed", Description: "Hitung cepat tanpa pilihan ganda.", Category: "math", IsActive: true},
		{Slug: "bubble-shooter", Name: "Bubble Shooter Math", Description: "Tembak gelembung dengan jawaban soal matematika.", Category: "math", IsActive: true},
		{Slug: "wordle", Name: "Wordle Bahasa Indonesia", Description: "Tebak kata 5 huruf dalam 6 percobaan!", Category: "language", IsActive: true},
		{Slug: "spelling-bee", Name: "Spelling Bee", Description: "Susun huruf acak menjadi kata yang benar.", Category: "language", IsActive: true},
		{Slug: "word-search", Name: "Word Search", Description: "Cari kata tersembunyi di grid huruf.", Category: "language", IsActive: true},
		{Slug: "crossword", Name: "Crossword Indonesia", Description: "Teka-teki silang Bahasa Indonesia.", Category: "language", IsActive: true},
		{Slug: "flag-quiz", Name: "Flag Quiz", Description: "Tebak nama negara dari gambar benderanya!", Category: "geography", IsActive: true},
		{Slug: "capital-quiz", Name: "Capital City Quiz", Description: "Tebak ibukota dari nama negara.", Category: "geography", IsActive: true},
		{Slug: "sudoku", Name: "Sudoku", Description: "Classic Sudoku 9x9 — isi grid tanpa konflik.", Category: "logic", IsActive: true},
		{Slug: "2048", Name: "2048", Description: "Geser tile, gabungkan angka, capai 2048!", Category: "logic", IsActive: true},
		{Slug: "nonogram", Name: "Nonogram", Description: "Grid puzzle hitam-putih — isi berdasarkan angka.", Category: "logic", IsActive: true},
		{Slug: "element-quiz", Name: "Element Quiz", Description: "Tebak simbol kimia dan nomor atom.", Category: "science", IsActive: true},
		{Slug: "timeline-history", Name: "Timeline History", Description: "Urutkan peristiwa bersejarah.", Category: "history", IsActive: true},
	}
	for _, g := range games {
		var count int64
		database.DB.Model(&model.Game{}).Where("slug = ?", g.Slug).Count(&count)
		if count == 0 {
			g.ID = uuid.New()
			database.DB.Create(&g)
		}
	}
	logger.Log.Info("seeded games", zap.Int("count", len(games)))
}

func seedAchievements() {
	achievements := []model.Achievement{
		{Slug: "first-game", Name: "Pemula", Description: "Main game pertama kali", XPReward: 50, Icon: "play"},
		{Slug: "streak-3", Name: "Konsisten", Description: "Streak 3 hari", XPReward: 100, Icon: "flame"},
		{Slug: "streak-7", Name: "Rajin", Description: "Streak 7 hari", XPReward: 300, Icon: "flame"},
		{Slug: "streak-30", Name: "Dedikasi", Description: "Streak 30 hari", XPReward: 1000, Icon: "award"},
		{Slug: "math-master", Name: "Math Master", Description: "Skor 500+ di Math Quiz", XPReward: 200, Icon: "calculator"},
		{Slug: "wordle-genius", Name: "Wordle Genius", Description: "Tebak Wordle dalam 2 percobaan", XPReward: 300, Icon: "brain"},
		{Slug: "daily-5", Name: "Daily Warrior", Description: "Complete 5 daily challenge", XPReward: 200, Icon: "calendar"},
		{Slug: "top-10", Name: "Elite", Description: "Masuk top 10 leaderboard", XPReward: 500, Icon: "trophy"},
		{Slug: "level-5", Name: "Naik Kelas", Description: "Capai Level 5", XPReward: 0, Icon: "zap"},
		{Slug: "all-games", Name: "Explorer", Description: "Coba semua game", XPReward: 300, Icon: "compass"},
	}
	for _, a := range achievements {
		var count int64
		database.DB.Model(&model.Achievement{}).Where("slug = ?", a.Slug).Count(&count)
		if count == 0 {
			a.ID = uuid.New()
			database.DB.Create(&a)
		}
	}
	logger.Log.Info("seeded achievements", zap.Int("count", len(achievements)))
}
