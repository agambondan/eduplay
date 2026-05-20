package controller

import (
	"github.com/agambondan/eduplay/services/api/internal/service"
	"github.com/agambondan/eduplay/services/api/pkg/response"
	"github.com/gofiber/fiber/v2"
)

type LeaderboardController struct {
	svc service.LeaderboardService
}

func NewLeaderboardController(svc service.LeaderboardService) *LeaderboardController {
	return &LeaderboardController{svc: svc}
}

// GetGameLeaderboard godoc
// @Summary Get game leaderboard
// @Description Get leaderboard for a specific game
// @Tags leaderboard
// @Produce json
// @Param slug path string true "Game slug"
// @Param period query string false "Period filter (all, daily, weekly, monthly)"
// @Success 200 {object} map[string]interface{}
// @Router /leaderboard/game/{slug} [get]
func (h *LeaderboardController) GetGameLeaderboard(c *fiber.Ctx) error {
	slug := c.Params("slug")
	period := c.Query("period", "all")
	userID, _ := c.Locals("user_id").(string)
	result, err := h.svc.GetGameLeaderboard(slug, period, userID, 100)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, result)
}

// GetGlobalLeaderboard godoc
// @Summary Get global leaderboard
// @Description Get global leaderboard across all games
// @Tags leaderboard
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /leaderboard/global [get]
func (h *LeaderboardController) GetGlobalLeaderboard(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	result, err := h.svc.GetGlobalLeaderboard(userID, 100)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(c, result)
}
