package middlewares

import (
	"irmin-api/db"
	"irmin-api/locales"
	"irmin-api/services"

	"github.com/gofiber/fiber/v3"
)

// PolicyMiddleware verifies that the policy exists and belongs to the workspace.
func (api *APIMiddlewares) PolicyMiddleware(c fiber.Ctx) error {
	// Get the dictionary and workspace from the request context
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	if !dictOk || !userOk || !workspaceOk {
		return api.handleServiceError(
			c,
			"Error getting locals in PolicyMiddleware",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Get the policy sqid from the request URL
	policySQID := c.Params("policy")

	// Get the policy
	policy, err := api.Services.GetPolicy(c, user, workspace, policySQID)
	if err != nil {
		return api.handleServiceError(c, "Error retrieving policy", err, dict)
	}

	// Set the policy in the context for subsequent handlers
	c.Locals("policy", policy)

	return c.Next()
}
