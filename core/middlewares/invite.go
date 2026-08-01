package middlewares

import (
	"irmin-api/db"
	"irmin-api/locales"
	"irmin-api/services"

	"github.com/gofiber/fiber/v3"
)

// InviteMiddleware parses the invite SQID from the request URL and sets the invite in the context.
// This middleware works both for routes under workspace context and standalone invite routes.
func (api *APIMiddlewares) InviteMiddleware(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	if !dictOk || !userOk {
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

	// Find the invite by its ID and get its workspace.
	// This method performs basic access checks without requiring workspace context.
	invite, workspace, err := api.Services.GetInviteForMiddleware(c, user, inviteSqid)
	if err != nil {
		return api.handleServiceError(c, "Error retrieving invite", err, dict)
	}

	// Set the invite and workspace in the context for subsequent handlers.
	c.Locals("invite", invite)
	c.Locals("workspace", workspace)
	return c.Next()
}
