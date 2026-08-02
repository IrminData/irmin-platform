package controllers

import (
	"fmt"
	irmincache "irmin-api/cache"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/locales"
	"irmin-api/services"

	irmincore "github.com/IrminData/irmin-platform/sdks/go/api"
	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	"github.com/gofiber/fiber/v3"
)

// ScriptsIndex godoc
// @Summary List stored scripts
// @Description Get all stored scripts in the workspace that the user has permission to read
// @Tags scripts
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=[]irminmodels.StoredScript} "Scripts retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Workspace not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/scripts [get]
func (api *APIControllers) ScriptsIndex(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	user, userOk := c.Locals("user").(*db.User)
	if !dictOk || !workspaceOk || !userOk {
		return api.handleServiceError(
			c,
			"Error getting locals for ScriptsIndex",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Get all scripts in the workspace.
	scripts, err := api.Services.ListWorkspaceScripts(c, user, workspace)
	if err != nil {
		return api.handleServiceError(c, "Failed to list scripts", err, dict)
	}

	// Structure the response.
	scriptsResponse, formatErr := formatter.FormatIndexResponse(
		scripts,
		formatter.FormatStoredScriptResponse,
		api.SQIDManager,
	)
	if formatErr != nil {
		return api.handleServiceError(
			c,
			"Failed to format scripts",
			services.NewInternalErrorf("error formatting scripts: %v", formatErr),
			dict,
		)
	}

	// Return the response.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: scriptsResponse,
	})
}

// ScriptsStore godoc
// @Summary Create stored script
// @Description Create a new stored script in the workspace
// @Tags scripts
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param request body irmincore.CreateScriptRequest true "Script creation parameters"
// @Success 201 {object} irminmodels.IrminAPIResponse{data=irminmodels.StoredScript} "Script created successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid request body"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/scripts [post]
func (api *APIControllers) ScriptsStore(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	user, userOk := c.Locals("user").(*db.User)

	if !dictOk || !workspaceOk || !userOk {
		return api.handleServiceError(
			c,
			"Error getting locals for ScriptsStore",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Parse the JSON request body
	var req irmincore.CreateScriptRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		// validateAndBindRequestWithResponse already wrote a response if validation failed.
		// If it returns an error, it's a write error (e.g., connection closed), so return it directly.
		return validationErr
	}

	// Create the script
	script, err := api.Services.CreateScript(c, user, workspace, req)
	if err != nil {
		return api.handleServiceError(c, "Failed to create script", err, dict)
	}

	// Format the stored script
	formattedScript, formatStoredScriptResponseErr := formatter.FormatStoredScriptResponse(script, api.SQIDManager)
	if formatStoredScriptResponseErr != nil {
		return api.handleServiceError(
			c,
			"Failed to format stored script",
			services.NewInternalErrorf("error formatting stored script: %v", formatStoredScriptResponseErr),
			dict,
		)
	}

	// Invalidate caches for scripts listing and items (all users in workspace)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/scripts", workspace.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	// Send the response
	return api.validateAndWriteResponse(c, fiber.StatusCreated, irminmodels.IrminAPIResponse{
		Data: formattedScript,
	})
}

// ScriptsShow godoc
// @Summary Get stored script details
// @Description Get details of a specific stored script by its ID
// @Tags scripts
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param script_id path string true "Script ID (SQID)"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.StoredScript} "Script retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Script not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/scripts/{script_id} [get]
func (api *APIControllers) ScriptsShow(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	script, scriptOk := c.Locals("script").(*db.StoredScript)

	if !dictOk || !scriptOk {
		return api.handleServiceError(
			c,
			"Error getting locals for ScriptsShow",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Format the stored script
	formattedScript, formatStoredScriptResponseErr := formatter.FormatStoredScriptResponse(script, api.SQIDManager)
	if formatStoredScriptResponseErr != nil {
		return api.handleServiceError(
			c,
			"Failed to format stored script",
			services.NewInternalErrorf("error formatting stored script: %v", formatStoredScriptResponseErr),
			dict,
		)
	}

	// Send the response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: formattedScript,
	})
}

// ScriptsUpdate godoc
// @Summary Update stored script
// @Description Update an existing stored script's properties
// @Tags scripts
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param script_id path string true "Script ID (SQID)"
// @Param request body irmincore.UpdateScriptRequest true "Script update parameters"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.StoredScript} "Script updated successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid request body"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Script not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/scripts/{script_id} [patch]
//
//nolint:dupl // This is similar to other update endpoints
func (api *APIControllers) ScriptsUpdate(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	user, userOk := c.Locals("user").(*db.User)
	script, scriptOk := c.Locals("script").(*db.StoredScript)

	if !dictOk || !userOk || !scriptOk || !workspaceOk {
		return api.handleServiceError(
			c,
			"Error getting locals for ScriptsUpdate",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Parse the JSON request body
	var req irmincore.UpdateScriptRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		// validateAndBindRequestWithResponse already wrote a response if validation failed.
		// If it returns an error, it's a write error (e.g., connection closed), so return it directly.
		return validationErr
	}

	// Update the script
	script, err := api.Services.UpdateScript(c, user, workspace, script, req)
	if err != nil {
		return api.handleServiceError(c, "Failed to update script", err, dict)
	}

	// Format the stored script
	formattedScript, formatStoredScriptResponseErr := formatter.FormatStoredScriptResponse(script, api.SQIDManager)
	if formatStoredScriptResponseErr != nil {
		return api.handleServiceError(
			c,
			"Failed to format stored script",
			services.NewInternalErrorf("error formatting stored script: %v", formatStoredScriptResponseErr),
			dict,
		)
	}

	// Invalidate caches for scripts listing and items (all users in workspace)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/scripts", workspace.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	// Send the response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "script_updated"),
		Data:    formattedScript,
	})
}

