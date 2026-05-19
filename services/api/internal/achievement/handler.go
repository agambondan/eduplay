package achievement

import (
	"github.com/agambondan/eduplay/services/api/pkg/response"
	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	svc Service
}

func NewHandler(svc Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) GetAll(c *fiber.Ctx) error {
	achs, err := h.svc.GetAchievements()
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(c, achs)
}

func (h *Handler) GetUserAchievements(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	uas, err := h.svc.GetUserAchievements(userID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(c, uas)
}
