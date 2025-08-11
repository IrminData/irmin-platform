package middlewares

import (
	"github.com/gofiber/fiber/v3"
)

// WorkspaceTagMiddleware verifies that the user has access to the tag they are trying to access.
func (api *APIMiddlewares) WorkspaceTagMiddleware(c fiber.Ctx) error {
	err := resourceMiddleware(api, c, "workspace-tag", "tags", api.DB.GetTagWithAssets)
	if err != nil {
		api.Logger.Error("WorkspaceTagMiddleware failed", "error", err)
	}
	return err
}
