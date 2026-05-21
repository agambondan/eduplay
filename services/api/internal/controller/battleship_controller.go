package controller

import (
	"github.com/agambondan/eduplay/services/api/internal/service"
	"github.com/agambondan/eduplay/services/api/pkg/response"
	"github.com/agambondan/eduplay/services/api/pkg/validator"
	"github.com/gofiber/fiber/v2"
)

type BattleshipController struct {
	svc service.BattleshipService
}

func NewBattleshipController(svc service.BattleshipService) *BattleshipController {
	return &BattleshipController{svc: svc}
}

type CreateBattleshipInput struct {
	OpponentUsername string `json:"opponent_username"`
	VsBot            bool   `json:"vs_bot"`
	BotDifficulty    string `json:"bot_difficulty" validate:"omitempty,oneof=easy medium hard"`
	Difficulty       string `json:"difficulty" validate:"required,oneof=easy medium hard"`
}

func (h *BattleshipController) List(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	items, err := h.svc.List(userID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(c, items)
}

func (h *BattleshipController) Create(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	var req CreateBattleshipInput
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request body")
	}
	if err := validator.Validate.Struct(&req); err != nil {
		return response.ValidationError(c, err.Error())
	}
	item, err := h.svc.Create(userID, service.CreateBattleshipInput(req))
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, item)
}

func (h *BattleshipController) Get(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	item, err := h.svc.Get(c.Params("id"), userID)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, item)
}

type BattleshipTargetInput struct {
	Row int `json:"row" validate:"min=0,max=7"`
	Col int `json:"col" validate:"min=0,max=7"`
}

func (h *BattleshipController) Target(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	var req BattleshipTargetInput
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request body")
	}
	if err := validator.Validate.Struct(&req); err != nil {
		return response.ValidationError(c, err.Error())
	}
	item, err := h.svc.Target(c.Params("id"), userID, req.Row, req.Col)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, item)
}

type BattleshipShotInput struct {
	Answer int `json:"answer"`
}

func (h *BattleshipController) Shot(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	var req BattleshipShotInput
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request body")
	}
	item, err := h.svc.Shot(c.Params("id"), userID, req.Answer)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, item)
}

func (h *BattleshipController) Reveal(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	item, err := h.svc.Reveal(c.Params("id"), userID)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, item)
}

func (h *BattleshipController) Resign(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	item, err := h.svc.Resign(c.Params("id"), userID)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, item)
}
