package middlewares

import (
	"errors"
	"irmin-api/db"
	"irmin-api/locales"
	"irmin-api/services"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
)

// WorkspaceMiddleware verifies that the user has access to the workspace they are trying to access.
func (api *APIMiddlewares) WorkspaceMiddleware(c fiber.Ctx) error {
	// Get the dictionary and user from the request context.
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	if !dictOk || !userOk {
		api.Logger.Error("Error getting locals in WorkspaceMiddleware",
			"dictOk", dictOk,
			"userOk", userOk)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the workspace slug from the request URL.
	workspaceSlug := c.Params("workspace")
	if workspaceSlug == "" {
		api.Logger.Error("No workspace selected")
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Get the workspace.
	workspace, err := api.Services.GetWorkspace(c, user, workspaceSlug)
	if err != nil {
		api.Logger.Error("Error getting workspace", "error", err)
		if errors.Is(err, services.ErrWorkspaceNotMember) {
			return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "insufficient_permissions")},
			})
		}
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "not_found")},
			})
		}
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Set the workspace in the context for subsequent handlers.
	c.Locals("workspace", workspace)

	return c.Next()
}
