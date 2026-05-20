package controller

import (
	"strconv"

	"github.com/agambondan/eduplay/services/api/internal/service"
	"github.com/agambondan/eduplay/services/api/pkg/response"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/log"
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

func (h *AdminController) ListReportedUsernames(c *fiber.Ctx) error {
	reported, err := h.svc.ListReportedUsernames()
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Failed to fetch reported usernames")
	}
	return response.Success(c, fiber.Map{"reported_usernames": reported})
}

func (h *AdminController) GetOnetConfig(c *fiber.Ctx) error {
	cfg, err := h.svc.GetOnetConfig()
	if err != nil {
		log.Error(err)
	}
	return response.Success(c, cfg)
}

func (h *AdminController) SetOnetConfig(c *fiber.Ctx) error {
	var cfg map[string]interface{}
	if err := c.BodyParser(&cfg); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request")
	}
	if err := h.svc.SetOnetConfig(cfg); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(c, fiber.Map{"message": "Onet config updated"})
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

func (h *AdminController) ListSupportTickets(c *fiber.Ctx) error {
	tickets, err := h.svc.ListSupportTickets(c.Query("status"))
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(c, tickets)
}

func (h *AdminController) UpdateTicketStatus(c *fiber.Ctx) error {
	var req struct {
		Status string `json:"status"`
	}
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request")
	}
	if err := h.svc.UpdateTicketStatus(c.Params("id"), req.Status); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(c, fiber.Map{"message": "Ticket updated"})
}

func (h *AdminController) GetAnalytics(c *fiber.Ctx) error {
	stats, err := h.svc.GetAnalytics()
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(c, stats)
}

func (h *AdminController) ListTournaments(c *fiber.Ctx) error {
	list, err := h.svc.ListTournaments()
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(c, list)
}

func (h *AdminController) CancelTournament(c *fiber.Ctx) error {
	if err := h.svc.CancelTournament(c.Params("id")); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(c, fiber.Map{"message": "Tournament cancelled"})
}
