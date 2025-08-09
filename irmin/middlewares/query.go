package middlewares

import (
	"github.com/gofiber/fiber/v3"
)

// QueryMiddleware verifies that the user has access to the stored query they are trying to access.
func (api *APIMiddlewares) QueryMiddleware(c fiber.Ctx) error {
	return resourceMiddleware(api, c, "stored_query", "queries", api.DB.GetStoredQueryByID)
}
