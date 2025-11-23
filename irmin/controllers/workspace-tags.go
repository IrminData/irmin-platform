package controllers

import (
	"fmt"
	irmincache "irmin-api/cache"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/lib"
	"irmin-api/services"
	"irmin-api/utils"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"

	"github.com/gofiber/fiber/v3"
)

// WorkspaceTagsIndex godoc
// @Summary List workspace tags
// @Description Get all tags available in the workspace that can be applied to resources
// @Tags tags
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=[]irminmodels.Tag} "Tags retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Workspace not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/tags [get]
func (api *APIControllers) WorkspaceTagsIndex(c fiber.Ctx) error {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get all tags from the workspace using the service
	tags, err := api.Services.ListWorkspaceTags(c, user, workspace)
	if err != nil {
		api.Logger.Error("Error retrieving tags", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Format the tags
	formattedTags, err := formatter.FormatTagsResponse(tags, api.SQIDManager)
	if err != nil {
		api.Logger.Error("Error formatting tags", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: formattedTags,
	})
}

// WorkspaceTagsStore godoc
// @Summary Create workspace tag
// @Description Create a new tag in the workspace that can be applied to various resources
// @Tags tags
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param body body irmincore.CreateTagRequest true "Tag creation request"
// @Success 201 {object} irminmodels.IrminAPIResponse{data=irminmodels.Tag} "Tag created successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid tag data"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 409 {object} irminmodels.IrminAPIResponse "Tag name already exists"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/tags [post]
func (api *APIControllers) WorkspaceTagsStore(c fiber.Ctx) error {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the JSON request body
	var req irmincore.CreateTagRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		return validationErr
	}

	// Create the tag using the service
	tag, err := api.Services.CreateWorkspaceTag(c, user, workspace, req)
	if err != nil {
		api.Logger.Error("Error creating tag", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Format the response
	formattedTag, err := formatter.FormatTagResponse(tag, api.SQIDManager)
	if err != nil {
		api.Logger.Error("Error formatting tag", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Invalidate tags endpoints for this workspace (all users)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/tags", workspace.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	return api.validateAndWriteResponse(c, fiber.StatusCreated, irminmodels.IrminAPIResponse{
		Data: formattedTag,
	})
}

// WorkspaceTagsShow godoc
// @Summary Get tag with associated resources
// @Description Get details of a specific tag including all resources it's applied to (filtered by permissions)
// @Tags tags
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param tag_id path string true "Tag ID (SQID encoded)"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.TagWithAssets} "Tag with associated resources retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Tag not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/tags/{tag_id} [get]
func (api *APIControllers) WorkspaceTagsShow(c fiber.Ctx) error {
	_, dict, _, _, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the tag from locals
	tagWithAssets, tagOk := c.Locals("tag_id").(*db.TagWithAssets)
	if !tagOk {
		api.Logger.Error("Error getting locals for TagsShow")
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Format the tag with assets
	formattedTagWithAssets, err := formatter.FormatTagWithAssetsResponse(
		tagWithAssets,
		api.SQIDManager,
		api.DB,
	)
	if err != nil {
		api.Logger.Error("Error formatting tag with assets", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: formattedTagWithAssets,
	})
}

// WorkspaceTagsUpdate godoc
// @Summary Update workspace tag
// @Description Update properties of an existing tag (name, color, description)
// @Tags tags
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param tag_id path string true "Tag ID (SQID encoded)"
// @Param body body irmincore.UpdateTagRequest true "Tag update request"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Tag} "Tag updated successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid tag data"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Tag not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/tags/{tag_id} [patch]
func (api *APIControllers) WorkspaceTagsUpdate(c fiber.Ctx) error {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the tag from locals
	tagWithAssets, tagOk := c.Locals("tag_id").(*db.TagWithAssets)
	if !tagOk {
		api.Logger.Error("Error getting locals for TagsUpdate")
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the JSON request body
	var req irmincore.UpdateTagRequest
	if bindErr := c.Bind().JSON(&req); bindErr != nil {
		api.Logger.Error("Error parsing JSON request body", "error", bindErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Update the tag using the service
	tagWithAssets, err = api.Services.UpdateWorkspaceTag(c, user, workspace, tagWithAssets, req)
	if err != nil {
		api.Logger.Error("Error updating tag", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Format the response
	formattedTag, err := formatter.FormatTagResponse(&tagWithAssets.Tag, api.SQIDManager)
	if err != nil {
		api.Logger.Error("Error formatting tag", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeUpdate,
		Description: fmt.Sprintf("Tag %s updated", tagWithAssets.Tag.Name),
		UserID:      &user.ID,
	})

	// Invalidate tags endpoints for this workspace (all users)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/tags", workspace.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: formattedTag,
	})
}

// WorkspaceTagsDestroy godoc
// @Summary Delete workspace tag
// @Description Delete a tag and remove it from all associated resources
// @Tags tags
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param tag_id path string true "Tag ID (SQID encoded)"
// @Success 200 {object} irminmodels.IrminAPIResponse "Tag deleted successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Tag not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/tags/{tag_id} [delete]
func (api *APIControllers) WorkspaceTagsDestroy(c fiber.Ctx) error {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the tag from locals
	tagWithAssets, tagOk := c.Locals("tag_id").(*db.TagWithAssets)
	if !tagOk {
		api.Logger.Error("Error getting locals for TagsDestroy")
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Delete the tag using the service
	err = api.Services.DeleteWorkspaceTag(c, user, workspace, tagWithAssets)
	if err != nil {
		api.Logger.Error("Error deleting tag", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Invalidate tags endpoints for this workspace (all users)
	// TODO: We should also invalidate the tag lists for all tagged assets
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/tags", workspace.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "tag_deleted"),
	})
}

// WorkspaceAddTagToEntity godoc
// @Summary Add tag to resource
// @Description Apply a tag to a specific resource (repository, query, workflow, connection, or object)
// @Tags tags
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param tag_id path string true "Tag ID (SQID encoded)"
// @Param entity_type path string true "Resource type (repositories, queries, workflows, connections, objects)"
// @Param entity_id path string true "Resource ID (SQID encoded)"
// @Success 200 {object} irminmodels.IrminAPIResponse "Tag added to resource successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid resource type or ID"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Tag or resource not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/tags/{tag_id}/{entity_type}/{entity_id} [post]
//
//nolint:dupl // This is not a duplicate, it's a different endpoint, which functions in a similar way.
func (api *APIControllers) WorkspaceAddTagToEntity(c fiber.Ctx) error {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the tag from locals
	tagWithAssets, tagOk := c.Locals("tag_id").(*db.TagWithAssets)
	if !tagOk {
		api.Logger.Error("Error getting locals for AddTagToEntity")
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the entity type and ID from the request
	entityType := c.Params("entity_type")
	entityID := c.Params("entity_id")

	// Add the tag to the entity
	err = api.Services.AddOrRemoveTagFromEntity(
		c,
		services.TagEntityOperationAdd,
		user,
		workspace,
		tagWithAssets,
		entityType,
		entityID,
	)
	if err != nil {
		api.Logger.Error("Error adding tag to entity", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Invalidate tags endpoints for this workspace (all users)
	// TODO: We should also invalidate the tag lists for all tagged assets
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/tags", workspace.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "tag_added"),
	})
}

// WorkspaceRemoveTagFromEntity godoc
// @Summary Remove tag from resource
// @Description Remove a tag from a specific resource (repository, query, workflow, connection, or object)
// @Tags tags
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param tag_id path string true "Tag ID (SQID encoded)"
// @Param entity_type path string true "Resource type (repositories, queries, workflows, connections, objects)"
// @Param entity_id path string true "Resource ID (SQID encoded)"
// @Success 200 {object} irminmodels.IrminAPIResponse "Tag removed from resource successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid resource type or ID"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Tag or resource not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/tags/{tag_id}/{entity_type}/{entity_id} [delete]
//
//nolint:dupl // This is not a duplicate, it's a different endpoint, which functions in a similar way.
func (api *APIControllers) WorkspaceRemoveTagFromEntity(c fiber.Ctx) error {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the tag from locals
	tagWithAssets, tagOk := c.Locals("tag_id").(*db.TagWithAssets)
	if !tagOk {
		api.Logger.Error("Error getting locals for RemoveTagFromEntity")
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the entity type and ID from the request
	entityType := c.Params("entity_type")
	entityID := c.Params("entity_id")

	// Remove the tag from the entity
	err = api.Services.AddOrRemoveTagFromEntity(
		c,
		services.TagEntityOperationRemove,
		user,
		workspace,
		tagWithAssets,
		entityType,
		entityID,
	)
	if err != nil {
		api.Logger.Error("Error removing tag from entity", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Invalidate tags endpoints for this workspace (all users)
	// TODO: We should also invalidate the tag lists for all tagged assets
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/tags", workspace.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "tag_removed"),
	})
}
