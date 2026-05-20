package controller

import (
	"github.com/agambondan/eduplay/services/api/internal/service"
	"github.com/agambondan/eduplay/services/api/pkg/response"
	"github.com/agambondan/eduplay/services/api/pkg/validator"
	"github.com/gofiber/fiber/v2"
)

type WordChainController struct {
	svc service.WordChainService
}

func NewWordChainController(svc service.WordChainService) *WordChainController {
	return &WordChainController{svc: svc}
}

type CreateWordChainInput struct {
	OpponentUsername string `json:"opponent_username"`
	VsBot            bool   `json:"vs_bot"`
	BotDifficulty    string `json:"bot_difficulty"`
}

func (h *WordChainController) Create(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}
	var req CreateWordChainInput
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request body")
	}
	result, err := h.svc.CreateGame(userID, req.OpponentUsername, req.VsBot, req.BotDifficulty)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, result)
}

func (h *WordChainController) List(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}
	result, err := h.svc.GetActiveGames(userID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(c, result)
}

func (h *WordChainController) Get(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}
	id := c.Params("id")
	if id == "" {
		return response.Error(c, fiber.StatusBadRequest, "ID game diperlukan")
	}
	result, err := h.svc.GetGame(userID, id)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, result)
}

type SubmitWordInput struct {
	Word string `json:"word" validate:"required"`
}

func (h *WordChainController) SubmitWord(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}
	id := c.Params("id")
	if id == "" {
		return response.Error(c, fiber.StatusBadRequest, "ID game diperlukan")
	}
	var req SubmitWordInput
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request body")
	}
	if err := validator.Validate.Struct(&req); err != nil {
		return response.ValidationError(c, err.Error())
	}
	result, err := h.svc.SubmitWord(userID, id, req.Word)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, result)
}
