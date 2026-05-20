package middleware

import (
	"bytes"
	"encoding/json"
	"strings"
	"time"

	"github.com/agambondan/eduplay/services/api/pkg/logger"
	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var sensitiveHeaders = map[string]bool{
	"authorization": true,
	"cookie":        true,
	"set-cookie":    true,
	"x-api-key":     true,
}

var sensitiveFields = map[string]bool{
	"password":         true,
	"password_confirm": true,
	"new_password":     true,
	"token":            true,
	"access_token":     true,
	"refresh_token":    true,
	"id_token":         true,
	"secret":           true,
	"api_key":          true,
	"credit_card":      true,
	"card_number":      true,
	"cvv":              true,
}

func maskValue(v string) string {
	if len(v) <= 4 {
		return "****"
	}
	return v[:2] + "****" + v[len(v)-2:]
}

func redactJSON(data []byte) []byte {
	var raw map[string]interface{}
	if err := json.Unmarshal(data, &raw); err != nil {
		return data
	}
	for k := range raw {
		if sensitiveFields[strings.ToLower(k)] {
			raw[k] = "****"
		}
	}
	redacted, _ := json.Marshal(raw)
	return redacted
}

func redactHeaders(c *fiber.Ctx) []zapcore.Field {
	var fields []zapcore.Field
	c.Request().Header.VisitAll(func(key, val []byte) {
		k := string(key)
		v := string(val)
		if sensitiveHeaders[strings.ToLower(k)] {
			v = maskValue(v)
		}
		fields = append(fields, zap.String(k, v))
	})
	return fields
}

func RequestLogger() fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()

		reqBody := bytes.Clone(c.Request().Body())

		err := c.Next()

		latency := time.Since(start)
		fields := []zapcore.Field{
			zap.String("method", c.Method()),
			zap.String("path", c.Path()),
			zap.Int("status", c.Response().StatusCode()),
			zap.Duration("latency", latency),
			zap.String("ip", c.IP()),
			zap.String("user_agent", c.Get("User-Agent")),
		}

		if q := c.Request().URI().QueryArgs(); q.Len() > 0 {
			qMap := make(map[string]string)
			q.VisitAll(func(k, v []byte) { qMap[string(k)] = string(v) })
			fields = append(fields, zap.Any("query", qMap))
		}

		if p := c.AllParams(); len(p) > 0 {
			fields = append(fields, zap.Any("params", p))
		}

		fields = append(fields, redactHeaders(c)...)

		if len(reqBody) > 0 && len(reqBody) < 10240 {
			fields = append(fields, zap.ByteString("req_body", redactJSON(reqBody)))
		} else if len(reqBody) >= 10240 {
			fields = append(fields, zap.String("req_body", "[truncated]"))
		}

		if resBytes := c.Response().Body(); len(resBytes) > 0 && len(resBytes) < 10240 {
			var buf bytes.Buffer
			if json.Indent(&buf, redactJSON(resBytes), "", "  ") == nil {
				fields = append(fields, zap.String("res_body", buf.String()))
			} else {
				fields = append(fields, zap.ByteString("res_body", redactJSON(resBytes)))
			}
		} else if len(resBytes) >= 10240 {
			fields = append(fields, zap.String("res_body", "[truncated]"))
		}

		logger.Log.Info("request", fields...)

		return err
	}
}
