package controllers

import (
	"errors"
	"fmt"

	irmincache "irmin-api/cache"
	"irmin-api/db"
	"irmin-api/locales"
	"irmin-api/services"
	"irmin-api/utils"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// EditorIndex godoc
// @Summary List editor items
// @Description Get all editor items at the specified path in the workspace
// @Tags editor
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param path query string false "Path to list items from" default("")
// @Success 200 {object} irminmodels.IrminAPIResponse{data=[]object} "Editor items retrieved successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid query parameters"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/editor [get]
func (api *APIControllers) EditorIndex(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	if !dictOk || !userOk || !workspaceOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the path from the query parameters
	params, parseQueryParamsErr := utils.ParseQueryParams(c, nil, []string{"path"})
	if parseQueryParamsErr != nil {
		api.Logger.Error("Error retrieving query parameters", "error", parseQueryParamsErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Get the editor items for the workspace.
	editorItems, err := api.Services.ListEditorItems(c, user, workspace, params["path"])
	if err != nil {
		api.Logger.Error("Error listing editor items", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Return the editor items.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: editorItems,
	})
}

// EditorItemStore godoc
// @Summary Create or update editor item
// @Description Create a new editor item or update an existing one at the specified path
// @Tags editor
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param path query string true "Path where to create/update the item"
// @Param request body irmincore.CreateEditorItemRequest true "Editor item content and type"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.EditorItem} "Editor item saved successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid request body or path"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/editor [post]
func (api *APIControllers) EditorItemStore(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	if !dictOk || !userOk || !workspaceOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the path from query parameters
	params, parseQueryParamsErr := utils.ParseQueryParams(c, nil, []string{"path"})
	if parseQueryParamsErr != nil {
		api.Logger.Error("Error retrieving query parameters", "error", parseQueryParamsErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Parse the JSON request body
	var req irmincore.CreateEditorItemRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		return validationErr
	}

	// Save the editor item.
	editorItem, err := api.Services.SaveEditorItem(c, user, workspace, params["path"], req)
	if err != nil {
		api.Logger.Error("Error saving editor item", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Invalidate editor listings and content for this workspace (all users)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/editor", workspace.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	// Return a success response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data:    editorItem,
		Message: api.lm.T(dict, "editor_item_saved"),
	})
}

// EditorItemDestroy godoc
// @Summary Delete editor item
// @Description Delete an editor item or folder at the specified path
// @Tags editor
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param path query string true "Path of the item to delete"
// @Success 200 {object} irminmodels.IrminAPIResponse "Editor item deleted successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid or missing path"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/editor [delete]
func (api *APIControllers) EditorItemDestroy(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	if !dictOk || !userOk || !workspaceOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the path from query parameters
	params, parseQueryParamsErr := utils.ParseQueryParams(c, nil, []string{"path"})
	if parseQueryParamsErr != nil {
		api.Logger.Error("Error retrieving query parameters", "error", parseQueryParamsErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Delete the editor item.
	if err := api.Services.DeleteEditorItem(c, user, workspace, params["path"]); err != nil {
		api.Logger.Error("Error deleting editor item", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Invalidate editor listings and content for this workspace (all users)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/editor", workspace.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	// Return a success response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "editor_item_deleted"),
	})
}

// MoveEditorItem godoc
// @Summary Move editor item
// @Description Move an editor item from one path to another within the workspace
// @Tags editor
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param path query string true "Source path of the item to move"
// @Param request body irmincore.MoveEditorItemRequest true "Destination path"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.EditorItem} "Editor item moved successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid paths"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/editor/move [post]
//
//nolint:dupl // This endpoint is similar to CopyEditorItem, but not the same
func (api *APIControllers) MoveEditorItem(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	if !dictOk || !userOk || !workspaceOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the path from query parameters
	params, parseQueryParamsErr := utils.ParseQueryParams(c, nil, []string{"path"})
	if parseQueryParamsErr != nil {
		api.Logger.Error("Error retrieving query parameters", "error", parseQueryParamsErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}
	// Parse the JSON request body
	var req irmincore.MoveEditorItemRequest
	if err := c.Bind().JSON(&req); err != nil {
		api.Logger.Error("Error parsing JSON request body", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Validate required fields
	if req.DestinationPath == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{"destination_path is required"},
		})
	}

	// Move the editor item using the service (path formatting handled in service)
	editorItem, err := api.Services.MoveEditorItem(c, user, workspace, params["path"], req.DestinationPath)

	if err != nil {
		api.Logger.Error("Error moving editor item", "error", err)
		if errors.Is(err, services.ErrEditorItemPathRequired) ||
			errors.Is(err, services.ErrEditorItemDestinationPathRequired) {
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
				Errors: []string{"path is required"},
			})
		}
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Invalidate editor listings and content for this workspace (all users)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/editor", workspace.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	// Return a success response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data:    editorItem,
		Message: api.lm.T(dict, "editor_item_moved"),
	})
}

// CopyEditorItem godoc
// @Summary Copy editor item
// @Description Copy an editor item from one path to another within the workspace
// @Tags editor
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param path query string true "Source path of the item to copy"
// @Param request body irmincore.MoveEditorItemRequest true "Destination path"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.EditorItem} "Editor item copied successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid paths"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/editor/copy [post]
//
//nolint:dupl // This endpoint is similar to MoveEditorItem, but not the same
func (api *APIControllers) CopyEditorItem(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	if !dictOk || !userOk || !workspaceOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the path from query parameters
	params, parseQueryParamsErr := utils.ParseQueryParams(c, nil, []string{"path"})
	if parseQueryParamsErr != nil {
		api.Logger.Error("Error retrieving query parameters", "error", parseQueryParamsErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}
	// Parse the JSON request body
	var req irmincore.MoveEditorItemRequest
	if err := c.Bind().JSON(&req); err != nil {
		api.Logger.Error("Error parsing JSON request body", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Validate required fields
	if req.DestinationPath == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{"destination_path is required"},
		})
	}

	// Copy the editor item using the service
	editorItem, err := api.Services.CopyEditorItem(c, user, workspace, params["path"], req.DestinationPath)

	if err != nil {
		api.Logger.Error("Error copying editor item", "error", err)
		if errors.Is(err, services.ErrEditorItemPathRequired) ||
			errors.Is(err, services.ErrEditorItemDestinationPathRequired) {
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
				Errors: []string{"path is required"},
			})
		}
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Invalidate editor listings and content for this workspace (all users)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/editor", workspace.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	// Return a success response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data:    editorItem,
		Message: api.lm.T(dict, "editor_item_copied"),
	})
}

