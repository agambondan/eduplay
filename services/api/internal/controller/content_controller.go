package controller

import (
	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/gofiber/fiber/v2"
)

type ContentController struct{}

func NewContentController() *ContentController {
	return &ContentController{}
}

// GetFlags godoc
// GET /api/v1/content/flags
func (h *ContentController) GetFlags(c *fiber.Ctx) error {
	var countries []model.Country
	if err := database.DB.Select("id, name, flag_emoji, flag_code, region").Find(&countries).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to fetch flags",
		})
	}
	return c.JSON(fiber.Map{"success": true, "data": countries})
}

// GetCapitals godoc
// GET /api/v1/content/capitals
func (h *ContentController) GetCapitals(c *fiber.Ctx) error {
	var countries []model.Country
	if err := database.DB.Select("id, name, capital, flag_code").Find(&countries).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to fetch capitals",
		})
	}
	return c.JSON(fiber.Map{"success": true, "data": countries})
}

// GetElements godoc
// GET /api/v1/content/elements
func (h *ContentController) GetElements(c *fiber.Ctx) error {
	var elements []model.ChemicalElement
	if err := database.DB.Find(&elements).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to fetch elements",
		})
	}
	return c.JSON(fiber.Map{"success": true, "data": elements})
}

// GetHistoryEvents godoc
// GET /api/v1/content/history?region=indonesia|world
func (h *ContentController) GetHistoryEvents(c *fiber.Ctx) error {
	var events []model.HistoryEvent
	q := database.DB.Model(&model.HistoryEvent{})
	if region := c.Query("region"); region != "" {
		q = q.Where("region = ?", region)
	}
	if err := q.Find(&events).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to fetch history events",
		})
	}
	return c.JSON(fiber.Map{"success": true, "data": events})
}

// GetWordleWords godoc
// GET /api/v1/content/words/wordle?lang=id
func (h *ContentController) GetWordleWords(c *fiber.Ctx) error {
	lang := c.Query("lang", "id")
	var words []model.WordleWord
	if err := database.DB.Where("language = ?", lang).Find(&words).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to fetch wordle words",
		})
	}
	return c.JSON(fiber.Map{"success": true, "data": words})
}
