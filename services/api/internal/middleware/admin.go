package middleware

import (
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/agambondan/eduplay/services/api/pkg/response"
	"github.com/gofiber/fiber/v2"
)

func AdminMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		userId, ok := c.Locals("user_id").(string)
		if !ok || userId == "" {
			return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
		}

		var role string
		database.DB.Raw("SELECT role FROM users WHERE id = ?", userId).Scan(&role)
		if role != "admin" {
			return response.Error(c, fiber.StatusForbidden, "Admin access required")
		}

		return c.Next()
	}
}
