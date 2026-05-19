package main

import (
	"github.com/agambondan/eduplay/backend/config"
	"github.com/agambondan/eduplay/backend/internal/achievement"
	"github.com/agambondan/eduplay/backend/internal/ai"
	"github.com/agambondan/eduplay/backend/internal/auth"
	"github.com/agambondan/eduplay/backend/internal/daily"
	"github.com/agambondan/eduplay/backend/internal/game"
	"github.com/agambondan/eduplay/backend/internal/leaderboard"
	"github.com/agambondan/eduplay/backend/internal/user"
	"github.com/agambondan/eduplay/backend/pkg/database"
	"github.com/agambondan/eduplay/backend/pkg/logger"
	"github.com/getsentry/sentry-go"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"go.uber.org/zap"
	"os"
	"time"
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
		&user.User{},
		&game.Game{},
		&game.GameSession{},
		&game.UserHighscore{},
		&daily.DailyChallenge{},
		&daily.DailySubmission{},
		&achievement.Achievement{},
		&achievement.UserAchievement{},
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
	userRepo := user.NewRepository()
	gameRepo := game.NewRepository()
	leadRepo := leaderboard.NewRepository()
	achRepo := achievement.NewRepository()

	// Services
	achSvc := achievement.NewService(achRepo)
	authSvc := auth.NewService(cfg, userRepo, achSvc)
	userSvc := user.NewService(userRepo)
	gameSvc := game.NewService(gameRepo)
	leadSvc := leaderboard.NewService(leadRepo, gameRepo)
	dailySvc := daily.NewService(gameRepo)
	aiSvc := ai.NewService(cfg)

	// Handlers
	authHandler := auth.NewHandler(authSvc)
	userHandler := user.NewHandler(userSvc)
	gameHandler := game.NewHandler(gameSvc)
	leadHandler := leaderboard.NewHandler(leadSvc)
	dailyHandler := daily.NewHandler(dailySvc)
	achHandler := achievement.NewHandler(achSvc)
	aiHandler := ai.NewHandler(aiSvc)

	// Routes
	authGroup := apiV1.Group("/auth")
	authGroup.Post("/register", authHandler.Register)
	authGroup.Post("/login", authHandler.Login)
	authGroup.Post("/refresh", authHandler.Refresh)
	authGroup.Post("/logout", auth.Middleware(cfg), authHandler.Logout)

	userGroup := apiV1.Group("/user", auth.Middleware(cfg))
	userGroup.Get("/me", userHandler.GetMe)
	userGroup.Get("/stats", userHandler.GetStats)
	userGroup.Patch("/profile", userHandler.UpdateProfile)
	userGroup.Get("/achievements", achHandler.GetUserAchievements)

	gameGroup := apiV1.Group("/games")
	gameGroup.Get("/", gameHandler.ListGames)
	gameGroup.Get("/:slug", gameHandler.GetGame)
	gameGroup.Post("/:slug/score", auth.Middleware(cfg), gameHandler.SubmitScore)

	leadGroup := apiV1.Group("/leaderboard", auth.OptionalMiddleware(cfg))
	leadGroup.Get("/game/:slug", leadHandler.GetGameLeaderboard)
	leadGroup.Get("/global", leadHandler.GetGlobalLeaderboard)

	dailyGroup := apiV1.Group("/daily")
	dailyGroup.Get("/", dailyHandler.GetDailyChallenge)
	dailyGroup.Post("/submit", auth.Middleware(cfg), dailyHandler.SubmitDailyChallenge)

	aiGroup := apiV1.Group("/ai", auth.Middleware(cfg), limiter.New(limiter.Config{
		Max:        10,
		Expiration: 1 * time.Minute,
	}))
	aiGroup.Post("/questions", aiHandler.GenerateQuestions)

	// Start schedulers
	daily.StartScheduler(gameRepo, aiSvc)

	logger.Log.Info("Server starting", zap.String("port", cfg.App.Port))
	if err := app.Listen(":" + cfg.App.Port); err != nil {
		logger.Log.Fatal("Server failed to start", zap.Error(err))
	}
}
