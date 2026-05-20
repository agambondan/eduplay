package controller

import (
	"github.com/agambondan/eduplay/services/api/internal/ws"
	"github.com/agambondan/eduplay/services/api/pkg/response"
	"github.com/gofiber/fiber/v2"
)

type WSController struct {
	hub         *ws.Hub
	matchmaking *ws.MatchmakingService
}

func NewWSController(hub *ws.Hub, mm *ws.MatchmakingService) *WSController {
	return &WSController{hub: hub, matchmaking: mm}
}

func (h *WSController) WSHandler() fiber.Handler {
	return h.hub.WSHandler()
}

type QuickMatchInput struct {
	GameSlug   string `json:"game_slug" validate:"required"`
	Difficulty string `json:"difficulty" validate:"required,oneof=easy medium hard"`
}

func (h *WSController) QuickMatch(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	var req QuickMatchInput
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request")
	}

	result, err := h.matchmaking.JoinQueue(userID, req.GameSlug, req.Difficulty)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}

	return response.Success(c, result)
}

type QuickMatchBotInput struct {
	GameSlug      string `json:"game_slug" validate:"required"`
	BotDifficulty string `json:"bot_difficulty" validate:"required,oneof=easy medium hard"`
}

func (h *WSController) QuickMatchBot(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	var req QuickMatchBotInput
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request")
	}

	roomID := "math_battle:" + req.BotDifficulty
	return response.Success(c, fiber.Map{
		"match_id": roomID,
		"room_id":  roomID,
		"bot": fiber.Map{
			"name":       getBotDisplayName(req.BotDifficulty),
			"difficulty": req.BotDifficulty,
		},
	})
}

func (h *WSController) CancelQuickMatch(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	var req struct {
		GameSlug string `json:"game_slug"`
	}
	c.BodyParser(&req)
	h.matchmaking.CancelQueue(userID, req.GameSlug)
	return response.Success(c, fiber.Map{"message": "Cancelled"})
}

func getBotDisplayName(difficulty string) string {
	switch difficulty {
	case "easy":
		return "Rudi Bot"
	case "medium":
		return "Alex Bot"
	case "hard":
		return "Cipher"
	default:
		return "Bot"
	}
}
