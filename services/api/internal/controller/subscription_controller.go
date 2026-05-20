package controller

import (
	"github.com/agambondan/eduplay/services/api/internal/service"
	"github.com/agambondan/eduplay/services/api/pkg/response"
	"github.com/gofiber/fiber/v2"
)

type SubscriptionController struct {
	svc service.SubscriptionService
}

func NewSubscriptionController(svc service.SubscriptionService) *SubscriptionController {
	return &SubscriptionController{svc: svc}
}

func (h *SubscriptionController) Subscribe(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	sub, err := h.svc.CreateSubscription(userID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}

	return response.Success(c, sub)
}

func (h *SubscriptionController) Status(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	sub, err := h.svc.GetUserSubscription(userID)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, err.Error())
	}

	return response.Success(c, sub)
}

func (h *SubscriptionController) Cancel(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	if err := h.svc.CancelSubscription(userID); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}

	return response.Success(c, fiber.Map{"message": "Subscription cancelled"})
}

func (h *SubscriptionController) MidtransWebhook(c *fiber.Ctx) error {
	var payload map[string]interface{}
	if err := c.BodyParser(&payload); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid payload")
	}

	if err := h.svc.HandleMidtransWebhook(payload); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}

	return response.Success(c, fiber.Map{"message": "OK"})
}
