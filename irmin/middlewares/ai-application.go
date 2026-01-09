package middlewares

import (
	"github.com/gofiber/fiber/v3"
)

// AIApplicationMiddleware retrieves AI application by ID and stores it in fiber.Locals.
func (m *APIMiddlewares) AIApplicationMiddleware(c fiber.Ctx) error {
	return resourceMiddleware(m, c, "ai_application", "ai_applications", m.DB.GetAIApplicationByID)
}
