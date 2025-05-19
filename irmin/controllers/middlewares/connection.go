package middlewares

import (
	"github.com/gofiber/fiber/v3"
)

// ConnectionMiddleware verifies that the user has access to the connection they are trying to access.
func (api *APIMiddlewares) ConnectionMiddleware(c fiber.Ctx) error {
	return resourceMiddleware(api, c, "connection", "connections", api.DB.GetConnectionByID)
}
