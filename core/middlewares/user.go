package middlewares

import (
	"irmin-api/db"
	"irmin-api/locales"
	"irmin-api/services"

	"github.com/gofiber/fiber/v3"
)

// UserMiddleware parses the user SQID from the request URL and sets the user in the context.
func (api *APIMiddlewares) UserMiddleware(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	if !dictOk || !userOk || !workspaceOk {
		return api.handleServiceError(
			c,
			"Error getting locals in UserMiddleware",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Parse the user sqid from the request URL.
	userSqid := c.Params("user")
	if userSqid == "" {
		return api.handleServiceError(
			c,
			"No user selected",
			services.ErrInvalidRequest,
			dict,
		)
	}

	// Get the workspace member
	workspaceMember, err := api.Services.GetWorkspaceUser(c, user, workspace, userSqid)
	if err != nil {
		return api.handleServiceError(c, "Error getting workspace member", err, dict)
	}

	// Set the workspace member in the context for subsequent handlers.
	c.Locals("workspace_member", workspaceMember)

	return c.Next()
}
