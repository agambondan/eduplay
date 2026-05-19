package user

import (
	"github.com/agambondan/eduplay/backend/pkg/response"
	"github.com/agambondan/eduplay/backend/pkg/validator"
	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	svc Service
}

func NewHandler(svc Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) GetMe(c *fiber.Ctx) error {
	userId := c.Locals("user_id").(string)
	u, err := h.svc.GetProfile(userId)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "User not found")
	}
	return response.Success(c, u)
}

type UpdateProfileRequest struct {
	Username string `json:"username" validate:"required,min=3,max=30"`
}

func (h *Handler) UpdateProfile(c *fiber.Ctx) error {
	userId := c.Locals("user_id").(string)
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
