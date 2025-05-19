package middlewares

import (
	"irmin-api/db"
	"irmin-api/locales"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// InviteMiddleware parses the invite SQID from the request URL and sets the invite in the context.
func (api *APIMiddlewares) InviteMiddleware(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	if !dictOk || !userOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the invite sqid from the request URL.
	inviteSqid := c.Params("invite")
	if inviteSqid == "" {
		api.Logger.Error("No invite selected")
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Decode the invite ID.
	inviteID, err := api.SQIDManager.Decode("invites", inviteSqid)
	if err != nil {
		api.Logger.Error("Error decoding invite sqid", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Find the invite by its ID.
	invite, err := api.DB.GetInviteByID(uint(inviteID))
	if err != nil {
		api.Logger.Error("Error retrieving invite", "error", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Make sure the invite is either to the workspace user has access to or to the user.
	hasAccess := invite.Email == user.Email
	for _, workspaceUser := range user.Workspaces {
		if workspaceUser.WorkspaceID == invite.WorkspaceID {
			hasAccess = true
			break
		}
	}

	if hasAccess {
		// Set the invite in the context for subsequent handlers.
		c.Locals("invite", invite)
		return c.Next()
	}

	return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
		Errors: []string{api.lm.T(dict, "access_denied")},
	})
}
