package middleware

import (
	"context"
	"strings"

	"github.com/agambondan/eduplay/services/api/config"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/agambondan/eduplay/services/api/pkg/response"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

func AuthMiddleware(cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return response.Error(c, fiber.StatusUnauthorized, "Missing authorization header")
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return response.Error(c, fiber.StatusUnauthorized, "Invalid authorization header format")
		}

		tokenString := parts[1]
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return []byte(cfg.JWT.Secret), nil
		})

		if err != nil || !token.Valid {
			return response.Error(c, fiber.StatusUnauthorized, "Invalid or expired token")
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok || claims["typ"] != "access" {
			return response.Error(c, fiber.StatusUnauthorized, "Invalid token type")
		}

		jti := claims["jti"].(string)
		ctx := context.Background()
		val, _ := database.RDB.Get(ctx, "jwt:blacklist:"+jti).Result()
		if val != "" {
			return response.Error(c, fiber.StatusUnauthorized, "Token revoked")
		}

		c.Locals("user", token)
		c.Locals("user_id", claims["sub"].(string))
		return c.Next()
	}
}

func OptionalAuthMiddleware(cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Next()
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return c.Next()
		}

		tokenString := parts[1]
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return []byte(cfg.JWT.Secret), nil
		})

		if err == nil && token.Valid {
			if claims, ok := token.Claims.(jwt.MapClaims); ok && claims["typ"] == "access" {
				jti := claims["jti"].(string)
				ctx := context.Background()
				val, _ := database.RDB.Get(ctx, "jwt:blacklist:"+jti).Result()
				if val == "" {
					c.Locals("user", token)
					c.Locals("user_id", claims["sub"].(string))
				}
			}
		}
		return c.Next()
	}
}
