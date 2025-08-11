package middlewares

import (
	"irmin-api/db"
	"irmin-api/locales"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// UserMiddleware parses the user SQID from the request URL and sets the user in the context.
func (api *APIMiddlewares) UserMiddleware(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	if !dictOk || !userOk || !workspaceOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the user sqid from the request URL.
	userSqid := c.Params("user")
	if userSqid == "" {
		api.Logger.Error("No user selected")
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Get the workspace member
	workspaceMember, err := api.Services.GetWorkspaceUser(c, user, workspace, userSqid)
	if err != nil {
		api.Logger.Error("Error getting workspace member", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Set the workspace member in the context for subsequent handlers.
	c.Locals("workspace_member", workspaceMember)

	return c.Next()
}
