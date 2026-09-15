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

// redactValue walks arbitrarily nested JSON (objects and arrays) and masks
// any object key that matches sensitiveFields, at any depth — a shallow,
// top-level-only redaction misses fields nested under a wrapper like the
// {"data": {...}} envelope every response body uses.
func redactValue(v interface{}) interface{} {
	switch val := v.(type) {
	case map[string]interface{}:
		for k, sub := range val {
			if sensitiveFields[strings.ToLower(k)] {
				val[k] = "****"
				continue
			}
			val[k] = redactValue(sub)
		}
		return val
	case []interface{}:
		for i, sub := range val {
			val[i] = redactValue(sub)
		}
		return val
	default:
		return v
	}
}

// redactJSON only redacts when the body actually parses as JSON. A body
// that fails to parse (form-urlencoded, multipart, or malformed JSON) is
// replaced with a placeholder rather than logged raw, since a client can
// otherwise dodge redaction entirely by sending the same fields as a
// different content type (e.g. a login password via form-urlencoded).
func redactJSON(data []byte) []byte {
	var raw interface{}
	if err := json.Unmarshal(data, &raw); err != nil {
		return []byte(`"[unparsable body omitted]"`)
	}
	redacted, _ := json.Marshal(redactValue(raw))
	return redacted
}

// redactQuery masks sensitive query parameters (e.g. a token passed as
// ?token=... on email verification links) before logging.
func redactQuery(q map[string]string) map[string]string {
	for k, v := range q {
		if sensitiveFields[strings.ToLower(k)] {
			q[k] = maskValue(v)
		}
	}
	return q
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
			fields = append(fields, zap.Any("query", redactQuery(qMap)))
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
