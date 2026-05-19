package controller

import (
	"github.com/agambondan/eduplay/services/api/internal/service"
	"github.com/agambondan/eduplay/services/api/pkg/response"
	"github.com/agambondan/eduplay/services/api/pkg/validator"
	"github.com/gofiber/fiber/v2"
)

type GameController struct {
	svc service.GameService
}

func NewGameController(svc service.GameService) *GameController {
	return &GameController{svc: svc}
}

func (h *GameController) ListGames(c *fiber.Ctx) error {
	games, err := h.svc.ListGames()
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Failed to fetch games")
	}
	return response.Success(c, games)
}

func (h *GameController) GetGame(c *fiber.Ctx) error {
	slug := c.Params("slug")
	g, err := h.svc.GetGame(slug)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "Game not found")
	}
	return response.Success(c, g)
}

func (h *GameController) SubmitScore(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	slug := c.Params("slug")

	var req service.SubmitScoreRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request body")
	}

	if err := validator.Validate.Struct(&req); err != nil {
		return response.ValidationError(c, err.Error())
	}

	res, err := h.svc.SubmitScore(userID, slug, req)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}

	return response.Success(c, res)
}
