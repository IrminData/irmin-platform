package routes

import "github.com/gofiber/fiber/v3"

// HealthHandler is a lightweight liveness probe for platforms that GET /health
// (e.g. Railway). It does not authenticate or touch the database.
func HealthHandler(c fiber.Ctx) error {
	return c.JSON(fiber.Map{"status": "ok"})
}
