package controller

import (
	"github.com/agambondan/eduplay/services/api/config"
	"github.com/agambondan/eduplay/services/api/internal/service"
	"github.com/agambondan/eduplay/services/api/pkg/response"
	"github.com/gofiber/fiber/v2"
)

type PushController struct {
	svc  *service.PushService
	cfg  *config.Config
}

func NewPushController(svc *service.PushService, cfg *config.Config) *PushController {
	return &PushController{svc: svc, cfg: cfg}
}

func (h *PushController) Subscribe(c *fiber.Ctx) error {
	userId, _ := c.Locals("user_id").(string)
	if userId == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	var req service.PushSubscriptionRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request body")
	}

	if err := h.svc.Subscribe(userId, req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}

	return response.Success(c, fiber.Map{"message": "Subscribed"})
}

func (h *PushController) Unsubscribe(c *fiber.Ctx) error {
	userId, _ := c.Locals("user_id").(string)
	if userId == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	if err := h.svc.Unsubscribe(userId); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}

	return response.Success(c, fiber.Map{"message": "Unsubscribed"})
}

func (h *PushController) VapidPublicKey(c *fiber.Ctx) error {
	return response.Success(c, fiber.Map{"public_key": h.cfg.VAPID.PublicKey})
}
