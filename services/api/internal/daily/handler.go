package daily

import (
	"github.com/agambondan/eduplay/backend/pkg/response"
	"github.com/agambondan/eduplay/backend/pkg/validator"
	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	svc Service
}

func NewHandler(svc Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) GetDailyChallenge(c *fiber.Ctx) error {
	dc, err := h.svc.GetTodayChallenge()
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, err.Error())
	}
	return response.Success(c, dc)
}

type SubmitChallengeRequest struct {
	ChallengeID string `json:"challenge_id" validate:"required,uuid"`
	Score       int    `json:"score" validate:"required,min=0"`
}

func (h *Handler) SubmitDailyChallenge(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var req SubmitChallengeRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request body")
	}

	if err := validator.Validate.Struct(&req); err != nil {
		return response.ValidationError(c, err.Error())
	}

	xp, err := h.svc.SubmitChallenge(userID, req.ChallengeID, req.Score)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}

	return response.Success(c, fiber.Map{"xp_earned": xp})
}
