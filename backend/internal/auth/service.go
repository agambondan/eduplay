package auth

import (
	"context"
	"errors"
	"time"

	"github.com/agambondan/eduplay/backend/config"
	"github.com/agambondan/eduplay/backend/internal/user"
	"github.com/agambondan/eduplay/backend/pkg/database"
	"github.com/agambondan/eduplay/backend/pkg/logger"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type Service interface {
	Register(req RegisterRequest) (*AuthResponse, error)
	Login(req LoginRequest) (*AuthResponse, error)
	RefreshToken(tokenString string) (string, error)
	Logout(jti string, expiry time.Duration) error
}

type service struct {
	cfg *config.Config
}

func NewService(cfg *config.Config) Service {
	return &service{cfg: cfg}
}

func (s *service) Register(req RegisterRequest) (*AuthResponse, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		return nil, err
	}

	newUser := user.User{
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

func (s *service) Login(req LoginRequest) (*AuthResponse, error) {
	var u user.User
	if err := database.DB.Where("email = ?", req.Email).First(&u).Error; err != nil {
		return nil, errors.New("invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(req.Password)); err != nil {
		return nil, errors.New("invalid credentials")
	}

	now := time.Now()
	u.LastActive = &now
	database.DB.Save(&u)

	return s.generateAuthResponse(&u)
}

func (s *service) generateAuthResponse(u *user.User) (*AuthResponse, error) {
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

func (s *service) RefreshToken(tokenString string) (string, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return []byte(s.cfg.JWT.Secret), nil
	})

	if err != nil || !token.Valid {
		return "", errors.New("invalid refresh token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || claims["typ"] != "refresh" {
		return "", errors.New("invalid token type")
	}

	jti := claims["jti"].(string)
	ctx := context.Background()
	val, _ := database.RDB.Get(ctx, "jwt:blacklist:"+jti).Result()
	if val != "" {
		return "", errors.New("token revoked")
	}

	sub := claims["sub"].(string)
	var u user.User
	if err := database.DB.Where("id = ?", sub).First(&u).Error; err != nil {
		return "", errors.New("user not found")
	}

	accessExpiry, _ := time.ParseDuration(s.cfg.JWT.AccessExpiry)
	accessJTI := uuid.New().String()
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": u.ID.String(),
		"jti": accessJTI,
		"exp": time.Now().Add(accessExpiry).Unix(),
		"typ": "access",
	})

	newAccessTokenString, err := accessToken.SignedString([]byte(s.cfg.JWT.Secret))
	if err != nil {
		return "", err
	}

	return newAccessTokenString, nil
}

func (s *service) Logout(jti string, expiry time.Duration) error {
	ctx := context.Background()
	err := database.RDB.Set(ctx, "jwt:blacklist:"+jti, "revoked", expiry).Err()
	if err != nil {
		logger.Log.Error("failed to blacklist token", zap.Error(err))
		return err
	}
	return nil
}
