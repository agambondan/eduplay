package leaderboard

import (
	"github.com/agambondan/eduplay/backend/pkg/response"
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
	entries, err := h.svc.GetGameLeaderboard(slug, period, 100)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, entries)
}

func (h *Handler) GetGlobalLeaderboard(c *fiber.Ctx) error {
	entries, err := h.svc.GetGlobalLeaderboard(100)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(c, entries)
}
