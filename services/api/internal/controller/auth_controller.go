package controller

import (
	"time"

	"github.com/agambondan/eduplay/services/api/internal/service"
	"github.com/agambondan/eduplay/services/api/pkg/profanity"
	"github.com/agambondan/eduplay/services/api/pkg/response"
	"github.com/agambondan/eduplay/services/api/pkg/validator"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

type AuthController struct {
	svc service.AuthService
}

func NewAuthController(svc service.AuthService) *AuthController {
	return &AuthController{svc: svc}
}

func (h *AuthController) setRefreshCookie(c *fiber.Ctx, token string, maxAge time.Duration) {
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    token,
		Path:     "/api/v1/auth",
		MaxAge:   int(maxAge.Seconds()),
		HTTPOnly: true,
		Secure:   c.Protocol() == "https",
		SameSite: "Lax",
	})
}

func (h *AuthController) clearRefreshCookie(c *fiber.Ctx) {
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Path:     "/api/v1/auth",
		MaxAge:   -1,
		HTTPOnly: true,
		Secure:   c.Protocol() == "https",
		SameSite: "Lax",
	})
}

// Register godoc
// @Summary Register a new user
// @Description Create a new user account
// @Tags auth
// @Accept json
// @Produce json
// @Param request body service.RegisterRequest true "Registration payload"
// @Success 200 {object} map[string]interface{}
// @Router /auth/register [post]
func (h *AuthController) Register(c *fiber.Ctx) error {
	var req service.RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request body")
	}

	if err := validator.Validate.Struct(&req); err != nil {
		return response.ValidationError(c, err.Error())
	}

	filter := profanity.NewFilter()
	if !filter.IsClean(req.Username) {
		return response.Error(c, fiber.StatusBadRequest, "Username mengandung kata yang tidak pantas")
	}

	res, err := h.svc.Register(req)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}

	h.setRefreshCookie(c, res.RefreshToken, 7*24*time.Hour)

	return response.Success(c, fiber.Map{
		"user":         res.User,
		"access_token": res.AccessToken,
	})
}

// Login godoc
// @Summary Login user
// @Description Authenticate and get access token
// @Tags auth
// @Accept json
// @Produce json
// @Param request body service.LoginRequest true "Login payload"
// @Success 200 {object} map[string]interface{}
// @Router /auth/login [post]
func (h *AuthController) Login(c *fiber.Ctx) error {
	var req service.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request body")
	}

	if err := validator.Validate.Struct(&req); err != nil {
		return response.ValidationError(c, err.Error())
	}

	res, err := h.svc.Login(req)
	if err != nil {
		return response.Error(c, fiber.StatusUnauthorized, err.Error())
	}

	h.setRefreshCookie(c, res.RefreshToken, 7*24*time.Hour)

	return response.Success(c, fiber.Map{
		"user":         res.User,
		"access_token": res.AccessToken,
	})
}

// Refresh godoc
// @Summary Refresh access token
// @Description Get a new access token using refresh token
// @Tags auth
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /auth/refresh [post]
func (h *AuthController) Refresh(c *fiber.Ctx) error {
	refreshToken := c.Cookies("refresh_token")

	if refreshToken == "" {
		var req service.RefreshRequest
		if err := c.BodyParser(&req); err == nil && req.RefreshToken != "" {
			refreshToken = req.RefreshToken
		}
	}

	if refreshToken == "" {
		return response.Error(c, fiber.StatusUnauthorized, "No refresh token provided")
	}

	res, err := h.svc.RefreshToken(refreshToken)
	if err != nil {
		h.clearRefreshCookie(c)
		return response.Error(c, fiber.StatusUnauthorized, err.Error())
	}

	h.setRefreshCookie(c, res.RefreshToken, 7*24*time.Hour)

	return response.Success(c, fiber.Map{"access_token": res.AccessToken})
}

// Logout godoc
// @Summary Logout user
// @Description Invalidate access token
// @Tags auth
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Security BearerAuth
// @Router /auth/logout [post]
func (h *AuthController) Logout(c *fiber.Ctx) error {
	userToken := c.Locals("user").(*jwt.Token)
	claims := userToken.Claims.(jwt.MapClaims)
	jti := claims["jti"].(string)
	exp := claims["exp"].(float64)

	expiry := time.Until(time.Unix(int64(exp), 0))
	if expiry > 0 {
		if err := h.svc.Logout(jti, expiry); err != nil {
			return response.Error(c, fiber.StatusInternalServerError, "Failed to logout")
		}
	}

	h.clearRefreshCookie(c)

	return response.Success(c, fiber.Map{"message": "Logged out successfully"})
}

func (h *AuthController) RequestVerification(c *fiber.Ctx) error {
	userId, _ := c.Locals("user_id").(string)
	if userId == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	if err := h.svc.RequestVerificationEmail(userId); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}

	return response.Success(c, fiber.Map{"message": "Verification email sent"})
}

func (h *AuthController) VerifyEmail(c *fiber.Ctx) error {
	token := c.Query("token")
	if token == "" {
		return response.Error(c, fiber.StatusBadRequest, "Missing verification token")
	}

	if err := h.svc.VerifyEmail(token); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}

	return response.Success(c, fiber.Map{"message": "Email verified successfully"})
}

func (h *AuthController) ForgotPassword(c *fiber.Ctx) error {
	var req service.ForgotPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request body")
	}

	if err := validator.Validate.Struct(&req); err != nil {
		return response.ValidationError(c, err.Error())
	}

	if err := h.svc.ForgotPassword(req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}

	return response.Success(c, fiber.Map{"message": "If the email exists, a reset link has been sent"})
}

func (h *AuthController) GoogleLogin(c *fiber.Ctx) error {
	var req service.GoogleLoginRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request body")
	}

	if err := validator.Validate.Struct(&req); err != nil {
		return response.ValidationError(c, err.Error())
	}

	res, err := h.svc.GoogleLogin(req)
	if err != nil {
		return response.Error(c, fiber.StatusUnauthorized, err.Error())
	}

	h.setRefreshCookie(c, res.RefreshToken, 7*24*time.Hour)

	return response.Success(c, fiber.Map{
		"user":         res.User,
		"access_token": res.AccessToken,
	})
}

func (h *AuthController) ResetPassword(c *fiber.Ctx) error {
	var req service.ResetPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request body")
	}

	if err := validator.Validate.Struct(&req); err != nil {
		return response.ValidationError(c, err.Error())
	}

	if err := h.svc.ResetPassword(req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}

	return response.Success(c, fiber.Map{"message": "Password reset successfully"})
}
