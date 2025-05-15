package middlewares

import (
	"irmin-api/db"
	"irmin-api/locales"
	"irmin-api/utils"
	"log"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// InviteMiddleware parses the invite SQID from the request URL and sets the invite in the context.
func (api *APIMiddlewares) InviteMiddleware(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)

	// Parse the invite sqid from the request URL.
	inviteSqid := c.Params("invite")
	if inviteSqid == "" {
		log.Printf("No invite selected")
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Decode the invite ID.
	inviteID, err := utils.DecodeSqids("invites", inviteSqid)
	if err != nil {
		log.Printf("Error decoding invite sqid: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Find the invite by its ID.
	invite, err := api.DB.GetInviteByID(uint(inviteID))
	if err != nil {
		log.Printf("Error retrieving invite: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
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
	} else {
		log.Printf("Invite does not belong to the workspace or the user")
		return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("access_denied")},
		})
	}
}
