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

// ListGames godoc
// @Summary List all games
// @Description Get all available games
// @Tags games
// @Produce json
// @Success 200 {array} model.Game
// @Router /games [get]
func (h *GameController) ListGames(c *fiber.Ctx) error {
	games, err := h.svc.ListGames()
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Failed to fetch games")
	}
	return response.Success(c, games)
}

// GetGame godoc
// @Summary Get a game by slug
// @Description Get game details by its slug
// @Tags games
// @Produce json
// @Param slug path string true "Game slug"
// @Success 200 {object} model.Game
// @Router /games/{slug} [get]
func (h *GameController) GetGame(c *fiber.Ctx) error {
	slug := c.Params("slug")
	g, err := h.svc.GetGame(slug)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "Game not found")
	}
	return response.Success(c, g)
}

// SubmitScore godoc
// @Summary Submit a game score
// @Description Submit a score for a specific game
// @Tags games
// @Accept json
// @Produce json
// @Param slug path string true "Game slug"
// @Param request body service.SubmitScoreRequest true "Score payload"
// @Success 200 {object} map[string]interface{}
// @Security BearerAuth
// @Router /games/{slug}/score [post]
func (h *GameController) SubmitScore(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}
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
