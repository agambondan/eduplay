package controller

import (
	"github.com/agambondan/eduplay/services/api/internal/service"
	"github.com/agambondan/eduplay/services/api/pkg/response"
	"github.com/agambondan/eduplay/services/api/pkg/validator"
	"github.com/gofiber/fiber/v2"
)

type RoomController struct {
	svc service.RoomService
}

func NewRoomController(svc service.RoomService) *RoomController {
	return &RoomController{svc: svc}
}

type CreateRoomInput struct {
	GameSlug string                    `json:"game_slug" validate:"required"`
	Settings service.RoomSettingsInput `json:"settings"`
}

func (h *RoomController) Create(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}
	var req CreateRoomInput
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request")
	}
	if err := validator.Validate.Struct(&req); err != nil {
		return response.ValidationError(c, err.Error())
	}
	result, err := h.svc.CreateRoom(userID, req.GameSlug, req.Settings)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, result)
}

func (h *RoomController) Get(c *fiber.Ctx) error {
	code := c.Params("code")
	if code == "" {
		return response.Error(c, fiber.StatusBadRequest, "Kode room diperlukan")
	}
	result, err := h.svc.GetRoom(code)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, err.Error())
	}
	return response.Success(c, result)
}

func (h *RoomController) Join(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}
	code := c.Params("code")
	if code == "" {
		return response.Error(c, fiber.StatusBadRequest, "Kode room diperlukan")
	}
	result, err := h.svc.JoinRoom(code, userID)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, result)
}

func (h *RoomController) Leave(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}
	code := c.Params("code")
	if code == "" {
		return response.Error(c, fiber.StatusBadRequest, "Kode room diperlukan")
	}
	if err := h.svc.LeaveRoom(code, userID); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.Map{"message": "Berhasil keluar room"})
}

func (h *RoomController) Start(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}
	code := c.Params("code")
	if code == "" {
		return response.Error(c, fiber.StatusBadRequest, "Kode room diperlukan")
	}
	if err := h.svc.StartRoom(code, userID); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.Map{"message": "Game dimulai!"})
}

func (h *RoomController) Kick(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}
	code := c.Params("code")
	targetID := c.Params("user_id")
	if code == "" || targetID == "" {
		return response.Error(c, fiber.StatusBadRequest, "Parameter tidak lengkap")
	}
	if err := h.svc.KickPlayer(code, userID, targetID); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.Map{"message": "Player di-kick"})
}
