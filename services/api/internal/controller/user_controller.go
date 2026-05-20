package controller

import (
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
