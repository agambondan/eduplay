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
    Anthropic struct {
        APIKey string
        Model  string
    }
    FrontendURL string
}

func Load() (*Config, error) {
    v := viper.New()
    v.SetConfigName(".env")
    v.AddConfigPath(".")
    v.AutomaticEnv()
    if err := v.ReadInConfig(); err != nil {
        return nil, err
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
    cfg.Anthropic.APIKey = v.GetString("ANTHROPIC_API_KEY")
    cfg.Anthropic.Model = v.GetString("ANTHROPIC_MODEL")
    cfg.FrontendURL = v.GetString("FRONTEND_URL")
    return &cfg, nil
}
