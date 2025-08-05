package controllers

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/utils"

	irmincore "github.com/IrminData/irmin-sdk-go/core-api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"gorm.io/gorm"

	"github.com/gofiber/fiber/v3"
)

const (
	operationAdd    = "add"
	operationRemove = "remove"
)

// TagsIndex godoc
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
func (api *APIControllers) TagsIndex(c fiber.Ctx) error {
	_, dict, _, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get all tags from the workspace
	tags, err := api.DB.GetTagsByWorkspace(workspace.ID)
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

// TagsStore godoc
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
func (api *APIControllers) TagsStore(c fiber.Ctx) error {
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

	// Validate required fields
	if req.Name == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Create the tag
	tag := &db.Tag{
		Name:        req.Name,
		Color:       req.Color,
		Description: req.Description,
		WorkspaceID: workspace.ID,
	}
	if createErr := api.DB.Create(&tag); createErr.Error != nil {
		api.Logger.Error("Error creating tag", "error", createErr.Error)
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

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeCreate,
		Description: fmt.Sprintf("Tag %s created", tag.Name),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	return api.validateAndWriteResponse(c, fiber.StatusCreated, irminmodels.IrminAPIResponse{
		Data: formattedTag,
	})
}

// TagsShow godoc
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
func (api *APIControllers) TagsShow(c fiber.Ctx) error {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the tag from locals
	tagWithAssets, tagOk := c.Locals("tag").(*db.TagWithAssets)
	if !tagOk {
		api.Logger.Error("Error getting locals for TagsShow")
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Filter the tag with assets based on permissions
	var filteredTagsWithAssets *db.TagWithAssets
	if user.ID == workspace.OwnerID {
		filteredTagsWithAssets = tagWithAssets
	} else {
		filteredTagsWithAssets = api.filterTagWithAssetsBasedOnPermissions(tagWithAssets, user, workspace)
	}

	// Format the tag with assets
	formattedTagWithAssets, err := formatter.FormatTagWithAssetsResponse(
		filteredTagsWithAssets,
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

// filterTagWithAssetsBasedOnPermissions filters the tag with assets based on permissions.
func (api *APIControllers) filterTagWithAssetsBasedOnPermissions(
	tagWithAssets *db.TagWithAssets,
	user *db.User,
	workspace *db.Workspace,
) *db.TagWithAssets {
	// Create a new tag with assets
	newTagWithAssets := &db.TagWithAssets{
		Tag: tagWithAssets.Tag,
		Assets: db.TaggedAssets{
			Queries:           make([]db.StoredQuery, 0),
			Repositories:      make([]db.Repository, 0),
			Workflows:         make([]db.Workflow, 0),
			Connections:       make([]db.Connection, 0),
			RepositoryObjects: make([]db.RepositoryObject, 0),
		},
		Counts: map[string]int{
			"queries":            0,
			"repositories":       0,
			"workflows":          0,
			"connections":        0,
			"repository_objects": 0,
		},
	}

	// Run all filtering operations concurrently
	queriesFuture := utils.Async(func() ([]db.StoredQuery, error) {
		return api.filterTaggedQueries(tagWithAssets.Assets.Queries, user, workspace)
	})

	repositoriesFuture := utils.Async(func() ([]db.Repository, error) {
		return api.filterTaggedRepositories(tagWithAssets.Assets.Repositories, user, workspace)
	})

	workflowsFuture := utils.Async(func() ([]db.Workflow, error) {
		return api.filterTaggedWorkflows(tagWithAssets.Assets.Workflows, user, workspace)
	})

	connectionsFuture := utils.Async(func() ([]db.Connection, error) {
		return api.filterTaggedConnections(tagWithAssets.Assets.Connections, user, workspace)
	})

	repositoryObjectsFuture := utils.Async(func() ([]db.RepositoryObject, error) {
		return api.filterTaggedRepositoryObjects(tagWithAssets.Assets.RepositoryObjects, user, workspace)
	})

	// Wait for all results and update the new tag with assets
	if queries, err := queriesFuture.Await(); err == nil {
		newTagWithAssets.Assets.Queries = queries
		newTagWithAssets.Counts["queries"] = len(queries)
	}

	if repositories, err := repositoriesFuture.Await(); err == nil {
		newTagWithAssets.Assets.Repositories = repositories
		newTagWithAssets.Counts["repositories"] = len(repositories)
	}

	if workflows, err := workflowsFuture.Await(); err == nil {
		newTagWithAssets.Assets.Workflows = workflows
		newTagWithAssets.Counts["workflows"] = len(workflows)
	}

	if connections, err := connectionsFuture.Await(); err == nil {
		newTagWithAssets.Assets.Connections = connections
		newTagWithAssets.Counts["connections"] = len(connections)
	}

	if repositoryObjects, err := repositoryObjectsFuture.Await(); err == nil {
		newTagWithAssets.Assets.RepositoryObjects = repositoryObjects
		newTagWithAssets.Counts["repository_objects"] = len(repositoryObjects)
	}

	return newTagWithAssets
}

// filterTaggedQueries filters queries based on user permissions.
func (api *APIControllers) filterTaggedQueries(
	queries []db.StoredQuery,
	user *db.User,
	workspace *db.Workspace,
) ([]db.StoredQuery, error) {
	filteredQueries := make([]db.StoredQuery, 0)

	for _, query := range queries {
		allowed, err := api.permissionService.IsAllowed(
			user,
			workspace,
			db.PolicyResourceQuery,
			&query.ID,
			db.PolicyActionRead,
		)
		if err != nil {
			api.Logger.Error("Error checking permission for query", "error", err)
			continue
		}
		if allowed {
			filteredQueries = append(filteredQueries, query)
		}
	}

	return filteredQueries, nil
}

// filterTaggedRepositories filters repositories based on user permissions.
func (api *APIControllers) filterTaggedRepositories(
	repositories []db.Repository,
	user *db.User,
	workspace *db.Workspace,
) ([]db.Repository, error) {
	filteredRepositories := make([]db.Repository, 0)

	for _, repository := range repositories {
		allowed, err := api.permissionService.IsAllowed(
			user,
			workspace,
			db.PolicyResourceRepository,
			&repository.ID,
			db.PolicyActionRead,
		)
		if err != nil {
			api.Logger.Error("Error checking permission for repository", "error", err)
			continue
		}
		if allowed {
			filteredRepositories = append(filteredRepositories, repository)
		}
	}

	return filteredRepositories, nil
}

// filterTaggedWorkflows filters workflows based on user permissions.
func (api *APIControllers) filterTaggedWorkflows(
	workflows []db.Workflow,
	user *db.User,
	workspace *db.Workspace,
) ([]db.Workflow, error) {
	filteredWorkflows := make([]db.Workflow, 0)

	for _, workflow := range workflows {
		allowed, err := api.permissionService.IsAllowed(
			user,
			workspace,
			db.PolicyResourceWorkflow,
			&workflow.ID,
			db.PolicyActionRead,
		)
		if err != nil {
			api.Logger.Error("Error checking permission for workflow", "error", err)
			continue
		}
		if allowed {
			filteredWorkflows = append(filteredWorkflows, workflow)
		}
	}

	return filteredWorkflows, nil
}

// filterTaggedConnections filters connections based on user permissions.
func (api *APIControllers) filterTaggedConnections(
	connections []db.Connection,
	user *db.User,
	workspace *db.Workspace,
) ([]db.Connection, error) {
	filteredConnections := make([]db.Connection, 0)

	for _, connection := range connections {
		allowed, err := api.permissionService.IsAllowed(
			user,
			workspace,
			db.PolicyResourceConnection,
			&connection.ID,
			db.PolicyActionRead,
		)
		if err != nil {
			api.Logger.Error("Error checking permission for connection", "error", err)
			continue
		}
		if allowed {
			filteredConnections = append(filteredConnections, connection)
		}
	}

	return filteredConnections, nil
}

// filterTaggedRepositoryObjects filters repository objects based on user permissions.
func (api *APIControllers) filterTaggedRepositoryObjects(
	repositoryObjects []db.RepositoryObject,
	user *db.User,
	workspace *db.Workspace,
) ([]db.RepositoryObject, error) {
	filteredRepositoryObjects := make([]db.RepositoryObject, 0)

	for _, repositoryObject := range repositoryObjects {
		allowed, err := api.permissionService.IsAllowed(
			user,
			workspace,
			db.PolicyResourceRepositoryObject,
			&repositoryObject.RepositoryID,
			db.PolicyActionRead,
		)
		if err != nil {
			api.Logger.Error("Error checking permission for repository object", "error", err)
			continue
		}
		if allowed {
			filteredRepositoryObjects = append(filteredRepositoryObjects, repositoryObject)
		}
	}

	return filteredRepositoryObjects, nil
}

// TagsUpdate godoc
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
func (api *APIControllers) TagsUpdate(c fiber.Ctx) error {
	_, dict, user, _, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the tag from locals
	tagWithAssets, tagOk := c.Locals("tag").(*db.TagWithAssets)
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

	// Update the tag fields
	if req.Name != "" {
		tagWithAssets.Tag.Name = req.Name
	}
	if req.Color != "" {
		tagWithAssets.Tag.Color = req.Color
	}
	if req.Description != "" {
		tagWithAssets.Tag.Description = req.Description
	}

	// Save the updated tag
	if updateErr := api.DB.Save(&tagWithAssets.Tag); updateErr.Error != nil {
		api.Logger.Error("Error updating tag", "error", updateErr.Error)
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

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: formattedTag,
	})
}

// TagsDestroy godoc
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
func (api *APIControllers) TagsDestroy(c fiber.Ctx) error {
	_, dict, user, _, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the tag from locals
	tagWithAssets, tagOk := c.Locals("tag").(*db.TagWithAssets)
	if !tagOk {
		api.Logger.Error("Error getting locals for TagsDestroy")
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Delete the tag
	deleteTagErr := api.DB.Transaction(func(tx *gorm.DB) error {
		return api.DB.DeleteTag(tx, tagWithAssets.Tag.ID)
	})
	if deleteTagErr != nil {
		api.Logger.Error("Error deleting tag", "error", deleteTagErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeDelete,
		Description: fmt.Sprintf("Tag %s deleted", tagWithAssets.Tag.Name),
		UserID:      &user.ID,
	})

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "tag_deleted"),
	})
}

// performEntityOperation handles the actual database operation for a specific entity type.
func (api *APIControllers) performEntityOperation(
	entityType irminmodels.TagEntityType,
	entityID uint,
	tagID uint,
	operation string,
) error {
	switch entityType {
	case irminmodels.TagEntityTypeRepository:
		if operation == operationAdd {
			return api.DB.AddTagToRepository(entityID, tagID)
		}
		return api.DB.RemoveTagFromRepository(entityID, tagID)
	case irminmodels.TagEntityTypeQuery:
		if operation == operationAdd {
			return api.DB.AddTagToQuery(entityID, tagID)
		}
		return api.DB.RemoveTagFromQuery(entityID, tagID)
	case irminmodels.TagEntityTypeWorkflow:
		if operation == operationAdd {
			return api.DB.AddTagToWorkflow(entityID, tagID)
		}
		return api.DB.RemoveTagFromWorkflow(entityID, tagID)
	case irminmodels.TagEntityTypeConnection:
		if operation == operationAdd {
			return api.DB.AddTagToConnection(entityID, tagID)
		}
		return api.DB.RemoveTagFromConnection(entityID, tagID)
	case irminmodels.TagEntityTypeObject:
		if operation == operationAdd {
			return api.DB.AddTagToRepositoryObject(entityID, tagID)
		}
		return api.DB.RemoveTagFromRepositoryObject(entityID, tagID)
	default:
		return fmt.Errorf("invalid entity type: %s", string(entityType))
	}
}

// handleTagEntityOperation is a helper function that handles common logic for adding/removing tags from entities.
func (api *APIControllers) handleTagEntityOperation(c fiber.Ctx, operation string) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	tag, tagOk := c.Locals("tag").(*db.TagWithAssets)

	if !dictOk || !userOk || !tagOk || !workspaceOk {
		api.Logger.Error("Error getting locals for handleTagEntityOperation",
			"dictOk", dictOk,
			"userOk", userOk,
			"tagOk", tagOk,
			"workspaceOk", workspaceOk,
			"operation", operation)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Make sure the tag is from the same workspace
	if tag.Tag.WorkspaceID != workspace.ID {
		return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Get entity type and ID from context
	entityType := c.Params("entity_type")
	entityID := c.Params("entity_id")

	// Map entity type for SQID decoding (URL param "objects" maps to SQID key "repository_objects")
	sqidEntityType := irminmodels.TagEntityType(entityType)
	if entityType == "objects" {
		sqidEntityType = irminmodels.TagEntityTypeObject
	}

	// Decode entity ID
	entityIDUint, err := api.SQIDManager.Decode(string(sqidEntityType), entityID)
	if err != nil {
		api.Logger.Error("Error decoding entity ID", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Perform operation based on entity type
	operationErr := api.performEntityOperation(
		sqidEntityType,
		uint(entityIDUint),
		tag.Tag.ID,
		operation,
	)
	if operationErr != nil {
		api.Logger.Error(
			fmt.Sprintf("Error %sing tag to entity", operation),
			"error",
			operationErr,
		)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	action := "added to"
	if operation == operationRemove {
		action = "removed from"
	}
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeUpdate,
		Description: fmt.Sprintf("Tag %s %s", action, entityType),
		UserID:      &user.ID,
	})

	messageKey := "tag_added"
	if operation == operationRemove {
		messageKey = "tag_removed"
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, messageKey),
	})
}

// AddTagToEntity godoc
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
func (api *APIControllers) AddTagToEntity(c fiber.Ctx) error {
	return api.handleTagEntityOperation(c, operationAdd)
}

// RemoveTagFromEntity godoc
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
func (api *APIControllers) RemoveTagFromEntity(c fiber.Ctx) error {
	return api.handleTagEntityOperation(c, operationRemove)
}
