package controller

import (
	"github.com/agambondan/eduplay/services/api/internal/service"
	"github.com/agambondan/eduplay/services/api/pkg/response"
	"github.com/gofiber/fiber/v2"
)

type MultiplayerLeaderboardController struct {
	svc service.MultiplayerLeaderboardService
}

func NewMultiplayerLeaderboardController(svc service.MultiplayerLeaderboardService) *MultiplayerLeaderboardController {
	return &MultiplayerLeaderboardController{svc: svc}
}

func (h *MultiplayerLeaderboardController) GetLeaderboard(c *fiber.Ctx) error {
	slug := c.Params("slug")
	result, err := h.svc.GetLeaderboard(slug)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, result)
}

func (h *MultiplayerLeaderboardController) GetGlobal(c *fiber.Ctx) error {
	result, err := h.svc.GetGlobalLeaderboard()
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(c, result)
}

func (h *MultiplayerLeaderboardController) GetUserStats(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}
	result, err := h.svc.GetUserStats(userID)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, result)
}

type RematchController struct {
	svc service.RematchService
}

func NewRematchController(svc service.RematchService) *RematchController {
	return &RematchController{svc: svc}
}

func (h *RematchController) CreateRematch(c *fiber.Ctx) error {
	code := c.Params("code")
	if code == "" {
		return response.Error(c, fiber.StatusBadRequest, "Kode room diperlukan")
	}
	newCode, err := h.svc.CreateRematch(code)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.Map{"room_code": newCode})
}
