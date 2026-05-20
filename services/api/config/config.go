package config

import (
    "github.com/spf13/viper"
)

type Config struct {
    App struct {
        Env   string
        Port  string
        Secret string
    }
    DB struct {
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
    v := viper.New()
    v.SetConfigName(".env")
    v.AddConfigPath(".")
    v.AutomaticEnv()
    if err := v.ReadInConfig(); err != nil {
        if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
            return nil, err
        }
    }
    var cfg Config
    cfg.App.Env = v.GetString("APP_ENV")
    cfg.App.Port = v.GetString("APP_PORT")
    cfg.App.Secret = v.GetString("APP_SECRET")
    cfg.DB.Host = v.GetString("DB_HOST")
    cfg.DB.Port = v.GetString("DB_PORT")
    cfg.DB.Name = v.GetString("DB_NAME")
    cfg.DB.User = v.GetString("DB_USER")
    cfg.DB.Password = v.GetString("DB_PASSWORD")
    cfg.Redis.URL = v.GetString("REDIS_URL")
    cfg.JWT.Secret = v.GetString("JWT_SECRET")
    cfg.JWT.AccessExpiry = v.GetString("JWT_ACCESS_EXPIRY")
    cfg.JWT.RefreshExpiry = v.GetString("JWT_REFRESH_EXPIRY")
	cfg.AI.Provider = v.GetString("AI_PROVIDER")
	cfg.AI.APIKey = v.GetString("AI_API_KEY")
	cfg.AI.Model = v.GetString("AI_MODEL")
	cfg.AI.BaseURL = v.GetString("AI_BASE_URL")
    cfg.Resend.APIKey = v.GetString("RESEND_API_KEY")
    cfg.Resend.From = v.GetString("RESEND_FROM")
    cfg.Google.ClientID = v.GetString("GOOGLE_CLIENT_ID")
    cfg.VAPID.PublicKey = v.GetString("VAPID_PUBLIC_KEY")
    cfg.VAPID.PrivateKey = v.GetString("VAPID_PRIVATE_KEY")
    cfg.FrontendURL = v.GetString("FRONTEND_URL")
    return &cfg, nil
}
