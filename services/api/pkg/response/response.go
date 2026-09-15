package response

import (
	"github.com/agambondan/eduplay/services/api/pkg/logger"
	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"
)

func Success(c *fiber.Ctx, data interface{}) error {
	return c.JSON(fiber.Map{
		"success": true,
		"data":    data,
		"message": "OK",
		"error":   nil,
	})
}

func Error(c *fiber.Ctx, status int, msg string) error {
	return c.Status(status).JSON(fiber.Map{
		"success": false,
		"data":    nil,
		"message": msg,
		"error":   msg,
	})
}

// InternalError logs the real error server-side and returns a generic
// message to the client. Handler code almost never has a reason to forward
// err.Error() on a 500 — the underlying error can be a raw SQL/driver
// message or filesystem path, and there's no systemic guard against that
// leaking once it isn't hand-sanitized at each call site.
func InternalError(c *fiber.Ctx, err error) error {
	logger.Log.Error("internal error", zap.Error(err), zap.String("path", c.Path()))
	return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
		"success": false,
		"data":    nil,
		"message": "Internal server error",
		"error":   "internal_error",
	})
}

func ValidationError(c *fiber.Ctx, errs interface{}) error {
	return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
		"success": false,
		"data":    nil,
		"message": "Validation failed",
		"error":   errs,
	})
}
