package controller

import (
	"github.com/agambondan/eduplay/services/api/internal/service"
	"github.com/agambondan/eduplay/services/api/pkg/response"
	"github.com/agambondan/eduplay/services/api/pkg/validator"
	"github.com/gofiber/fiber/v2"
)

type ChallengeController struct {
	svc service.ChallengeService
}

func NewChallengeController(svc service.ChallengeService) *ChallengeController {
	return &ChallengeController{svc: svc}
}

type CreateChallengeInput struct {
	OpponentUsername string `json:"opponent_username" validate:"required"`
	GameSlug         string `json:"game_slug" validate:"required"`
	Difficulty       string `json:"difficulty" validate:"required"`
}

func (h *ChallengeController) Create(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}
	var req CreateChallengeInput
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request body")
	}
	if err := validator.Validate.Struct(&req); err != nil {
		return response.ValidationError(c, err.Error())
	}
	result, err := h.svc.CreateChallenge(userID, req.OpponentUsername, req.GameSlug, req.Difficulty)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, result)
}

func (h *ChallengeController) List(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}
	filter := c.Query("type", "all")
	result, err := h.svc.ListChallenges(userID, filter)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(c, result)
}

func (h *ChallengeController) Get(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}
	id := c.Params("id")
	if id == "" {
		return response.Error(c, fiber.StatusBadRequest, "ID challenge diperlukan")
	}
	result, err := h.svc.GetChallenge(userID, id)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, result)
}

type SubmitChallengeInput struct {
	Answers []service.UserAnswer `json:"answers" validate:"required"`
	Score   int                  `json:"score" validate:"required"`
}

func (h *ChallengeController) Submit(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}
	id := c.Params("id")
	if id == "" {
		return response.Error(c, fiber.StatusBadRequest, "ID challenge diperlukan")
	}
	var req SubmitChallengeInput
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request body")
	}
	if err := validator.Validate.Struct(&req); err != nil {
		return response.ValidationError(c, err.Error())
	}
	result, err := h.svc.SubmitChallenge(userID, id, req.Answers, req.Score)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, result)
}
