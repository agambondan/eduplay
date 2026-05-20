package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/agambondan/eduplay/services/api/config"
	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/internal/repository"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/agambondan/eduplay/services/api/pkg/email"
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

type ForgotPasswordRequest struct {
	Email string `json:"email" validate:"required,email"`
}

type ResetPasswordRequest struct {
	Token       string `json:"token" validate:"required"`
	NewPassword string `json:"new_password" validate:"required,min=6"`
}

type GoogleLoginRequest struct {
	IDToken string `json:"id_token" validate:"required"`
}

type AuthResponse struct {
	User struct {
		ID            uuid.UUID  `json:"id"`
		Username      string     `json:"username"`
		Email         string     `json:"email"`
		XP            int        `json:"xp"`
		Level         int        `json:"level"`
		Streak        int        `json:"streak"`
		AvatarColor   string     `json:"avatar_color"`
		EmailVerified bool       `json:"email_verified"`
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
	GoogleLogin(req GoogleLoginRequest) (*AuthResponse, error)
	GuestLogin() (*AuthResponse, error)
	RefreshToken(tokenString string) (*RefreshResponse, error)
	Logout(jti string, expiry time.Duration) error
	RequestVerificationEmail(userID string) error
	VerifyEmail(token string) error
	ForgotPassword(req ForgotPasswordRequest) error
	ResetPassword(req ResetPasswordRequest) error
}

type authService struct {
	cfg        *config.Config
	userRepo   repository.UserRepository
	emailCl    *email.ResendClient
	achSvc     interface {
		CheckAndUnlock(userID string, slug string) (bool, error)
	}
}

func NewAuthService(cfg *config.Config, userRepo repository.UserRepository, emailCl *email.ResendClient, achSvc interface {
	CheckAndUnlock(userID string, slug string) (bool, error)
}) AuthService {
	return &authService{cfg: cfg, userRepo: userRepo, emailCl: emailCl, achSvc: achSvc}
}

func generateToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
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

	if s.emailCl != nil {
		go s.sendVerificationEmail(&newUser)
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
			if u.StreakFreeze > 0 {
				u.StreakFreeze--
			} else {
				u.Streak = 1
			}
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

func (s *authService) AvatarColors() []string {
	return []string{
		"#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
		"#EC4899", "#06B6D4", "#F97316", "#22C55E", "#6366F1",
	}
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
	resp.User.AvatarColor = u.AvatarColor
	resp.User.EmailVerified = u.EmailVerifiedAt != nil

	return resp, nil
}

func (s *authService) GuestLogin() (*AuthResponse, error) {
	guestID := uuid.New().String()
	accessExpiry, _ := time.ParseDuration(s.cfg.JWT.AccessExpiry)

	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":   guestID,
		"jti":   uuid.New().String(),
		"exp":   time.Now().Add(accessExpiry).Unix(),
		"typ":   "access",
		"guest": true,
	})
	accessTokenString, err := accessToken.SignedString([]byte(s.cfg.JWT.Secret))
	if err != nil {
		return nil, err
	}

	resp := &AuthResponse{
		AccessToken:  accessTokenString,
		RefreshToken: "",
	}
	resp.User.ID = uuid.MustParse(guestID)
	resp.User.Username = "Tamu"
	resp.User.AvatarColor = "#6B7280"

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

	ctx := context.Background()
	jti, _ := claims["jti"].(string)
	val, _ := database.RDB.Get(ctx, "jwt:blacklist:"+jti).Result()
	if val != "" {
		return nil, errors.New("token revoked")
	}

	sub, _ := claims["sub"].(string)
	var u model.User
	if err := database.DB.Where("id = ?", sub).First(&u).Error; err != nil {
		return nil, errors.New("user not found")
	}

	refreshExpiry, _ := time.ParseDuration(s.cfg.JWT.RefreshExpiry)
	if jti != "" {
		database.RDB.Set(ctx, "jwt:blacklist:"+jti, "rotated", refreshExpiry)
	}

	return s.generateRefreshTokens(u.ID.String(), refreshExpiry)
}

