package controller

import (
	"github.com/agambondan/eduplay/services/api/internal/service"
	"github.com/agambondan/eduplay/services/api/internal/ws"
	"github.com/agambondan/eduplay/services/api/pkg/response"
	"github.com/agambondan/eduplay/services/api/pkg/validator"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
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
	Theme      string `json:"theme" validate:"omitempty,oneof=world asia asean europe hard"`
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
	if err := validator.Validate.Struct(&req); err != nil {
		return response.ValidationError(c, err.Error())
	}

	result, err := h.matchmaking.JoinQueue(userID, req.GameSlug, req.Difficulty, req.Theme)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}

	return response.Success(c, result)
}

type QuickMatchBotInput struct {
	GameSlug      string `json:"game_slug" validate:"required"`
	BotDifficulty string `json:"bot_difficulty" validate:"required,oneof=easy medium hard"`
	Recommended   bool   `json:"recommended"`
	Theme         string `json:"theme" validate:"omitempty,oneof=world asia asean europe hard"`
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
	if err := validator.Validate.Struct(&req); err != nil {
		return response.ValidationError(c, err.Error())
	}

	difficulty := req.BotDifficulty
	recSvc := service.NewBotRecommendationService()
	recommended := recSvc.GetRecommendedDifficulty(userID, req.GameSlug)

	if req.Recommended {
		difficulty = recommended
	}

	roomPrefix := ws.RoomPrefixForGame(req.GameSlug)
	if roomPrefix == "" {
		return response.Error(c, fiber.StatusBadRequest, "Unsupported multiplayer game")
	}

	roomID := roomPrefix + ":" + difficulty + ws.RoomThemeSegment(req.GameSlug, req.Theme) + ":" + uuid.NewString()
	return response.Success(c, fiber.Map{
		"match_id":       roomID,
		"room_id":        roomID,
		"recommended":    recommended,
		"bot_difficulty": difficulty,
		"bot": fiber.Map{
			"name":       getBotDisplayName(difficulty),
			"difficulty": difficulty,
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