// ScriptsDestroy godoc
// @Summary Delete stored script
// @Description Delete an existing stored script from the workspace
// @Tags scripts
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param script_id path string true "Script ID (SQID)"
// @Success 200 {object} irminmodels.IrminAPIResponse "Script deleted successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Script not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/scripts/{script_id} [delete]
func (api *APIControllers) ScriptsDestroy(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	user, userOk := c.Locals("user").(*db.User)
	script, scriptOk := c.Locals("script").(*db.StoredScript)

	if !dictOk || !scriptOk || !workspaceOk || !userOk {
		return api.handleServiceError(
			c,
			"Error getting locals for ScriptsDestroy",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Delete the script
	err := api.Services.DeleteScript(c, user, workspace, script)
	if err != nil {
		return api.handleServiceError(c, "Failed to delete script", err, dict)
	}

	// Invalidate caches for scripts listing and items (all users in workspace)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/scripts", workspace.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	// Send the response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "script_deleted"),
	})
}

// TransferScriptOwnership godoc
// @Summary Transfer script ownership
// @Description Transfer ownership of a stored script to another user in the workspace
// @Tags scripts
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param script_id path string true "Script ID (SQID)"
// @Param request body irmincore.TransferScriptOwnershipRequest true "Ownership transfer parameters"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.StoredScript} "Script ownership transferred successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid request body or new owner"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Script not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/scripts/{script_id}/transfer-ownership [post]
//
//nolint:dupl // This is similar to other transfer endpoints
func (api *APIControllers) TransferScriptOwnership(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	script, scriptOk := c.Locals("script").(*db.StoredScript)

	if !dictOk || !userOk || !workspaceOk || !scriptOk {
		return api.handleServiceError(
			c,
			"Error getting locals for TransferScriptOwnership",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Parse the JSON request body
	var req irmincore.TransferScriptOwnershipRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		// validateAndBindRequestWithResponse already wrote a response if validation failed.
		// If it returns an error, it's a write error (e.g., connection closed), so return it directly.
		return validationErr
	}

	// Transfer the script ownership
	script, err := api.Services.TransferScriptOwnership(c, user, workspace, script, req)
	if err != nil {
		return api.handleServiceError(c, "Failed to transfer script ownership", err, dict)
	}

	// Format the stored script
	formattedScript, formatStoredScriptResponseErr := formatter.FormatStoredScriptResponse(script, api.SQIDManager)
	if formatStoredScriptResponseErr != nil {
		return api.handleServiceError(
			c,
			"Failed to format stored script",
			services.NewInternalErrorf("error formatting stored script: %v", formatStoredScriptResponseErr),
			dict,
		)
	}

	// Invalidate caches for scripts in this workspace (all users)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/scripts", workspace.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	// Send the response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "script_ownership_transferred"),
		Data:    formattedScript,
	})
}

// ExecuteScript godoc
// @Summary Execute stored script
// @Description Execute a specific stored script and return the results
// @Tags scripts
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param script_id path string true "Script ID (SQID)"
// @Param request body irmincore.ExecuteScriptRequest true "Script execution parameters"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.ScriptResult} "Script executed successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid request body"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Script not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/scripts/{script_id}/execute [post]
func (api *APIControllers) ExecuteScript(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	script, scriptOk := c.Locals("script").(*db.StoredScript)

	if !dictOk || !userOk || !workspaceOk || !scriptOk {
		return api.handleServiceError(
			c,
			"Error getting locals for ExecuteScript",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Parse the JSON request body
	var req irmincore.ExecuteScriptRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		// validateAndBindRequestWithResponse already wrote a response if validation failed.
		// If it returns an error, it's a write error (e.g., connection closed), so return it directly.
		return validationErr
	}

	// Check for limit-response query parameter
	limitResponse := c.Query("limit-response") == queryParamValueTrue

	// Execute the script
	result, err := api.Services.ExecuteScript(c, user, workspace, script, req, limitResponse)
	if err != nil {
		return api.handleServiceError(c, "Failed to execute script", err, dict)
	}

	// Send the response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "script_executed"),
		Data:    result,
	})
}

// ScriptTemplatesIndex godoc
// @Summary List script templates
// @Description Get all available script templates
// @Tags scripts
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=[]irminmodels.Template} "Templates retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Workspace not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/scripts/templates [get]
func (api *APIControllers) ScriptTemplatesIndex(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	if !dictOk {
		return api.handleServiceError(
			c,
			"Error getting locals for ScriptTemplatesIndex",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Get all script templates
	templates, err := api.Services.ListTemplatesByType(c, irminmodels.TemplateTypeScript)
	if err != nil {
		return api.handleServiceError(c, "Error fetching script templates", err, dict)
	}

	// Format the response
	templatesResponse, formatErr := formatter.FormatIndexResponse(
		templates,
		formatter.FormatTemplateResponse,
		api.SQIDManager,
	)
	if formatErr != nil {
		return api.handleServiceError(
			c,
			"Error formatting templates",
			services.NewInternalErrorf("error formatting templates: %v", formatErr),
			dict,
		)
	}

	// Return the response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: templatesResponse,
	})
}
