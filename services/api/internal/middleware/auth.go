package middleware

import (
	"context"
	"strconv"
	"strings"

	"github.com/agambondan/eduplay/services/api/config"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/agambondan/eduplay/services/api/pkg/response"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

// tokenIssuedBeforeReset reports whether the token's iat predates a password
// reset for that user (set by AuthService.ResetPassword), meaning the token
// must be treated as revoked even though it isn't individually blacklisted.
func tokenIssuedBeforeReset(ctx context.Context, sub string, claims jwt.MapClaims) bool {
	val, err := database.RDB.Get(ctx, "user:tokens_valid_after:"+sub).Result()
	if err != nil || val == "" {
		return false
	}
	validAfter, err := strconv.ParseInt(val, 10, 64)
	if err != nil {
		return false
	}
	iat, _ := claims["iat"].(float64)
	return int64(iat) < validAfter
}

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
		}, jwt.WithValidMethods([]string{"HS256"}))

		if err != nil || !token.Valid {
			return response.Error(c, fiber.StatusUnauthorized, "Invalid or expired token")
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok || claims["typ"] != "access" {
			return response.Error(c, fiber.StatusUnauthorized, "Invalid token type")
		}

		jti, ok := claims["jti"].(string)
		if !ok || jti == "" {
			return response.Error(c, fiber.StatusUnauthorized, "Invalid token claims")
		}

		ctx := context.Background()
		val, _ := database.RDB.Get(ctx, "jwt:blacklist:"+jti).Result()
		if val != "" {
			return response.Error(c, fiber.StatusUnauthorized, "Token revoked")
		}

		sub, _ := claims["sub"].(string)
		if sub == "" {
			return response.Error(c, fiber.StatusUnauthorized, "Invalid token claims")
		}

		if tokenIssuedBeforeReset(ctx, sub, claims) {
			return response.Error(c, fiber.StatusUnauthorized, "Token revoked")
		}

		c.Locals("user", token)
		c.Locals("user_id", sub)
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
		}, jwt.WithValidMethods([]string{"HS256"}))

		if err == nil && token.Valid {
			if claims, ok := token.Claims.(jwt.MapClaims); ok && claims["typ"] == "access" {
				jti, ok := claims["jti"].(string)
				if ok && jti != "" {
					ctx := context.Background()
					val, _ := database.RDB.Get(ctx, "jwt:blacklist:"+jti).Result()
					sub, _ := claims["sub"].(string)
					if val == "" && sub != "" && !tokenIssuedBeforeReset(ctx, sub, claims) {
						c.Locals("user", token)
						c.Locals("user_id", sub)
					}
				}
			}
		}
		return c.Next()
	}
}
