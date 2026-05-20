package controller

import (
	"github.com/agambondan/eduplay/services/api/internal/service"
	"github.com/agambondan/eduplay/services/api/pkg/response"
	"github.com/agambondan/eduplay/services/api/pkg/validator"
	"github.com/gofiber/fiber/v2"
)

type DailyController struct {
	svc service.DailyService
}

func NewDailyController(svc service.DailyService) *DailyController {
	return &DailyController{svc: svc}
}

func (h *DailyController) GetDailyChallenge(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	dc, err := h.svc.GetTodayChallenge(userID)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, err.Error())
	}
	return response.Success(c, dc)
}

type SubmitChallengeRequest struct {
	ChallengeID string `json:"challenge_id" validate:"required,uuid"`
	Score       int    `json:"score" validate:"required,min=0"`
}

func (h *DailyController) SubmitDailyChallenge(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	var req SubmitChallengeRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request body")
	}

	if err := validator.Validate.Struct(&req); err != nil {
		return response.ValidationError(c, err.Error())
	}

	res, err := h.svc.SubmitChallenge(userID, req.ChallengeID, req.Score)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}

	return response.Success(c, res)
}

func (h *DailyController) GetHistory(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	history, err := h.svc.GetHistory(userID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}

	return response.Success(c, history)
}