// EditorItemContent godoc
// @Summary Get editor item content
// @Description Get the content of a specific editor item
// @Tags editor
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param path query string true "Path of the item to retrieve"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=string} "Editor item content retrieved successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid or missing path"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/editor/content [get]
func (api *APIControllers) EditorItemContent(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	if !dictOk || !userOk || !workspaceOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the file path from query parameters
	params, parseQueryParamsErr := utils.ParseQueryParams(c, nil, []string{"path"})
	if parseQueryParamsErr != nil {
		api.Logger.Error("Error retrieving query parameters", "error", parseQueryParamsErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}
	// Get the editor item content using the service (path formatting handled in service)
	content, err := api.Services.GetEditorItemContent(c, user, workspace, params["path"])
	if err != nil {
		api.Logger.Error("Error getting editor item content", "error", err)
		if errors.Is(err, services.ErrEditorItemPathRequired) {
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
				Errors: []string{"path is required"},
			})
		}
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Return the item's content
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: content,
	})
}

// EditorItemExecute godoc
// @Summary Execute editor item
// @Description Execute an editor item (script) in the compute sandbox with optional input data
// @Tags editor
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param path query string true "Path of the item to execute"
// @Param request body irmincore.ExecuteEditorItemRequest false "Optional input data from repositories"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.ScriptResult} "Editor item executed successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid path or input data"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/editor/execute [post]
func (api *APIControllers) EditorItemExecute(c fiber.Ctx) error {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	if !localeOk || !dictOk || !userOk || !workspaceOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the file path from query parameters
	params, parseQueryParamsErr := utils.ParseQueryParams(c, nil, []string{"path"})
	if parseQueryParamsErr != nil {
		api.Logger.Error("Error retrieving query parameters", "error", parseQueryParamsErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Parse the JSON request body for optional input data
	var req irmincore.ExecuteEditorItemRequest
	if err := c.Bind().JSON(&req); err != nil {
		// If JSON parsing fails, assume no input data (optional)
		req.Input = nil
	}

	// Execute the editor item using the service (path formatting handled in service)
	scriptResult, err := api.Services.ExecuteEditorItem(c, user, workspace, params["path"], req.Input, locale)
	if err != nil {
		api.Logger.Error("Error executing editor item", "error", err)
		if errors.Is(err, services.ErrEditorItemPathRequired) {
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
				Errors: []string{"path is required"},
			})
		}
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Return the results
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: scriptResult,
	})
}
