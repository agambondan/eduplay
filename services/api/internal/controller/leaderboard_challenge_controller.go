package controller

import (
	"github.com/agambondan/eduplay/services/api/internal/service"
	"github.com/agambondan/eduplay/services/api/pkg/response"
	"github.com/agambondan/eduplay/services/api/pkg/validator"
	"github.com/gofiber/fiber/v2"
)

type ScoreChallengeController struct {
	svc service.ScoreChallengeService
}

func NewScoreChallengeController(svc service.ScoreChallengeService) *ScoreChallengeController {
	return &ScoreChallengeController{svc: svc}
}

type CreateScoreChallengeInput struct {
	GameSlug   string `json:"game_slug" validate:"required"`
	Difficulty string `json:"difficulty" validate:"required"`
	Score      int    `json:"score" validate:"required,min=0"`
}

func (h *ScoreChallengeController) Create(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}
	var req CreateScoreChallengeInput
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request")
	}
	if err := validator.Validate.Struct(&req); err != nil {
		return response.ValidationError(c, err.Error())
	}
	result, err := h.svc.Create(userID, req.GameSlug, req.Difficulty, req.Score)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, result)
}

func (h *ScoreChallengeController) GetByLink(c *fiber.Ctx) error {
	link := c.Params("link")
	if link == "" {
		return response.Error(c, fiber.StatusBadRequest, "Link diperlukan")
	}
	result, err := h.svc.GetByShareLink(link)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, err.Error())
	}
	return response.Success(c, result)
}

func (h *ScoreChallengeController) Accept(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}
	link := c.Params("link")
	if link == "" {
		return response.Error(c, fiber.StatusBadRequest, "Link diperlukan")
	}
	result, err := h.svc.Accept(link, userID)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, result)
}

type SubmitScoreChallengeInput struct {
	Score int `json:"score" validate:"required,min=0"`
}

func (h *ScoreChallengeController) SubmitScore(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}
	link := c.Params("link")
	if link == "" {
		return response.Error(c, fiber.StatusBadRequest, "Link diperlukan")
	}
	var req SubmitScoreChallengeInput
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request")
	}
	if err := validator.Validate.Struct(&req); err != nil {
		return response.ValidationError(c, err.Error())
	}
	result, err := h.svc.SubmitScore(link, userID, req.Score)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, result)
}

func (h *ScoreChallengeController) List(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}
	result, err := h.svc.List(userID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(c, result)
}
