package middlewares

import (
	"errors"
	"irmin-api/db"
	"irmin-api/locales"
	"irmin-api/services"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// InviteMiddleware parses the invite SQID from the request URL and sets the invite in the context.
func (api *APIMiddlewares) InviteMiddleware(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	if !dictOk || !userOk || !workspaceOk {
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

	// Find the invite by its ID.
	invite, err := api.Services.GetInviteByID(c, user, workspace, inviteSqid)
	if err != nil {
		api.Logger.Error("Error retrieving invite", "error", err)
		if errors.Is(err, services.ErrNotFound) {
			return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "invite_not_found")},
			})
		}
		if errors.Is(err, services.ErrInviteExpired) {
			return utils.WriteResponse(c, fiber.StatusGone, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "invite_expired")},
			})
		}
		if errors.Is(err, services.ErrInviteAlreadyAcceptedOrDeclined) {
			return utils.WriteResponse(c, fiber.StatusGone, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "invite_already_accepted_or_declined")},
			})
		}
		if errors.Is(err, services.ErrInviteNotAllowed) {
			return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "invite_not_allowed")},
			})
		}
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Set the invite in the context for subsequent handlers.
	c.Locals("invite", invite)
	return c.Next()
}
