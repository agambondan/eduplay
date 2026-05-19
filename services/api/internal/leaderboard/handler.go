package leaderboard

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

func (h *Handler) GetGameLeaderboard(c *fiber.Ctx) error {
	slug := c.Params("slug")
	period := c.Query("period", "all")
	userID, _ := c.Locals("user_id").(string)
	result, err := h.svc.GetGameLeaderboard(slug, period, userID, 100)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, result)
}

func (h *Handler) GetGlobalLeaderboard(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	result, err := h.svc.GetGlobalLeaderboard(userID, 100)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(c, result)
}
