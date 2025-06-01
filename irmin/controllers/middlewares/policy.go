package middlewares

import (
	"irmin-api/db"
	"irmin-api/locales"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// PolicyMiddleware verifies that the policy exists and belongs to the workspace.
func (api *APIMiddlewares) PolicyMiddleware(c fiber.Ctx) error {
	// Get the dictionary and workspace from the request context
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	if !dictOk || !workspaceOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the policy ID from the request URL
	policyID, decodeErr := api.SQIDManager.Decode("policies", c.Params("policy"))
	if decodeErr != nil {
		api.Logger.Error("Error decoding policy ID", "error", decodeErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Get the policy by ID
	var policy db.Policy
	if findErr := api.DB.First(&policy, policyID).Error; findErr != nil {
		api.Logger.Error("Error retrieving policy", "error", findErr)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Verify the policy belongs to the workspace
	if policy.WorkspaceID == nil || *policy.WorkspaceID != workspace.ID {
		api.Logger.Error("Policy does not belong to workspace")
		return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "access_denied")},
		})
	}

	// Set the policy in the context for subsequent handlers
	c.Locals("policy", &policy)

	return c.Next()
}
