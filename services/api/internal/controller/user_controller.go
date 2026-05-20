package controller

import (
	"path/filepath"
	"strings"

	"github.com/agambondan/eduplay/services/api/internal/service"
	"github.com/agambondan/eduplay/services/api/pkg/response"
	"github.com/agambondan/eduplay/services/api/pkg/validator"
	"github.com/gofiber/fiber/v2"
)

type UserController struct {
	svc service.UserService
}

func NewUserController(svc service.UserService) *UserController {
	return &UserController{svc: svc}
}

// GetMe godoc
// @Summary Get current user profile
// @Description Get the authenticated user's profile
// @Tags user
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Security BearerAuth
// @Router /user/me [get]
func (h *UserController) GetMe(c *fiber.Ctx) error {
	userId, _ := c.Locals("user_id").(string)
	if userId == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}
	u, err := h.svc.GetProfile(userId)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "User not found")
	}
	return response.Success(c, u)
}

// GetStats godoc
// @Summary Get user stats
// @Description Get the authenticated user's game statistics
// @Tags user
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Security BearerAuth
// @Router /user/stats [get]
func (h *UserController) GetStats(c *fiber.Ctx) error {
	userId, _ := c.Locals("user_id").(string)
	if userId == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}
	stats, err := h.svc.GetStats(userId)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Failed to get stats")
	}
	return response.Success(c, stats)
}

type UpdateProfileRequest struct {
	Username string `json:"username" validate:"required,min=3,max=30"`
}

// UpdateProfile godoc
// @Summary Update user profile
// @Description Update the authenticated user's profile
// @Tags user
// @Accept json
// @Produce json
// @Param request body UpdateProfileRequest true "Profile update payload"
// @Success 200 {object} map[string]interface{}
// @Security BearerAuth
// @Router /user/profile [patch]
func (h *UserController) UpdateProfile(c *fiber.Ctx) error {
	userId, _ := c.Locals("user_id").(string)
	if userId == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}
	var req UpdateProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request body")
	}

	if err := validator.Validate.Struct(&req); err != nil {
		return response.ValidationError(c, err.Error())
	}

	u, err := h.svc.UpdateProfile(userId, req.Username)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}

	return response.Success(c, u)
}

// UploadAvatar godoc
// @Summary Upload user avatar
// @Description Upload avatar image for the authenticated user
// @Tags user
// @Accept multipart/form-data
// @Produce json
// @Param avatar formData file true "Avatar image file (max 2MB, jpg/png/gif/webp)"
// @Success 200 {object} map[string]interface{}
// @Security BearerAuth
// @Router /user/avatar [post]
func (h *UserController) UploadAvatar(c *fiber.Ctx) error {
	userId, _ := c.Locals("user_id").(string)
	if userId == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	fileHeader, err := c.FormFile("avatar")
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, "No file uploaded")
	}

	if fileHeader.Size > 2<<20 {
		return response.Error(c, fiber.StatusBadRequest, "File too large, max 2MB")
	}

	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".gif" && ext != ".webp" {
		return response.Error(c, fiber.StatusBadRequest, "Only jpg/png/gif/webp allowed")
	}

	file, err := fileHeader.Open()
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Failed to read file")
	}
	defer file.Close()

	url, err := h.svc.UploadAvatar(userId, file, fileHeader)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}

	return response.Success(c, fiber.Map{"avatar_url": url})
}
