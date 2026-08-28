package config

import (
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	App struct {
		Env    string
		Port   string
		Secret string
	}
	AvatarUploadPath string
	DB               struct {
		Host     string
		Port     string
		Name     string
		User     string
		Password string
	}
	Redis struct {
		URL string
	}
	JWT struct {
		Secret        string
		AccessExpiry  string
		RefreshExpiry string
	}
	AI struct {
		Provider string
		APIKey   string
		Model    string
		BaseURL  string
	}
	Resend struct {
		APIKey string
		From   string
	}
	Google struct {
		ClientID string
	}
	VAPID struct {
		PublicKey  string
		PrivateKey string
	}
	Midtrans struct {
		ServerKey    string
		ClientKey    string
		IsProduction bool
	}
	CORS struct {
		AllowedOrigins []string
	}
	FrontendURL string
}

func Load() (*Config, error) {
	godotenv.Load()

	var cfg Config
	cfg.App.Env = os.Getenv("APP_ENV")
	cfg.App.Port = os.Getenv("APP_PORT")
	cfg.App.Secret = os.Getenv("APP_SECRET")
	cfg.DB.Host = os.Getenv("DB_HOST")
	cfg.DB.Port = os.Getenv("DB_PORT")
	cfg.DB.Name = os.Getenv("DB_NAME")
	cfg.DB.User = os.Getenv("DB_USER")
	cfg.DB.Password = os.Getenv("DB_PASSWORD")
	cfg.Redis.URL = os.Getenv("REDIS_URL")
	cfg.JWT.Secret = os.Getenv("JWT_SECRET")
	cfg.JWT.AccessExpiry = os.Getenv("JWT_ACCESS_EXPIRY")
	cfg.JWT.RefreshExpiry = os.Getenv("JWT_REFRESH_EXPIRY")
	cfg.AI.Provider = os.Getenv("AI_PROVIDER")
	cfg.AI.APIKey = os.Getenv("AI_API_KEY")
	cfg.AI.Model = os.Getenv("AI_MODEL")
	cfg.AI.BaseURL = os.Getenv("AI_BASE_URL")
	cfg.Resend.APIKey = os.Getenv("RESEND_API_KEY")
	cfg.Resend.From = os.Getenv("RESEND_FROM")
	cfg.Google.ClientID = os.Getenv("GOOGLE_CLIENT_ID")
	cfg.VAPID.PublicKey = os.Getenv("VAPID_PUBLIC_KEY")
	cfg.VAPID.PrivateKey = os.Getenv("VAPID_PRIVATE_KEY")
	cfg.Midtrans.ServerKey = os.Getenv("MIDTRANS_SERVER_KEY")
	cfg.Midtrans.ClientKey = os.Getenv("MIDTRANS_CLIENT_KEY")
	cfg.Midtrans.IsProduction = os.Getenv("MIDTRANS_IS_PRODUCTION") == "true"
	cfg.AvatarUploadPath = os.Getenv("AVATAR_UPLOAD_PATH")
	if cfg.AvatarUploadPath == "" {
		cfg.AvatarUploadPath = "./uploads/avatars"
	}
	cfg.FrontendURL = os.Getenv("FRONTEND_URL")
	cfg.CORS.AllowedOrigins = parseAllowedOrigins(os.Getenv("CORS_ALLOWED_ORIGINS"), cfg.FrontendURL, cfg.App.Env)
	return &cfg, nil
}

// parseAllowedOrigins resolves which browser origins may call the API. There is
// deliberately no wildcard option: the API answers with AllowCredentials, so a
// wildcard would let any site on the internet issue authenticated requests
// carrying the visitor's session cookie.
func parseAllowedOrigins(raw, frontendURL, env string) []string {
	seen := make(map[string]bool)
	out := make([]string, 0, 4)
	add := func(origin string) {
		origin = strings.TrimRight(strings.TrimSpace(origin), "/")
		// A literal "*" is refused rather than passed through: it can never match
		// a real Origin header, so honouring it would silently block every
		// cross-origin request instead of doing what the operator expected.
		if origin == "" || origin == "*" || seen[origin] {
			return
		}
		seen[origin] = true
		out = append(out, origin)
	}

	for _, origin := range strings.Split(raw, ",") {
		add(origin)
	}
	add(frontendURL)

	// Convenience for local work only; production must be explicit.
	if len(out) == 0 && env != "production" {
		add("http://localhost:3000")
		add("http://127.0.0.1:3000")
	}

	return out
}
