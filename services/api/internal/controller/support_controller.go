package controller

import (
	"github.com/agambondan/eduplay/services/api/internal/service"
	"github.com/agambondan/eduplay/services/api/pkg/response"
	"github.com/agambondan/eduplay/services/api/pkg/validator"
	"github.com/gofiber/fiber/v2"
)

type SupportController struct {
	svc service.SupportService
}

func NewSupportController(svc service.SupportService) *SupportController {
	return &SupportController{svc: svc}
}

type CreateTicketRequest struct {
	Name     string `json:"name" validate:"required,min=1,max=100"`
	Email    string `json:"email" validate:"required,email"`
	Category string `json:"category" validate:"required,oneof=bug feedback saran"`
	Message  string `json:"message" validate:"required,min=10,max=2000"`
}

func (h *SupportController) CreateTicket(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)

	var req CreateTicketRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request body")
	}

	if err := validator.Validate.Struct(&req); err != nil {
		return response.ValidationError(c, err.Error())
	}

	ticket, err := h.svc.CreateTicket(userID, req.Name, req.Email, req.Category, req.Message)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Failed to submit ticket")
	}

	return response.Success(c, ticket)
}
