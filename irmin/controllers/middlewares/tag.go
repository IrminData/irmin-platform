package middlewares

import (
	"github.com/gofiber/fiber/v3"
)

// TagMiddleware verifies that the user has access to the tag they are trying to access.
func (api *APIMiddlewares) TagMiddleware(c fiber.Ctx) error {
	err := resourceMiddleware(api, c, "tag", "tags", api.DB.GetTagWithAssets)
	if err != nil {
		api.Logger.Error("TagMiddleware failed", "error", err)
	}
	return err
}
