package controller

import (
	"strconv"

	"github.com/agambondan/eduplay/services/api/internal/service"
	"github.com/agambondan/eduplay/services/api/pkg/response"
	"github.com/gofiber/fiber/v2"
)

type AdminController struct {
	svc *service.AdminService
}

func NewAdminController(svc *service.AdminService) *AdminController {
	return &AdminController{svc: svc}
}

func (h *AdminController) GetDashboard(c *fiber.Ctx) error {
	stats, err := h.svc.GetDashboard()
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Failed to get stats")
	}
	return response.Success(c, stats)
}

func (h *AdminController) ListUsers(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))

	users, total, err := h.svc.GetUsers(page, limit)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Failed to fetch users")
	}

	return response.Success(c, fiber.Map{
		"users": users,
		"total": total,
		"page":  page,
	})
}

func (h *AdminController) BanUser(c *fiber.Ctx) error {
	userID := c.Params("id")
	if err := h.svc.BanUser(userID); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.Map{"message": "User banned"})
}

func (h *AdminController) UnbanUser(c *fiber.Ctx) error {
	userID := c.Params("id")
	if err := h.svc.UnbanUser(userID); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.Map{"message": "User unbanned"})
}

func (h *AdminController) ListGames(c *fiber.Ctx) error {
	games, err := h.svc.GetGames()
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Failed to fetch games")
	}
	return response.Success(c, games)
}

func (h *AdminController) ToggleGame(c *fiber.Ctx) error {
	gameID := c.Params("id")
	if err := h.svc.ToggleGame(gameID); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.Map{"message": "Game toggled"})
}

func (h *AdminController) ResetLeaderboard(c *fiber.Ctx) error {
	if err := h.svc.ResetLeaderboard(); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(c, fiber.Map{"message": "Leaderboard reset"})
}

func (h *AdminController) GetFeatureFlags(c *fiber.Ctx) error {
	flags, err := h.svc.ListFeatureFlags()
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(c, flags)
}

func (h *AdminController) SetFeatureFlag(c *fiber.Ctx) error {
	key := c.Params("key")
	var req struct {
		Value string `json:"value"`
	}
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request")
	}
	if err := h.svc.SetFeatureFlag(key, req.Value); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(c, fiber.Map{"message": "Feature flag updated"})
}
