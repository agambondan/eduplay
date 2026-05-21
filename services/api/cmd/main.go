// @title EduPlay API
// @version 1.0
// @description Educational Mini Games Platform API
// @host localhost:8080
// @BasePath /api/v1
// @SecurityDefinitions.apikey BearerAuth
// @in header
// @name Authorization

package main

import (
	"os"
	"time"

	"github.com/agambondan/eduplay/services/api/config"
	_ "github.com/agambondan/eduplay/services/api/docs"
	"github.com/agambondan/eduplay/services/api/internal/controller"
	"github.com/agambondan/eduplay/services/api/internal/middleware"
	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/internal/repository"
	"github.com/agambondan/eduplay/services/api/internal/seeder"
	"github.com/agambondan/eduplay/services/api/internal/service"
	"github.com/agambondan/eduplay/services/api/internal/ws"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/agambondan/eduplay/services/api/pkg/email"
	"github.com/agambondan/eduplay/services/api/pkg/logger"
	"github.com/getsentry/sentry-go"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/swagger"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
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
		&model.Friend{},
		&model.Country{},
		&model.ChemicalElement{},
		&model.HistoryEvent{},
		&model.WordleWord{},
		&model.MultiplayerMatch{},
		&model.MatchParticipant{},
		&model.GhostReplay{},
		&model.AsyncChallenge{},
		&model.WordChainGame{},
		&model.ScoreChallenge{},
		&model.Referral{},
		&model.Tournament{},
		&model.TournamentPlayer{},
		&model.TournamentMatch{},
		&model.BattleshipMatch{},
		&model.Ad{},
		&model.BlogPost{},
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

	app.Get("/swagger/*", swagger.HandlerDefault)

	app.Use(recover.New())
	app.Use(middleware.RequestLogger())
	app.Static("/uploads", "./uploads")
	app.Use(cors.New(cors.Config{
		AllowOriginsFunc: func(origin string) bool {
			return true
		},
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
	userSvc := service.NewUserService(userRepo, cfg)
	leadSvc := service.NewLeaderboardService(leadRepo, gameRepo)
	gameSvc := service.NewGameService(gameRepo, achSvc, leadSvc)
	dailySvc := service.NewDailyService(gameRepo, achSvc)
	aiSvc := service.NewAIService(cfg)
	pushSvc := service.NewPushService(cfg)
	supportSvc := service.NewSupportService(emailCl)
	subSvc := service.NewSubscriptionService(cfg)
	friendSvc := service.NewFriendService()
	challengeSvc := service.NewChallengeService(aiSvc, pushSvc)
	wordChainSvc := service.NewWordChainService(cfg, aiSvc)
	roomSvc := service.NewRoomService()
	scoreChallengeSvc := service.NewScoreChallengeService()
	mpLeadSvc := service.NewMultiplayerLeaderboardService()
	rematchSvc := service.NewRematchService(roomSvc)
	tournamentSvc := service.NewTournamentService()
	battleshipSvc := service.NewBattleshipService(pushSvc)

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
	friendHandler := controller.NewFriendController(friendSvc)
	contentHandler := controller.NewContentController()
	challengeHandler := controller.NewChallengeController(challengeSvc)
	wordChainHandler := controller.NewWordChainController(wordChainSvc)
	roomHandler := controller.NewRoomController(roomSvc)
	referralSvc := service.NewReferralService()
	referralHandler := controller.NewReferralController(referralSvc)
	mpLeadHandler := controller.NewMultiplayerLeaderboardController(mpLeadSvc)
	rematchHandler := controller.NewRematchController(rematchSvc)
	scoreChallengeHandler := controller.NewScoreChallengeController(scoreChallengeSvc)
	tournamentHandler := controller.NewTournamentController(tournamentSvc)
	battleshipHandler := controller.NewBattleshipController(battleshipSvc)
	adRepo := repository.NewAdRepository()
	adSvc := service.NewAdService(adRepo)
	adHandler := controller.NewAdController(adSvc)
	blogRepo := repository.NewBlogRepository()
	blogSvc := service.NewBlogService(blogRepo)
	blogHandler := controller.NewBlogController(blogSvc)

	// WebSocket
	roomMgr := ws.NewRoomManager()
	roomMgr.StartCleanup(5 * time.Minute)
	hub := ws.NewHub(cfg, roomMgr)
	hub.SetAchievementChecker(achSvc)
	go hub.Run()
	mmSvc := ws.NewMatchmakingService(hub)
	wsHandler := controller.NewWSController(hub, mmSvc)

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
	authGroup.Post("/guest", authHandler.GuestLogin)
	authGroup.Post("/request-verification", middleware.AuthMiddleware(cfg), authHandler.RequestVerification)

	userGroup := apiV1.Group("/user", middleware.AuthMiddleware(cfg))
	userGroup.Get("/me", userHandler.GetMe)
	userGroup.Get("/stats", userHandler.GetStats)
	userGroup.Patch("/profile", userHandler.UpdateProfile)
	userGroup.Post("/avatar", userHandler.UploadAvatar)
	userGroup.Get("/achievements", achHandler.GetUserAchievements)

	gameGroup := apiV1.Group("/games")
	gameGroup.Get("/", gameHandler.ListGames)
	gameGroup.Get("/onet/config", func(c *fiber.Ctx) error {
		cfg, err := adminSvc.GetOnetConfig()
		if err != nil {
			return c.JSON(fiber.Map{"success": true, "data": struct{}{}})
		}
		return c.JSON(fiber.Map{"success": true, "data": cfg})
	})
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
	adminGroup.Get("/games/onet/config", adminHandler.GetOnetConfig)
	adminGroup.Post("/games/onet/config", adminHandler.SetOnetConfig)
	adminGroup.Get("/feature-flags", adminHandler.GetFeatureFlags)
	adminGroup.Post("/feature-flags/:key", adminHandler.SetFeatureFlag)
	adminGroup.Get("/reported-usernames", adminHandler.ListReportedUsernames)
	adminGroup.Get("/support", adminHandler.ListSupportTickets)
	adminGroup.Patch("/support/:id", adminHandler.UpdateTicketStatus)
	adminGroup.Get("/analytics", adminHandler.GetAnalytics)
	adminGroup.Get("/tournaments", adminHandler.ListTournaments)
	adminGroup.Post("/tournaments/:id/cancel", adminHandler.CancelTournament)

	pushGroup := apiV1.Group("/push", middleware.AuthMiddleware(cfg))
	pushGroup.Post("/subscribe", pushHandler.Subscribe)
	pushGroup.Post("/unsubscribe", pushHandler.Unsubscribe)
	apiV1.Get("/push/vapid-public-key", pushHandler.VapidPublicKey)

	apiV1.Post("/support", supportHandler.CreateTicket)

	apiV1.Post("/subscribe/webhook", subHandler.MidtransWebhook)

	subGroup := apiV1.Group("/subscribe", middleware.AuthMiddleware(cfg))
	subGroup.Post("/", subHandler.Subscribe)
	subGroup.Get("/status", subHandler.Status)
	subGroup.Post("/cancel", subHandler.Cancel)

	referralGroup := apiV1.Group("/referral", middleware.AuthMiddleware(cfg))
	referralGroup.Get("/stats", referralHandler.GetStats)
	referralGroup.Post("/apply", referralHandler.Apply)

	friendGroup := apiV1.Group("/friends", middleware.AuthMiddleware(cfg))
	friendGroup.Get("/", friendHandler.ListFriends)
	friendGroup.Get("/search", friendHandler.SearchUsers)
	friendGroup.Get("/requests", friendHandler.ListRequests)
	friendGroup.Post("/request", friendHandler.SendRequest)
	friendGroup.Post("/:id/accept", friendHandler.AcceptRequest)
	friendGroup.Post("/:id/decline", friendHandler.DeclineRequest)
	friendGroup.Delete("/:id", friendHandler.RemoveFriend)

	contentGroup := apiV1.Group("/content")
	contentGroup.Get("/flags", contentHandler.GetFlags)
	contentGroup.Get("/capitals", contentHandler.GetCapitals)
	contentGroup.Get("/elements", contentHandler.GetElements)
	contentGroup.Get("/history", contentHandler.GetHistoryEvents)
	contentGroup.Get("/words/wordle", contentHandler.GetWordleWords)

	challengeGroup := apiV1.Group("/challenges", middleware.AuthMiddleware(cfg))
	challengeGroup.Post("/", challengeHandler.Create)
	challengeGroup.Get("/", challengeHandler.List)
	challengeGroup.Get("/:id", challengeHandler.Get)
	challengeGroup.Post("/:id/submit", challengeHandler.Submit)

	wordChainGroup := apiV1.Group("/wordchain", middleware.AuthMiddleware(cfg))
	wordChainGroup.Get("/", wordChainHandler.List)
	wordChainGroup.Post("/", wordChainHandler.Create)
	wordChainGroup.Get("/:id", wordChainHandler.Get)
	wordChainGroup.Post("/:id/word", wordChainHandler.SubmitWord)

	roomGroup := apiV1.Group("/rooms", middleware.AuthMiddleware(cfg))
	roomGroup.Post("/", roomHandler.Create)
	roomGroup.Get("/:code", roomHandler.Get)
	roomGroup.Post("/:code/join", roomHandler.Join)
	roomGroup.Delete("/:code/leave", roomHandler.Leave)
	roomGroup.Post("/:code/start", roomHandler.Start)
	roomGroup.Put("/:code/settings", roomHandler.UpdateSettings)
	roomGroup.Delete("/:code/kick/:user_id", roomHandler.Kick)

	mpLeadGroup := apiV1.Group("/multiplayer/leaderboard", middleware.OptionalAuthMiddleware(cfg))
	mpLeadGroup.Get("/:slug", mpLeadHandler.GetLeaderboard)
	mpLeadGroup.Get("/global", mpLeadHandler.GetGlobal)
	mpLeadGroup.Get("/user/stats", middleware.AuthMiddleware(cfg), mpLeadHandler.GetUserStats)

	apiV1.Post("/rooms/:code/rematch", middleware.AuthMiddleware(cfg), rematchHandler.CreateRematch)

	scoreChallengeGroup := apiV1.Group("/score-challenges", middleware.AuthMiddleware(cfg))
	scoreChallengeGroup.Post("/", scoreChallengeHandler.Create)
	scoreChallengeGroup.Get("/", scoreChallengeHandler.List)
	scoreChallengeGroup.Get("/:link", scoreChallengeHandler.GetByLink)
	scoreChallengeGroup.Post("/:link/accept", scoreChallengeHandler.Accept)
	scoreChallengeGroup.Post("/:link/submit", scoreChallengeHandler.SubmitScore)

	tournamentGroup := apiV1.Group("/tournaments", middleware.AuthMiddleware(cfg))
	tournamentGroup.Get("/", tournamentHandler.List)
	tournamentGroup.Post("/", tournamentHandler.Create)
	tournamentGroup.Get("/:id", tournamentHandler.Get)
	tournamentGroup.Post("/:id/join", tournamentHandler.Join)
	tournamentGroup.Post("/:id/start", tournamentHandler.Start)
	tournamentGroup.Post("/:id/matches/:match_id/report", tournamentHandler.ReportMatch)

	battleshipGroup := apiV1.Group("/battleship", middleware.AuthMiddleware(cfg))
	battleshipGroup.Get("/", battleshipHandler.List)
	battleshipGroup.Post("/", battleshipHandler.Create)
	battleshipGroup.Get("/:id", battleshipHandler.Get)
	battleshipGroup.Post("/:id/target", battleshipHandler.Target)
	battleshipGroup.Post("/:id/shot", battleshipHandler.Shot)
	battleshipGroup.Post("/:id/reveal", battleshipHandler.Reveal)
	battleshipGroup.Post("/:id/resign", battleshipHandler.Resign)

	// Ads — public slot query + admin CRUD
	apiV1.Get("/ads", adHandler.GetActiveAd)
	adminGroup.Get("/ads", adHandler.List)
	adminGroup.Post("/ads", adHandler.Create)
	adminGroup.Patch("/ads/:id", adHandler.Update)
	adminGroup.Delete("/ads/:id", adHandler.Delete)

	// Blog — public + admin
	blogGroup := apiV1.Group("/blog")
	blogGroup.Get("/", blogHandler.ListPosts)
	blogGroup.Get("/:slug", blogHandler.GetPost)
	adminGroup.Get("/blog", blogHandler.AdminList)
	adminGroup.Post("/blog", blogHandler.AdminCreate)
	adminGroup.Patch("/blog/:id", blogHandler.AdminUpdate)
	adminGroup.Delete("/blog/:id", blogHandler.AdminDelete)

	apiV1.Get("/ws/game/:room_id", wsHandler.WSHandler())

	multiplayerGroup := apiV1.Group("/multiplayer", middleware.AuthMiddleware(cfg))
	multiplayerGroup.Post("/quickmatch", wsHandler.QuickMatch)
	multiplayerGroup.Post("/quickmatch/bot", wsHandler.QuickMatchBot)
	multiplayerGroup.Delete("/quickmatch", wsHandler.CancelQuickMatch)

	// Start schedulers
	service.StartDailyScheduler(gameRepo, aiSvc)
	service.StartPushScheduler(cfg)
	service.StartChallengeExpiryCleanup()
	service.StartGhostReplayCleanup()
	service.StartTournamentScheduler()

	logger.Log.Info("Server starting", zap.String("port", cfg.App.Port))
	if err := app.Listen(":" + cfg.App.Port); err != nil {
		logger.Log.Fatal("Server failed to start", zap.Error(err))
	}
}

func seedData() {
	seedGames()
	seedAchievements()
	seedUsers()
	seeder.SeedGameContent()
	seedBlogPosts()
}

func seedBlogPosts() {
	posts := []model.BlogPost{
		{
			Title: "Cara Belajar Matematika Jadi Seru dengan Game Edukasi",
			Slug:  "belajar-matematika-seru-dengan-game-edukasi",
			Excerpt: "Matematika sering dianggap sulit dan membosankan. Tapi dengan pendekatan gamifikasi, belajar jadi menyenangkan!",
			Content: `<h2>Belajar Matematika Tidak Harus Membosankan</h2>
<p>Matematika adalah salah satu mata pelajaran yang paling ditakuti oleh pelajar di Indonesia. Menurut survei, lebih dari 60% pelajar SMP mengaku kesulitan dengan matematika. Tapi tahukah kamu? Matematika sebenarnya bisa sangat seru jika dikemas dengan cara yang tepat.</p>
<h3>Mengapa Game Edukasi Efektif?</h3>
<p>Game edukasi menggabungkan dua elemen kuat: pembelajaran dan hiburan. Ketika belajar terasa seperti bermain, otak kita lebih mudah menyerap informasi. Beberapa penelitian menunjukkan bahwa gamifikasi bisa meningkatkan retensi materi hingga 40%.</p>
<h3>Fitur Unggulan Math Quiz Blitz</h3>
<ul>
<li>Soal tak terbatas berkat AI generator</li>
<li>Tingkat kesulitan Easy, Medium, Hard</li>
<li>Timer dan scoring yang menantang</li>
<li>Leaderboard untuk kompetisi sehat</li>
</ul>
<p>Coba mainkan Math Quiz Blitz di EduPlay sekarang juga!</p>`,
			Category:    "tips-belajar",
			Tags:        "matematika,game edukasi,belajar seru",
			Author:      "Tim EduPlay",
			IsPublished: true,
		},
		{
			Title: "7 Manfaat Bermain Puzzle untuk Kecerdasan Otak",
			Slug:  "manfaat-bermain-puzzle-untuk-kecerdasan-otak",
			Excerpt: "Bermain puzzle bukan sekadar hiburan. Ini dia 7 manfaat ilmiah bermain puzzle untuk otak kamu.",
			Content: `<h2>Puzzle: Hiburan yang Mencerdaskan</h2>
<p>Puzzle seperti Sudoku, Nonogram, dan 2048 bukan hanya game yang menyenangkan — mereka juga punya dampak positif pada fungsi kognitif otak.</p>
<h3>1. Meningkatkan Daya Ingat</h3>
<p>Saat bermain puzzle, otak kita bekerja membentuk dan mengingat pola, warna, dan posisi. Ini melatih memori jangka pendek dan panjang.</p>
<h3>2. Melatih Pemecahan Masalah</h3>
<p>Setiap puzzle adalah masalah yang harus dipecahkan. Semakin sering melakukannya, semakin terasah kemampuan problem-solving kamu.</p>
<h3>3. Meningkatkan Kecepatan Berpikir</h3>
<p>Game seperti Math Quiz Blitz yang menggunakan timer melatih otak untuk berpikir cepat di bawah tekanan.</p>
<h3>4. Mengurangi Stres</h3>
<p>Fokus pada puzzle bisa menjadi meditasi aktif yang membantu menenangkan pikiran dari stres sehari-hari.</p>
<p>Mulai latih otak kamu dengan game-game puzzle di EduPlay!</p>`,
			Category:    "tips-belajar",
			Tags:        "puzzle,sudoku,nonogram,kecerdasan",
			Author:      "Tim EduPlay",
			IsPublished: true,
		},
		{
			Title: "Mengenal Wordle Bahasa Indonesia — Game Tebak Kata Populer",
			Slug:  "mengenal-wordle-bahasa-indonesia",
			Excerpt: "Wordle versi Bahasa Indonesia? Ada! Tebak kata 5 huruf dalam 6 percobaan. Simak cara main dan tipsnya.",
			Content: `<h2>Apa Itu Wordle?</h2>
<p>Wordle adalah game tebak kata yang fenomenal di seluruh dunia. Pemain harus menebak kata 5 huruf dalam 6 percobaan. Setiap tebakan memberikan kode warna: hijau untuk huruf yang tepat di posisi tepat, kuning untuk huruf yang ada tapi posisi salah, dan abu-abu untuk huruf yang tidak ada sama sekali.</p>
<h2>Wordle Bahasa Indonesia di EduPlay</h2>
<p>EduPlay menghadirkan Wordle dalam Bahasa Indonesia dengan ribuan kata dari KBBI. Fitur lengkapnya:</p>
<ul>
<li>Daily Mode: satu kata per hari, sama untuk semua pemain</li>
<li>Practice Mode: main sebanyak yang kamu mau</li>
<li>Statistik pribadi: streak, win rate, distribusi tebakan</li>
<li>Share hasil ke WhatsApp dengan pola emoji</li>
</ul>
<h3>Tips Jitu Main Wordle</h3>
<ol>
<li>Mulai dengan kata yang punya banyak vokal seperti "BENAR" atau "SUARA"</li>
<li>Perhatikan posisi huruf hijau dan kuning</li>
<li>Jangan gunakan huruf yang sudah pasti abu-abu</li>
<li>Gunakan fitur hint jika mentok (rewarded ad)</li>
</ol>
<p>Main Wordle Bahasa Indonesia sekarang di EduPlay!</p>`,
			Category:    "panduan-game",
			Tags:        "wordle,bahasa indonesia,tebak kata,kbbi",
			Author:      "Tim EduPlay",
			IsPublished: true,
		},
	}
	for _, p := range posts {
		var count int64
		database.DB.Model(&model.BlogPost{}).Where("slug = ?", p.Slug).Count(&count)
		if count > 0 {
			continue
		}
		now := time.Now()
		p.ID = uuid.New()
		p.PublishedAt = &now
		database.DB.Create(&p)
	}
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
		{Slug: "memory-match", Name: "Memory Match", Description: "Cocokkan pasangan kartu dalam waktu tercepat.", Category: "logic", IsActive: true},
		{Slug: "typing-speed", Name: "Typing Speed", Description: "Ketik kata Indonesia secepat mungkin dalam 60 detik.", Category: "language", IsActive: true},
		{Slug: "simon-says", Name: "Simon Says", Description: "Ingat dan ulangi urutan warna yang menyala.", Category: "logic", IsActive: true},
		{Slug: "snake", Name: "Snake Classic", Description: "Makan bola, panjangkan ular, jangan tabrak dirimu sendiri!", Category: "arcade", IsActive: true},
		{Slug: "brick-breaker", Name: "Brick Breaker", Description: "Hancurkan semua bata dengan bola dan paddle!", Category: "arcade", IsActive: true},
		{Slug: "number-match", Name: "Number Match", Description: "Coret pasangan angka yang sama atau berjumlah 10.", Category: "math", IsActive: true},
		{Slug: "fraction-visualizer", Name: "Fraction Visualizer", Description: "Kenali, bandingkan, dan sederhanakan pecahan secara visual.", Category: "math", IsActive: true},
		{Slug: "onet", Name: "Onet", Description: "Cocokkan tile berpasangan dengan jalur bersih. Maksimal 2 tikungan!", Category: "logic", IsActive: true},
		{Slug: "trivia-challenge", Name: "Trivia Challenge", Description: "Tantang teman dengan set soal yang sama, bandingkan skor!", Category: "multiplayer", IsActive: true},
		{Slug: "word-chain", Name: "Word Chain", Description: "Sambung kata Bahasa Indonesia — tantang teman atau bot!", Category: "multiplayer", IsActive: true},
		{Slug: "math-battle", Name: "Math Battle", Description: "Head-to-head real-time math battle melawan pemain lain atau bot!", Category: "multiplayer", IsActive: true},
		{Slug: "quiz-showdown", Name: "Quiz Showdown", Description: "Real-time quiz battle 2-4 player — siapa paling cepat & benar!", Category: "multiplayer", IsActive: true},
		{Slug: "wordle-duel", Name: "Wordle Duel", Description: "Tebak kata 5 huruf yang sama — siapa lebih cepat?", Category: "multiplayer", IsActive: true},
		{Slug: "sudoku-race", Name: "Sudoku Race", Description: "Selesaikan puzzle Sudoku yang sama — duluan menang!", Category: "multiplayer", IsActive: true},
		{Slug: "flag-team-battle", Name: "Flag Quiz Team Battle", Description: "Kuis bendera 2v2 dengan buzzer cepat dan skor tim.", Category: "multiplayer", IsActive: true},
		{Slug: "battleship-math", Name: "Battleship Math", Description: "Tembak koordinat lawan dengan menjawab soal matematika terlebih dahulu.", Category: "multiplayer", IsActive: true},
		{Slug: "math-tournament", Name: "Math Tournament", Description: "Bracket single-elimination berbasis Math Battle dengan 4-16 pemain.", Category: "multiplayer", IsActive: true},
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
		{Slug: "mp-first-win", Name: "First Blood", Description: "Dapat kemenangan pertamamu di multiplayer", XPReward: 100, Icon: "trophy"},
		{Slug: "mp-10-wins", Name: "Multiplayer Veteran", Description: "Kumpulkan 10 kemenangan multiplayer", XPReward: 500, Icon: "award"},
		{Slug: "mp-bot-slayer", Name: "Bot Slayer", Description: "Kalahkan bot di multiplayer", XPReward: 100, Icon: "zap"},
		{Slug: "tournament-champion", Name: "Tournament Champion", Description: "Menjadi champion Math Tournament", XPReward: 0, Icon: "crown"},
		{Slug: "tournament-finalist", Name: "Tournament Finalist", Description: "Masuk grand final Math Tournament", XPReward: 0, Icon: "award"},
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

func seedUsers() {
	users := []struct {
		Username string
		Email    string
		Password string
	}{
		{Username: "demo", Email: "demo@demo.com", Password: "demo123"},
	}
	for _, u := range users {
		var count int64
		database.DB.Model(&model.User{}).Where("email = ?", u.Email).Count(&count)
		if count > 0 {
			// Ensure existing seed users always have admin role
			database.DB.Model(&model.User{}).Where("email = ?", u.Email).Update("role", "admin")
			continue
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(u.Password), 12)
		if err != nil {
			logger.Log.Warn("failed to hash password for seed user", zap.String("email", u.Email), zap.Error(err))
			continue
		}
		user := model.User{
			Username: u.Username,
			Email:    u.Email,
			Password: string(hash),
			Role:     "admin",
		}
		database.DB.Create(&user)
	}
	logger.Log.Info("seeded users")
}
