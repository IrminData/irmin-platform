package middlewares

import (
	"strings"

	"github.com/gofiber/fiber/v3"
)

// AIApplicationAPIKeyAuth authenticates requests using AI Application API keys.
// It expects the API key in the Authorization header as "Bearer ai_xxx".
// On success, it stores the AI Application and its Workspace in fiber.Locals.
func (m *APIMiddlewares) AIApplicationAPIKeyAuth(c fiber.Ctx) error {
	// Get the Authorization header
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   "Unauthorized",
			"message": "Missing Authorization header",
		})
	}

	// Extract the token
	token := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
	if token == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   "Unauthorized",
			"message": "Missing token",
		})
	}

	// Verify it's an AI Application API key
	if !strings.HasPrefix(token, "ai_") {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   "Unauthorized",
			"message": "Invalid token type - expected AI Application API key",
		})
	}

	// Look up the AI Application by API key
	aiApp, err := m.DB.GetAIApplicationByAPIKey(token)
	if err != nil {
		m.Logger.Error("Invalid AI Application API key", "error", err)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   "Unauthorized",
			"message": "Invalid AI Application API key",
		})
	}

	// Store the AI Application and Workspace in locals
	c.Locals("ai_application", aiApp)
	c.Locals("workspace", &aiApp.Workspace)

	return c.Next()
}
