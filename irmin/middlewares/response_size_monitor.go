package middlewares

import (
	"github.com/gofiber/fiber/v3"
)

const (
	responseSizeWarningThreshold = 50 * 1024 * 1024 // 50MB
	bytesPerMB                   = 1024 * 1024
)

// ResponseSizeMonitor logs warnings for large in-memory responses that may indicate
// missing streaming or redirect optimizations.
func (api *APIMiddlewares) ResponseSizeMonitor(c fiber.Ctx) error {
	err := c.Next()

	responseSize := len(c.Response().Body())
	if responseSize > responseSizeWarningThreshold {
		api.Logger.WarnContext(
			c.Context(),
			"large in-memory response detected",
			"path", c.Path(),
			"method", c.Method(),
			"response_size_bytes", responseSize,
			"response_size_mb", responseSize/bytesPerMB,
		)
	}

	return err
}
