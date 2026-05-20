package controller

import (
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/internal/service"
	"github.com/agambondan/eduplay/services/api/pkg/response"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type AdController struct {
	svc *service.AdService
}

func NewAdController(svc *service.AdService) *AdController {
	return &AdController{svc: svc}
}

// GET /api/v1/ads?slot=banner  (public — returns direct ad or 404)
func (c *AdController) GetActiveAd(ctx *fiber.Ctx) error {
	slot := ctx.Query("slot", "banner")
	ad, err := c.svc.GetActiveBySlot(slot)
	if err != nil {
		return response.Error(ctx, fiber.StatusNotFound, "no active ad")
	}
	return response.Success(ctx, ad)
}

// GET /api/v1/admin/ads
func (c *AdController) List(ctx *fiber.Ctx) error {
	ads, err := c.svc.List()
	if err != nil {
		return response.Error(ctx, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(ctx, ads)
}

// POST /api/v1/admin/ads  (multipart/form-data)
func (c *AdController) Create(ctx *fiber.Ctx) error {
	ad := &model.Ad{
		Title:    ctx.FormValue("title"),
		ClickURL: ctx.FormValue("click_url"),
		SlotType: ctx.FormValue("slot_type"),
		IsActive: ctx.FormValue("is_active") != "false",
	}
	if p := ctx.FormValue("priority"); p != "" {
		fmt.Sscanf(p, "%d", &ad.Priority)
	}
	if s := ctx.FormValue("start_at"); s != "" {
		if t, err := time.Parse(time.RFC3339, s); err == nil {
			ad.StartAt = &t
		}
	}
	if e := ctx.FormValue("end_at"); e != "" {
		if t, err := time.Parse(time.RFC3339, e); err == nil {
			ad.EndAt = &t
		}
	}

	if file, err := ctx.FormFile("image"); err == nil {
		ext := strings.ToLower(filepath.Ext(file.Filename))
		filename := fmt.Sprintf("ads/%s%s", uuid.New().String(), ext)
		if err := ctx.SaveFile(file, "./uploads/"+filename); err != nil {
			return response.Error(ctx, fiber.StatusInternalServerError, "failed to save image")
		}
		ad.ImageURL = "/uploads/" + filename
	} else if imgURL := ctx.FormValue("image_url"); imgURL != "" {
		ad.ImageURL = imgURL
	}

	if err := c.svc.Create(ad); err != nil {
		return response.Error(ctx, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(ctx, ad)
}

// PATCH /api/v1/admin/ads/:id
func (c *AdController) Update(ctx *fiber.Ctx) error {
	id, err := uuid.Parse(ctx.Params("id"))
	if err != nil {
		return response.Error(ctx, fiber.StatusBadRequest, "invalid id")
	}
	var body map[string]any
	if err := ctx.BodyParser(&body); err != nil {
		return response.Error(ctx, fiber.StatusBadRequest, err.Error())
	}
	ad, err := c.svc.Update(id, body)
	if err != nil {
		return response.Error(ctx, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(ctx, ad)
}

// DELETE /api/v1/admin/ads/:id
func (c *AdController) Delete(ctx *fiber.Ctx) error {
	id, err := uuid.Parse(ctx.Params("id"))
	if err != nil {
		return response.Error(ctx, fiber.StatusBadRequest, "invalid id")
	}
	if err := c.svc.Delete(id); err != nil {
		return response.Error(ctx, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(ctx, nil)
}
