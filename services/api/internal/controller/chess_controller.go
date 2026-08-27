package controller

import (
	"github.com/agambondan/eduplay/services/api/internal/service"
	"github.com/agambondan/eduplay/services/api/pkg/response"
	"github.com/agambondan/eduplay/services/api/pkg/validator"
	"github.com/gofiber/fiber/v2"
)

type ChessController struct {
	svc service.ChessService
}

func NewChessController(svc service.ChessService) *ChessController {
	return &ChessController{svc: svc}
}

type CreateChessInput struct {
	OpponentUsername string `json:"opponent_username"`
	VsBot            bool   `json:"vs_bot"`
	BotDifficulty    string `json:"bot_difficulty" validate:"omitempty,oneof=easy medium hard"`
	PlayerColor      string `json:"player_color" validate:"omitempty,oneof=white black"`
}

func (h *ChessController) List(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	items, err := h.svc.List(userID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(c, items)
}

func (h *ChessController) Create(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	var req CreateChessInput
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request body")
	}
	if err := validator.Validate.Struct(&req); err != nil {
		return response.ValidationError(c, err.Error())
	}
	item, err := h.svc.Create(userID, service.CreateChessInput{
		OpponentUsername: req.OpponentUsername,
		VsBot:            req.VsBot,
		BotDifficulty:    req.BotDifficulty,
		PlayerColor:      req.PlayerColor,
	})
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, item)
}

func (h *ChessController) Get(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	item, err := h.svc.Get(c.Params("id"), userID)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, item)
}

type ChessMoveInput struct {
	Move string `json:"move" validate:"required"`
}

func (h *ChessController) Move(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	var req ChessMoveInput
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request body")
	}
	if err := validator.Validate.Struct(&req); err != nil {
		return response.ValidationError(c, err.Error())
	}
	item, err := h.svc.Move(c.Params("id"), userID, req.Move)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, item)
}

func (h *ChessController) Resign(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	item, err := h.svc.Resign(c.Params("id"), userID)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, item)
}
