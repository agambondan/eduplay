package controller

import (
	"github.com/agambondan/eduplay/services/api/internal/service"
	"github.com/agambondan/eduplay/services/api/pkg/response"
	"github.com/gofiber/fiber/v2"
)

type AchievementController struct {
	svc service.AchievementService
}

func NewAchievementController(svc service.AchievementService) *AchievementController {
	return &AchievementController{svc: svc}
}

// GetAll godoc
// @Summary List all achievements
// @Description Get all available achievements
// @Tags achievements
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /user/achievements [get]
func (h *AchievementController) GetAll(c *fiber.Ctx) error {
	achs, err := h.svc.GetAchievements()
	if err != nil {
		return response.InternalError(c, err)
	}
	return response.Success(c, achs)
}

func (h *AchievementController) GetUserAchievements(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}
	uas, err := h.svc.GetUserAchievements(userID)
	if err != nil {
		return response.InternalError(c, err)
	}
	return response.Success(c, uas)
}
