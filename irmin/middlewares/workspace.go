package middlewares

import (
	"irmin-api/db"
	"irmin-api/locales"
	"irmin-api/services"

	"github.com/gofiber/fiber/v3"
)

// WorkspaceMiddleware verifies that the user has access to the workspace they are trying to access.
func (api *APIMiddlewares) WorkspaceMiddleware(c fiber.Ctx) error {
	// Get the dictionary and user from the request context.
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	if !dictOk || !userOk {
		return api.handleServiceError(
			c,
			"Error getting locals in WorkspaceMiddleware",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Parse the workspace slug from the request URL.
	workspaceSlug := c.Params("workspace")
	if workspaceSlug == "" {
		return api.handleServiceError(
			c,
			"No workspace selected",
			services.ErrInvalidRequest,
			dict,
		)
	}

	// Get the workspace.
	workspace, err := api.Services.GetWorkspace(c, user, workspaceSlug)
	if err != nil {
		return api.handleServiceError(c, "Error getting workspace", err, dict)
	}

	// Set the workspace in the context for subsequent handlers.
	c.Locals("workspace", workspace)

	return c.Next()
}
