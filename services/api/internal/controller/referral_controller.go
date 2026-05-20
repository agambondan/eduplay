package controller

import (
	"github.com/agambondan/eduplay/services/api/internal/service"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type ReferralController struct {
	svc *service.ReferralService
}

func NewReferralController(svc *service.ReferralService) *ReferralController {
	return &ReferralController{svc: svc}
}

func (c *ReferralController) GetStats(ctx *fiber.Ctx) error {
	rawID, _ := ctx.Locals("user_id").(string)
	userID, err := uuid.Parse(rawID)
	if err != nil {
		return ctx.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"message": "unauthorized"})
	}
	stats, err := c.svc.GetStats(userID)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": err.Error()})
	}
	return ctx.JSON(stats)
}

func (c *ReferralController) Apply(ctx *fiber.Ctx) error {
	rawID, _ := ctx.Locals("user_id").(string)
	userID, err := uuid.Parse(rawID)
	if err != nil {
		return ctx.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"message": "unauthorized"})
	}

	var body struct {
		Code string `json:"code"`
	}
	if err := ctx.BodyParser(&body); err != nil || body.Code == "" {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "code is required"})
	}

	if err := c.svc.ApplyReferral(userID, body.Code); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": err.Error()})
	}
	return ctx.JSON(fiber.Map{"message": "referral applied", "xp_bonus": 100})
}
