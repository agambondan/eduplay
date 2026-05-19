package controller

import (
	"time"

	"github.com/agambondan/eduplay/services/api/internal/service"
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

func (h *AuthController) Register(c *fiber.Ctx) error {
	var req service.RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request body")
	}

	if err := validator.Validate.Struct(&req); err != nil {
		return response.ValidationError(c, err.Error())
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

	token, err := h.svc.RefreshToken(refreshToken)
	if err != nil {
		h.clearRefreshCookie(c)
		return response.Error(c, fiber.StatusUnauthorized, err.Error())
	}

	return response.Success(c, fiber.Map{"access_token": token})
}

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
