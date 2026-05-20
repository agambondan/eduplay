package config

import (
	"os"

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
	cfg.AvatarUploadPath = os.Getenv("AVATAR_UPLOAD_PATH")
	if cfg.AvatarUploadPath == "" {
		cfg.AvatarUploadPath = "./uploads/avatars"
	}
	cfg.FrontendURL = os.Getenv("FRONTEND_URL")
	return &cfg, nil
}