func (s *authService) generateRefreshTokens(sub string, refreshExpiry time.Duration) (*RefreshResponse, error) {
	accessExpiry, _ := time.ParseDuration(s.cfg.JWT.AccessExpiry)
	accessJTI := uuid.New().String()
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": sub,
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
		"sub": sub,
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

func (s *authService) sendVerificationEmail(u *model.User) {
	token, err := generateToken()
	if err != nil {
		logger.Log.Error("failed to generate verification token", zap.Error(err))
		return
	}

	u.VerificationToken = &token
	database.DB.Save(u)

	verifyURL := s.cfg.FrontendURL + "/verify-email?token=" + token
	subject := "Verifikasi Email EduPlay"

	html := `<div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto;">
		<h2 style="color: #4F46E5;">Selamat datang di EduPlay!</h2>
		<p>Halo ` + u.Username + `,</p>
		<p>Klik tombol di bawah untuk verifikasi email kamu:</p>
		<a href="` + verifyURL + `" style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">Verifikasi Email</a>
		<p style="color: #6B7280; font-size: 14px;">Link ini berlaku 24 jam.</p>
	</div>`

	if err := s.emailCl.Send(u.Email, subject, html); err != nil {
		logger.Log.Error("failed to send verification email", zap.Error(err))
	}
}

func (s *authService) RequestVerificationEmail(userID string) error {
	var u model.User
	if err := database.DB.Where("id = ?", userID).First(&u).Error; err != nil {
		return errors.New("user not found")
	}

	if u.EmailVerifiedAt != nil {
		return errors.New("email already verified")
	}

	if s.emailCl == nil {
		return errors.New("email service not configured")
	}

	s.sendVerificationEmail(&u)
	return nil
}

func (s *authService) VerifyEmail(token string) error {
	var u model.User
	if err := database.DB.Where("verification_token = ?", token).First(&u).Error; err != nil {
		return errors.New("invalid or expired verification token")
	}

	if u.EmailVerifiedAt != nil {
		return nil // already verified
	}

	now := time.Now()
	u.EmailVerifiedAt = &now
	u.VerificationToken = nil
	return database.DB.Save(&u).Error
}

func (s *authService) ForgotPassword(req ForgotPasswordRequest) error {
	var u model.User
	if err := database.DB.Where("email = ?", req.Email).First(&u).Error; err != nil {
		return nil
	}

	if s.emailCl == nil {
		return errors.New("email service not configured")
	}

	token, err := generateToken()
	if err != nil {
		return err
	}

	expiry := time.Now().Add(1 * time.Hour)
	u.ResetToken = &token
	u.ResetTokenExpiry = &expiry
	database.DB.Save(&u)

	resetURL := s.cfg.FrontendURL + "/reset-password?token=" + token
	subject := "Reset Password EduPlay"

	html := `<div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto;">
		<h2 style="color: #4F46E5;">Reset Password</h2>
		<p>Klik tombol di bawah untuk reset password kamu:</p>
		<a href="` + resetURL + `" style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">Reset Password</a>
		<p style="color: #6B7280; font-size: 14px;">Link ini berlaku 1 jam.</p>
	</div>`

	go func() {
		if err := s.emailCl.Send(u.Email, subject, html); err != nil {
			logger.Log.Error("failed to send reset email", zap.Error(err))
		}
	}()

	return nil
}

func (s *authService) ResetPassword(req ResetPasswordRequest) error {
	var u model.User
	if err := database.DB.Where("reset_token = ?", req.Token).First(&u).Error; err != nil {
		return errors.New("invalid or expired reset token")
	}

	if u.ResetTokenExpiry == nil || time.Now().After(*u.ResetTokenExpiry) {
		return errors.New("reset token expired")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), 12)
	if err != nil {
		return err
	}

	u.Password = string(hashedPassword)
	u.ResetToken = nil
	u.ResetTokenExpiry = nil
	return database.DB.Save(&u).Error
}

type googleTokenInfo struct {
	Sub           string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name"`
	Aud           string `json:"aud"`
}

func (s *authService) GoogleLogin(req GoogleLoginRequest) (*AuthResponse, error) {
	resp, err := http.Get(fmt.Sprintf("https://oauth2.googleapis.com/tokeninfo?id_token=%s", req.IDToken))
	if err != nil {
		return nil, errors.New("failed to verify Google token")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, errors.New("invalid Google token")
	}

	var info googleTokenInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return nil, errors.New("failed to parse Google token info")
	}

	if !info.EmailVerified {
		return nil, errors.New("Google email not verified")
	}

	if s.cfg.Google.ClientID != "" && info.Aud != s.cfg.Google.ClientID {
		return nil, errors.New("token audience mismatch")
	}

	var u model.User
	err = database.DB.Where("google_id = ?", info.Sub).First(&u).Error
	if err != nil {
		err = database.DB.Where("email = ?", info.Email).First(&u).Error
		if err != nil {
			username := info.Name
			if username == "" {
				username = info.Email[:max(len(info.Email)-10, 1)]
			}
			if len(username) > 30 {
				username = username[:30]
			}

			now := time.Now()
			newUser := model.User{
				Username:        username,
				Email:           info.Email,
				GoogleID:        &info.Sub,
				EmailVerifiedAt: &now,
			}
			if err := database.DB.Create(&newUser).Error; err != nil {
				return nil, errors.New("failed to create user")
			}
			return s.generateAuthResponse(&newUser)
		}
		now := time.Now()
		u.GoogleID = &info.Sub
		u.EmailVerifiedAt = &now
		database.DB.Save(&u)
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
			if u.StreakFreeze > 0 {
				u.StreakFreeze--
			} else {
				u.Streak = 1
			}
		}
	}
	u.LastActive = &now
	database.DB.Save(&u)

	return s.generateAuthResponse(&u)
}
