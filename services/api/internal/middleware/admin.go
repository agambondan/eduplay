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

		type userInfo struct {
			Role     string
			IsActive bool
		}
		var u userInfo
		err := database.DB.Raw("SELECT role, is_active FROM users WHERE id = ?", userId).Scan(&u).Error
		if err != nil || u.Role != "admin" || !u.IsActive {
			return response.Error(c, fiber.StatusForbidden, "Admin access required")
		}

		return c.Next()
	}
}
