package middlewares

import (
	"irmin-api/db"
	"irmin-api/locales"
	"irmin-api/services"

	"github.com/gofiber/fiber/v3"
)

// InviteMiddleware parses the invite SQID from the request URL and sets the invite in the context.
func (api *APIMiddlewares) InviteMiddleware(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	if !dictOk || !userOk || !workspaceOk {
		return api.handleServiceError(
			c,
			"Error getting locals in InviteMiddleware",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Parse the invite sqid from the request URL.
	inviteSqid := c.Params("invite")
	if inviteSqid == "" {
		return api.handleServiceError(
			c,
			"No invite selected",
			services.ErrInvalidRequest,
			dict,
		)
	}

	// Find the invite by its ID.
	invite, err := api.Services.GetInviteByID(c, user, workspace, inviteSqid)
	if err != nil {
		return api.handleServiceError(c, "Error retrieving invite", err, dict)
	}

	// Set the invite in the context for subsequent handlers.
	c.Locals("invite", invite)
	return c.Next()
}
