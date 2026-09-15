package controller

import (
	"github.com/agambondan/eduplay/services/api/internal/service"
	"github.com/agambondan/eduplay/services/api/pkg/response"
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
		return response.Error(ctx, fiber.StatusUnauthorized, "unauthorized")
	}
	stats, err := c.svc.GetStats(userID)
	if err != nil {
		return response.InternalError(ctx, err)
	}
	return response.Success(ctx, stats)
}

func (c *ReferralController) Apply(ctx *fiber.Ctx) error {
	rawID, _ := ctx.Locals("user_id").(string)
	userID, err := uuid.Parse(rawID)
	if err != nil {
		return response.Error(ctx, fiber.StatusUnauthorized, "unauthorized")
	}

	var body struct {
		Code string `json:"code"`
	}
	if err := ctx.BodyParser(&body); err != nil || body.Code == "" {
		return response.Error(ctx, fiber.StatusBadRequest, "code is required")
	}

	if err := c.svc.ApplyReferral(userID, body.Code); err != nil {
		return response.Error(ctx, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(ctx, fiber.Map{"message": "referral applied", "xp_bonus": 100})
}
