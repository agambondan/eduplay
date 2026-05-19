package ai

import (
	"github.com/agambondan/eduplay/services/api/pkg/response"
	"github.com/agambondan/eduplay/services/api/pkg/validator"
	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	svc Service
}

func NewHandler(svc Service) *Handler {
	return &Handler{svc: svc}
}

type GenerateRequest struct {
	GameType   string `json:"game_type" validate:"required"`
	Difficulty string `json:"difficulty" validate:"required,oneof=easy medium hard"`
	Count      int    `json:"count" validate:"required,min=1,max=50"`
}

func (h *Handler) GenerateQuestions(c *fiber.Ctx) error {
	var req GenerateRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request body")
	}

	if err := validator.Validate.Struct(&req); err != nil {
		return response.ValidationError(c, err.Error())
	}

	questions, err := h.svc.GenerateQuestions(req.GameType, req.Difficulty, req.Count)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}

	return response.Success(c, questions)
}
