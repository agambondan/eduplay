package response

import "github.com/gofiber/fiber/v2"

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

func ValidationError(c *fiber.Ctx, errs interface{}) error {
    return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
        "success": false,
        "data":    nil,
        "message": "Validation failed",
        "error":   errs,
    })
}
