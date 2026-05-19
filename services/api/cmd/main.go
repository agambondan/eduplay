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
	"github.com/agambondan/eduplay/services/api/pkg/logger"
	"github.com/getsentry/sentry-go"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/fiber/v2/middleware/recover"
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
	)

	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"message": err.Error(),
			})
		},
	})

	app.Use(recover.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: cfg.FrontendURL,
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
	}))

	apiV1 := app.Group("/api/v1")

	// Repositories
	userRepo := repository.NewUserRepository()
	gameRepo := repository.NewGameRepository()
	leadRepo := repository.NewLeaderboardRepository()
	achRepo := repository.NewAchievementRepository()

	// Services
	achSvc := service.NewAchievementService(achRepo)
	authSvc := service.NewAuthService(cfg, userRepo, achSvc)
	userSvc := service.NewUserService(userRepo)
	gameSvc := service.NewGameService(gameRepo, achSvc)
	leadSvc := service.NewLeaderboardService(leadRepo, gameRepo)
	dailySvc := service.NewDailyService(gameRepo)
	aiSvc := service.NewAIService(cfg)

	// Controllers
	authHandler := controller.NewAuthController(authSvc)
	userHandler := controller.NewUserController(userSvc)
	gameHandler := controller.NewGameController(gameSvc)
	leadHandler := controller.NewLeaderboardController(leadSvc)
	dailyHandler := controller.NewDailyController(dailySvc)
	achHandler := controller.NewAchievementController(achSvc)
	aiHandler := controller.NewAIController(aiSvc)

	// Routes
	authGroup := apiV1.Group("/auth")
	authGroup.Post("/register", authHandler.Register)
	authGroup.Post("/login", authHandler.Login)
	authGroup.Post("/refresh", authHandler.Refresh)
	authGroup.Post("/logout", middleware.AuthMiddleware(cfg), authHandler.Logout)

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

	aiGroup := apiV1.Group("/ai", middleware.AuthMiddleware(cfg), limiter.New(limiter.Config{
		Max:        10,
		Expiration: 1 * time.Minute,
	}))
	aiGroup.Post("/questions", aiHandler.GenerateQuestions)

	// Start schedulers
	service.StartDailyScheduler(gameRepo, aiSvc)

	logger.Log.Info("Server starting", zap.String("port", cfg.App.Port))
	if err := app.Listen(":" + cfg.App.Port); err != nil {
		logger.Log.Fatal("Server failed to start", zap.Error(err))
	}
}
