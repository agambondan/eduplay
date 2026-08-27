package controller

import (
	"github.com/agambondan/eduplay/services/api/internal/service"
	"github.com/agambondan/eduplay/services/api/pkg/response"
	"github.com/gofiber/fiber/v2"
)

type ExperimentController struct {
	svc service.ExperimentService
}

func NewExperimentController(svc service.ExperimentService) *ExperimentController {
	return &ExperimentController{svc: svc}
}

func (h *ExperimentController) List(c *fiber.Ctx) error {
	items, err := h.svc.List()
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(c, items)
}

type CreateExperimentInput struct {
	Name        string   `json:"name" validate:"required"`
	Description string   `json:"description"`
	Variants    []string `json:"variants" validate:"required,min=2"`
	Traffic     float64  `json:"traffic"`
}

func (h *ExperimentController) Create(c *fiber.Ctx) error {
	var req CreateExperimentInput
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request")
	}
	traffic := req.Traffic
	if traffic <= 0 || traffic > 1 {
		traffic = 1.0
	}
	exp, err := h.svc.Create(req.Name, req.Description, req.Variants, traffic)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, exp)
}

func (h *ExperimentController) GetVariant(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	name := c.Query("name")
	if name == "" {
		return response.Error(c, fiber.StatusBadRequest, "name required")
	}
	variant, err := h.svc.GetVariant(name, userID)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.Map{"variant": variant})
}

type TrackInput struct {
	Name     string                 `json:"name" validate:"required"`
	Event    string                 `json:"event" validate:"required"`
	Metadata map[string]interface{} `json:"metadata"`
}

func (h *ExperimentController) Track(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	var req TrackInput
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request")
	}
	if err := h.svc.TrackEvent(req.Name, userID, req.Event, req.Metadata); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.Map{"message": "tracked"})
}

func (h *ExperimentController) Results(c *fiber.Ctx) error {
	name := c.Query("name")
	if name == "" {
		return response.Error(c, fiber.StatusBadRequest, "name required")
	}
	results, err := h.svc.GetResults(name)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, results)
}

func (h *ExperimentController) Toggle(c *fiber.Ctx) error {
	if err := h.svc.Toggle(c.Params("id")); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.Map{"message": "toggled"})
}
