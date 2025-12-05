package middlewares

import (
	"github.com/gofiber/fiber/v3"
)

// ScriptMiddleware verifies that the user has access to the stored script they are trying to access.
func (api *APIMiddlewares) ScriptMiddleware(c fiber.Ctx) error {
	return resourceMiddleware(api, c, "script", "scripts", api.DB.GetStoredScriptByID)
}
