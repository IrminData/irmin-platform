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
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	if !dictOk || !workspaceOk {
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

	// Decode the user ID.
	userID, err := api.SQIDManager.Decode("users", userSqid)
	if err != nil {
		api.Logger.Error("Error decoding user sqid", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Find the workspace user by their ID and the workspace ID.
	workspaceMember, err := api.DB.GetWorkspaceUser(workspace.ID, uint(userID))
	if err != nil {
		api.Logger.Error("Error retrieving user", "error", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Set the workspace member in the context for subsequent handlers.
	c.Locals("workspace_member", workspaceMember)

	return c.Next()
}
