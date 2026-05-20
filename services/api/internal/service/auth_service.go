package service

import (
	"context"
	"errors"
	"time"

	"github.com/agambondan/eduplay/services/api/config"
	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/internal/repository"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/agambondan/eduplay/services/api/pkg/logger"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type RegisterRequest struct {
	Username string `json:"username" validate:"required,min=3,max=30"`
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

type AuthResponse struct {
	User struct {
		ID       uuid.UUID `json:"id"`
		Username string    `json:"username"`
		Email    string    `json:"email"`
		XP       int       `json:"xp"`
		Level    int       `json:"level"`
		Streak   int       `json:"streak"`
	} `json:"user"`
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

type RefreshResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

type AuthService interface {
	Register(req RegisterRequest) (*AuthResponse, error)
	Login(req LoginRequest) (*AuthResponse, error)
	RefreshToken(tokenString string) (*RefreshResponse, error)
	Logout(jti string, expiry time.Duration) error
}

type authService struct {
	cfg      *config.Config
	userRepo repository.UserRepository
	achSvc   interface {
		CheckAndUnlock(userID string, slug string) (bool, error)
	}
}

func NewAuthService(cfg *config.Config, userRepo repository.UserRepository, achSvc interface {
	CheckAndUnlock(userID string, slug string) (bool, error)
}) AuthService {
	return &authService{cfg: cfg, userRepo: userRepo, achSvc: achSvc}
}

func (s *authService) Register(req RegisterRequest) (*AuthResponse, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		return nil, err
	}

	newUser := model.User{
		Username: req.Username,
		Email:    req.Email,
		Password: string(hashedPassword),
	}

	if err := database.DB.Create(&newUser).Error; err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) || (err != nil && err.Error() != "") {
			return nil, errors.New("username or email already exists")
		}
		return nil, err
	}

	return s.generateAuthResponse(&newUser)
}

func (s *authService) Login(req LoginRequest) (*AuthResponse, error) {
	var u model.User
	if err := database.DB.Where("email = ?", req.Email).First(&u).Error; err != nil {
		return nil, errors.New("invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(req.Password)); err != nil {
		return nil, errors.New("invalid credentials")
	}

	now := time.Now()
	if u.LastActive == nil {
		u.Streak = 1
	} else {
		last := u.LastActive.Truncate(24 * time.Hour)
		curr := now.Truncate(24 * time.Hour)
		diff := curr.Sub(last).Hours() / 24

		if diff == 1 {
			u.Streak++
		} else if diff > 1 {
			u.Streak = 1
		}
	}
	u.LastActive = &now
	database.DB.Save(&u)

	if s.achSvc != nil {
		if u.Streak >= 3 {
			s.achSvc.CheckAndUnlock(u.ID.String(), "streak-3")
		}
		if u.Streak >= 7 {
			s.achSvc.CheckAndUnlock(u.ID.String(), "streak-7")
		}
		if u.Streak >= 30 {
			s.achSvc.CheckAndUnlock(u.ID.String(), "streak-30")
		}
	}

	return s.generateAuthResponse(&u)
}

func (s *authService) generateAuthResponse(u *model.User) (*AuthResponse, error) {
	accessExpiry, _ := time.ParseDuration(s.cfg.JWT.AccessExpiry)
	refreshExpiry, _ := time.ParseDuration(s.cfg.JWT.RefreshExpiry)

	accessJTI := uuid.New().String()
	refreshJTI := uuid.New().String()

	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": u.ID.String(),
		"jti": accessJTI,
		"exp": time.Now().Add(accessExpiry).Unix(),
		"typ": "access",
	})
	accessTokenString, err := accessToken.SignedString([]byte(s.cfg.JWT.Secret))
	if err != nil {
		return nil, err
	}

	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": u.ID.String(),
		"jti": refreshJTI,
		"exp": time.Now().Add(refreshExpiry).Unix(),
		"typ": "refresh",
	})
	refreshTokenString, err := refreshToken.SignedString([]byte(s.cfg.JWT.Secret))
	if err != nil {
		return nil, err
	}

	resp := &AuthResponse{
		AccessToken:  accessTokenString,
		RefreshToken: refreshTokenString,
	}
	resp.User.ID = u.ID
	resp.User.Username = u.Username
	resp.User.Email = u.Email
	resp.User.XP = u.XP
	resp.User.Level = u.Level
	resp.User.Streak = u.Streak

	return resp, nil
}

func (s *authService) RefreshToken(tokenString string) (*RefreshResponse, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return []byte(s.cfg.JWT.Secret), nil
	})

	if err != nil || !token.Valid {
		return nil, errors.New("invalid refresh token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || claims["typ"] != "refresh" {
		return nil, errors.New("invalid token type")
	}

	jti, _ := claims["jti"].(string)
	ctx := context.Background()
	val, _ := database.RDB.Get(ctx, "jwt:blacklist:"+jti).Result()
	if val != "" {
		return nil, errors.New("token revoked")
	}

	sub, _ := claims["sub"].(string)
	var u model.User
	if err := database.DB.Where("id = ?", sub).First(&u).Error; err != nil {
		return nil, errors.New("user not found")
	}

	// Blacklist old refresh token (rotation)
	refreshExpiry, _ := time.ParseDuration(s.cfg.JWT.RefreshExpiry)
	if jti != "" {
		database.RDB.Set(ctx, "jwt:blacklist:"+jti, "rotated", refreshExpiry)
	}

	accessExpiry, _ := time.ParseDuration(s.cfg.JWT.AccessExpiry)
	accessJTI := uuid.New().String()
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": u.ID.String(),
		"jti": accessJTI,
		"exp": time.Now().Add(accessExpiry).Unix(),
		"typ": "access",
	})

	accessTokenString, err := accessToken.SignedString([]byte(s.cfg.JWT.Secret))
	if err != nil {
		return nil, err
	}

	refreshJTI := uuid.New().String()
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": u.ID.String(),
		"jti": refreshJTI,
		"exp": time.Now().Add(refreshExpiry).Unix(),
		"typ": "refresh",
	})

	refreshTokenString, err := refreshToken.SignedString([]byte(s.cfg.JWT.Secret))
	if err != nil {
		return nil, err
	}

	return &RefreshResponse{
		AccessToken:  accessTokenString,
		RefreshToken: refreshTokenString,
	}, nil
}

func (s *authService) Logout(jti string, expiry time.Duration) error {
	ctx := context.Background()
	err := database.RDB.Set(ctx, "jwt:blacklist:"+jti, "revoked", expiry).Err()
	if err != nil {
		logger.Log.Error("failed to blacklist token", zap.Error(err))
		return err
	}
	return nil
}
