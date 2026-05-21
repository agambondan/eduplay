package controller

import (
	"github.com/agambondan/eduplay/services/api/internal/service"
	"github.com/agambondan/eduplay/services/api/pkg/response"
	"github.com/gofiber/fiber/v2"
)

type TournamentController struct {
	svc service.TournamentService
}

func NewTournamentController(svc service.TournamentService) *TournamentController {
	return &TournamentController{svc: svc}
}

func (h *TournamentController) List(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	items, err := h.svc.List(userID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(c, items)
}

func (h *TournamentController) Create(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	var req service.CreateTournamentInput
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request body")
	}
	item, err := h.svc.Create(userID, req)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, item)
}

func (h *TournamentController) Get(c *fiber.Ctx) error {
	item, err := h.svc.Get(c.Params("id"))
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, err.Error())
	}
	return response.Success(c, item)
}

func (h *TournamentController) Join(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	item, err := h.svc.Join(c.Params("id"), userID)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, item)
}

func (h *TournamentController) Start(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	item, err := h.svc.Start(c.Params("id"), userID)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, item)
}

func (h *TournamentController) ReportMatch(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	var req service.ReportTournamentMatchInput
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request body")
	}
	item, err := h.svc.ReportMatch(c.Params("id"), c.Params("match_id"), userID, req)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, item)
}
