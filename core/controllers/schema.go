package controllers

import (
	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	"github.com/gofiber/fiber/v3"
)

// WorkspaceSchemaIndex godoc
// @Summary Get workspace schema
// @Description Get the complete schema structure of a workspace including connections and repositories
// @Tags schema
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.ObjectSchema} "Workspace schema retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Workspace not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/schema [get]
func (api *APIControllers) WorkspaceSchemaIndex(c fiber.Ctx) error {
	locale, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		return api.handleServiceError(c, "Error validating workspace parameters", err, dict)
	}

	// Get the workspace schema
	schema, err := api.Services.GetWorkspaceSchema(c, locale, user, workspace, true, true)
	if err != nil {
		return api.handleServiceError(c, "Error getting workspace schema", err, dict)
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: schema,
	})
}
