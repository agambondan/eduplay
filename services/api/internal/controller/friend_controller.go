package controller

import (
	"github.com/agambondan/eduplay/services/api/internal/service"
	"github.com/agambondan/eduplay/services/api/pkg/response"
	"github.com/agambondan/eduplay/services/api/pkg/validator"
	"github.com/gofiber/fiber/v2"
)

type FriendController struct {
	svc service.FriendService
}

func NewFriendController(svc service.FriendService) *FriendController {
	return &FriendController{svc: svc}
}

func (h *FriendController) ListFriends(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}
	friends, err := h.svc.ListFriends(userID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(c, friends)
}

func (h *FriendController) ListRequests(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}
	requests, err := h.svc.ListRequests(userID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(c, requests)
}

type SendRequestInput struct {
	Username string `json:"username" validate:"required"`
}

func (h *FriendController) SendRequest(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}
	var req SendRequestInput
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request body")
	}
	if err := validator.Validate.Struct(&req); err != nil {
		return response.ValidationError(c, err.Error())
	}
	if err := h.svc.SendRequest(userID, req.Username); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.Map{"message": "Permintaan pertemanan dikirim"})
}

func (h *FriendController) AcceptRequest(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}
	friendID := c.Params("id")
	if friendID == "" {
		return response.Error(c, fiber.StatusBadRequest, "ID teman diperlukan")
	}
	if err := h.svc.AcceptRequest(userID, friendID); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.Map{"message": "Permintaan pertemanan diterima"})
}

func (h *FriendController) DeclineRequest(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}
	friendID := c.Params("id")
	if friendID == "" {
		return response.Error(c, fiber.StatusBadRequest, "ID teman diperlukan")
	}
	if err := h.svc.DeclineRequest(userID, friendID); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.Map{"message": "Permintaan pertemanan ditolak"})
}

func (h *FriendController) SearchUsers(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}
	q := c.Query("q")
	if q == "" {
		return response.Error(c, fiber.StatusBadRequest, "Query parameter required")
	}
	users, err := h.svc.SearchUsers(userID, q)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(c, users)
}

func (h *FriendController) RemoveFriend(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}
	friendID := c.Params("id")
	if friendID == "" {
		return response.Error(c, fiber.StatusBadRequest, "ID teman diperlukan")
	}
	if err := h.svc.RemoveFriend(userID, friendID); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.Map{"message": "Teman berhasil dihapus"})
}
