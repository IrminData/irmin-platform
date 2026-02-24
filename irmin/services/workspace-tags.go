package services

import (
	"context"
	"fmt"
	"irmin-api/db"
	"irmin-api/lib"
	"irmin-api/permissions"
	"irmin-api/utils"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"gorm.io/gorm"
)

type TagEntityOperation string

const (
	TagEntityOperationAdd    TagEntityOperation = "add"
	TagEntityOperationRemove TagEntityOperation = "remove"
)

func (api *APIServices) GetWorkspaceTag(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	tagID uint,
) (*db.TagWithAssets, error) {
	// Get the tag from the database
	tagWithAssets, err := api.DB.GetTagWithAssets(tagID)
	if err != nil {
		api.Logger.ErrorContext(c, "Error getting tag with assets", "error", err)
		return nil, NewInternalErrorf("error getting tag with assets: %w", err)
	}

	// Filter the tag with assets based on permissions
	var filteredTagsWithAssets *db.TagWithAssets
	if user.ID == workspace.OwnerID {
		filteredTagsWithAssets = tagWithAssets
	} else {
		filteredTagsWithAssets = api.filterTagWithAssetsBasedOnPermissions(c, tagWithAssets, user, workspace)
	}

	return filteredTagsWithAssets, nil
}

// filterTagWithAssetsBasedOnPermissions filters the tag with assets based on permissions.
func (api *APIServices) filterTagWithAssetsBasedOnPermissions(
	c context.Context,
	tagWithAssets *db.TagWithAssets,
	user *db.User,
	workspace *db.Workspace,
) *db.TagWithAssets {
	// Create a new tag with assets
	newTagWithAssets := &db.TagWithAssets{
		Tag: tagWithAssets.Tag,
		Assets: db.TaggedAssets{
			Queries:           make([]db.StoredQuery, 0),
			Scripts:           make([]db.StoredScript, 0),
			Repositories:      make([]db.Repository, 0),
			Workflows:         make([]db.Workflow, 0),
			Connections:       make([]db.Connection, 0),
			RepositoryObjects: make([]db.RepositoryObject, 0),
		},
		Counts: map[string]int{
			"queries":            0,
			"scripts":            0,
			"repositories":       0,
			"workflows":          0,
			"connections":        0,
			"repository_objects": 0,
		},
	}

	// Run all filtering operations concurrently
	queriesFuture := utils.Async(func() ([]db.StoredQuery, error) {
		return api.filterTaggedQueries(c, tagWithAssets.Assets.Queries, user, workspace)
	})

	scriptsFuture := utils.Async(func() ([]db.StoredScript, error) {
		return api.filterTaggedScripts(c, tagWithAssets.Assets.Scripts, user, workspace)
	})

	repositoriesFuture := utils.Async(func() ([]db.Repository, error) {
		return api.filterTaggedRepositories(c, tagWithAssets.Assets.Repositories, user, workspace)
	})

	workflowsFuture := utils.Async(func() ([]db.Workflow, error) {
		return api.filterTaggedWorkflows(c, tagWithAssets.Assets.Workflows, user, workspace)
	})

	connectionsFuture := utils.Async(func() ([]db.Connection, error) {
		return api.filterTaggedConnections(c, tagWithAssets.Assets.Connections, user, workspace)
	})

	repositoryObjectsFuture := utils.Async(func() ([]db.RepositoryObject, error) {
		return api.filterTaggedRepositoryObjects(c, tagWithAssets.Assets.RepositoryObjects, user, workspace)
	})

	// Wait for all results and update the new tag with assets
	if queries, err := queriesFuture.Await(); err == nil {
		newTagWithAssets.Assets.Queries = queries
		newTagWithAssets.Counts["queries"] = len(queries)
	}

	if scripts, err := scriptsFuture.Await(); err == nil {
		newTagWithAssets.Assets.Scripts = scripts
		newTagWithAssets.Counts["scripts"] = len(scripts)
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
func (api *APIServices) filterTaggedQueries(
	c context.Context,
	queries []db.StoredQuery,
	user *db.User,
	workspace *db.Workspace,
) ([]db.StoredQuery, error) {
	filteredQueries := make([]db.StoredQuery, 0)

	for _, query := range queries {
		allowed, err := api.PermissionService.IsAllowed(
			user,
			workspace,
			db.PolicyResourceQuery,
			&query.ID,
			db.PolicyActionRead,
		)
		if err != nil {
			api.Logger.ErrorContext(c, "Error checking permission for query", "error", err)
			continue
		}
		if allowed {
			filteredQueries = append(filteredQueries, query)
		}
	}

	return filteredQueries, nil
}

// filterTaggedScripts filters scripts based on user permissions.
func (api *APIServices) filterTaggedScripts(
	c context.Context,
	scripts []db.StoredScript,
	user *db.User,
	workspace *db.Workspace,
) ([]db.StoredScript, error) {
	filteredScripts := make([]db.StoredScript, 0)

	for _, script := range scripts {
		allowed, err := api.PermissionService.IsAllowed(
			user,
			workspace,
			db.PolicyResourceScript,
			&script.ID,
			db.PolicyActionRead,
		)
		if err != nil {
			api.Logger.ErrorContext(c, "Error checking permission for script", "error", err)
			continue
		}
		if allowed {
			filteredScripts = append(filteredScripts, script)
		}
	}

	return filteredScripts, nil
}

// filterTaggedRepositories filters repositories based on user permissions.
func (api *APIServices) filterTaggedRepositories(
	c context.Context,
	repositories []db.Repository,
	user *db.User,
	workspace *db.Workspace,
) ([]db.Repository, error) {
	filteredRepositories := make([]db.Repository, 0)

	for _, repository := range repositories {
		allowed, err := api.PermissionService.IsAllowed(
			user,
			workspace,
			db.PolicyResourceRepository,
			&repository.ID,
			db.PolicyActionRead,
		)
		if err != nil {
			api.Logger.ErrorContext(c, "Error checking permission for repository", "error", err)
			continue
		}
		if allowed {
			filteredRepositories = append(filteredRepositories, repository)
		}
	}

	return filteredRepositories, nil
}

// filterTaggedWorkflows filters workflows based on user permissions.
func (api *APIServices) filterTaggedWorkflows(
	c context.Context,
	workflows []db.Workflow,
	user *db.User,
	workspace *db.Workspace,
) ([]db.Workflow, error) {
	filteredWorkflows := make([]db.Workflow, 0)

	for _, workflow := range workflows {
		allowed, err := api.PermissionService.IsAllowed(
			user,
			workspace,
			db.PolicyResourceWorkflow,
			&workflow.ID,
			db.PolicyActionRead,
		)
		if err != nil {
			api.Logger.ErrorContext(c, "Error checking permission for workflow", "error", err)
			continue
		}
		if allowed {
			filteredWorkflows = append(filteredWorkflows, workflow)
		}
	}

	return filteredWorkflows, nil
}

// filterTaggedConnections filters connections based on user permissions.
func (api *APIServices) filterTaggedConnections(
	c context.Context,
	connections []db.Connection,
	user *db.User,
	workspace *db.Workspace,
) ([]db.Connection, error) {
	filteredConnections := make([]db.Connection, 0)

	for _, connection := range connections {
		allowed, err := api.PermissionService.IsAllowed(
			user,
			workspace,
			db.PolicyResourceConnection,
			&connection.ID,
			db.PolicyActionRead,
		)
		if err != nil {
			api.Logger.ErrorContext(c, "Error checking permission for connection", "error", err)
			continue
		}
		if allowed {
			filteredConnections = append(filteredConnections, connection)
		}
	}

	return filteredConnections, nil
}

// filterTaggedRepositoryObjects filters repository objects based on user permissions.
func (api *APIServices) filterTaggedRepositoryObjects(
	c context.Context,
	repositoryObjects []db.RepositoryObject,
	user *db.User,
	workspace *db.Workspace,
) ([]db.RepositoryObject, error) {
	filteredRepositoryObjects := make([]db.RepositoryObject, 0)

	for _, repositoryObject := range repositoryObjects {
		allowed, err := api.PermissionService.IsAllowed(
			user,
			workspace,
			db.PolicyResourceRepositoryObject,
			&repositoryObject.RepositoryID,
			db.PolicyActionRead,
		)
		if err != nil {
			api.Logger.ErrorContext(c, "Error checking permission for repository object", "error", err)
			continue
		}
		if allowed {
			filteredRepositoryObjects = append(filteredRepositoryObjects, repositoryObject)
		}
	}

	return filteredRepositoryObjects, nil
}

func (api *APIServices) ListWorkspaceTags(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
) ([]db.Tag, error) {
	// Get all tags from the workspace
	tags, err := api.DB.GetTagsByWorkspace(workspace.ID)
	if err != nil {
		api.Logger.ErrorContext(c, "Error retrieving tags", "error", err, "workspace_id", workspace.ID)
		return nil, NewInternalErrorf("error retrieving tags: %w", err)
	}

	// Filter tags based on user permissions
	filteredTags, err := permissions.IsAllowedFilter(
		api.PermissionService,
		user,
		workspace,
		db.PolicyResourceWorkspaceTag,
		db.PolicyActionRead,
		tags,
		func(t db.Tag) uint { return t.ID },
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error filtering workspace tags by permissions", "error", err)
		return nil, NewInternalErrorf("error filtering workspace tags by permissions: %w", err)
	}

	return filteredTags, nil
}

func (api *APIServices) CreateWorkspaceTag(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	req irmincore.CreateTagRequest,
) (*db.Tag, error) {
	// Validate required fields
	if req.Name == "" {
		return nil, ErrTagNameRequired
	}

	// Create the tag
	tag := &db.Tag{
		Name:        req.Name,
		Description: req.Description,
		Color:       req.Color,
		WorkspaceID: workspace.ID,
	}

	if err := api.DB.Create(tag).Error; err != nil {
		api.Logger.ErrorContext(c, "Error creating tag", "error", err)
		return nil, NewInternalErrorf("error creating tag: %w", err)
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeCreate,
		Description: fmt.Sprintf("Tag %s created", tag.Name),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	return tag, nil
}

func (api *APIServices) GetWorkspaceTagWithAssets(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	tag *db.Tag,
) (*db.Tag, error) {
	// Make sure the user has permissions to view the tag
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceWorkspaceTag,
		&tag.ID,
		db.PolicyActionRead,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to get workspace tag",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"tag",
			tag.Name,
		)
		return nil, ErrAccessDenied
	}

	// Get the tag with all its associations (simplified - using regular GetTagByID)
	tagWithAssets, err := api.DB.GetTagByID(tag.ID)
	if err != nil {
		api.Logger.ErrorContext(c, "Error getting tag with assets", "error", err, "tag_id", tag.ID)
		return nil, NewInternalErrorf("error getting tag with assets: %w", err)
	}

	// TODO:  Filter assets based on user permissions

	return tagWithAssets, nil
}

func (api *APIServices) UpdateWorkspaceTag(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	tagWithAssets *db.TagWithAssets,
	req irmincore.UpdateTagRequest,
) (*db.TagWithAssets, error) {
	// Update the tag fields
	applyOptionalField(&tagWithAssets.Tag.Name, req.Name)
	applyNullableField(&tagWithAssets.Tag.Description, req.Description)
	applyNullableField(&tagWithAssets.Tag.Color, req.Color)

	// Save the updated tag
	if err := api.DB.Save(&tagWithAssets.Tag).Error; err != nil {
		api.Logger.ErrorContext(c, "Error updating tag", "error", err, "tag_id", tagWithAssets.Tag.ID)
		return nil, NewInternalErrorf("error updating tag: %w", err)
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeUpdate,
		Description: fmt.Sprintf("Tag %s updated", tagWithAssets.Tag.Name),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	return tagWithAssets, nil
}

func (api *APIServices) DeleteWorkspaceTag(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	tagWithAssets *db.TagWithAssets,
) error {
	// Use database transaction to ensure atomicity
	transactionErr := api.DB.Transaction(func(tx *gorm.DB) error {
		// Remove all query associations
		if err := tx.Delete(&db.QueryTag{}, "tag_id = ?", tagWithAssets.Tag.ID).Error; err != nil {
			api.Logger.ErrorContext(
				c,
				"Error removing query associations",
				"error",
				err,
				"tag_id",
				tagWithAssets.Tag.ID,
			)
			return NewInternalErrorf("error removing query associations: %w", err)
		}

		// Remove all repository associations
		if err := tx.Delete(&db.RepositoryTag{}, "tag_id = ?", tagWithAssets.Tag.ID).Error; err != nil {
			api.Logger.ErrorContext(
				c,
				"Error removing repository associations",
				"error",
				err,
				"tag_id",
				tagWithAssets.Tag.ID,
			)
			return NewInternalErrorf("error removing repository associations: %w", err)
		}

		// Remove all workflow associations
		if err := tx.Delete(&db.WorkflowTag{}, "tag_id = ?", tagWithAssets.Tag.ID).Error; err != nil {
			api.Logger.ErrorContext(
				c,
				"Error removing workflow associations",
				"error",
				err,
				"tag_id",
				tagWithAssets.Tag.ID,
			)
			return NewInternalErrorf("error removing workflow associations: %w", err)
		}

		// Remove all connection associations
		if err := tx.Delete(&db.ConnectionTag{}, "tag_id = ?", tagWithAssets.Tag.ID).Error; err != nil {
			api.Logger.ErrorContext(
				c,
				"Error removing connection associations",
				"error",
				err,
				"tag_id",
				tagWithAssets.Tag.ID,
			)
			return NewInternalErrorf("error removing connection associations: %w", err)
		}

		// Remove all repository object associations
		if err := tx.Delete(&db.RepositoryObjectTag{}, "tag_id = ?", tagWithAssets.Tag.ID).Error; err != nil {
			api.Logger.ErrorContext(
				c,
				"Error removing repository object associations",
				"error",
				err,
				"tag_id",
				tagWithAssets.Tag.ID,
			)
			return NewInternalErrorf("error removing repository object associations: %w", err)
		}

		// Delete the tag
		if err := tx.Delete(&tagWithAssets.Tag).Error; err != nil {
			api.Logger.ErrorContext(c, "Error deleting tag", "error", err, "tag_id", tagWithAssets.Tag.ID)
			return NewInternalErrorf("error deleting tag: %w", err)
		}

		return nil
	})

	if transactionErr != nil {
		return NewInternalErrorf("error in database transaction: %w", transactionErr)
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeDelete,
		Description: fmt.Sprintf("Tag %s deleted", tagWithAssets.Tag.Name),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	return nil
}

func (api *APIServices) AddTagToEntity(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	tag *db.Tag,
	entityType string,
	entityID uint,
) error {
	// Add the tag to the entity (simplified - would need actual implementation)
	// TODO: Implement AddTagToEntity or equivalent logic
	api.Logger.InfoContext(
		c,
		"Adding tag to entity",
		"tag_id",
		tag.ID,
		"entity_type",
		entityType,
		"entity_id",
		entityID,
	)

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeUpdate,
		Description: fmt.Sprintf("Tag %s added to %s", tag.Name, entityType),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	return nil
}

func (api *APIServices) RemoveTagFromEntity(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	tag *db.Tag,
	entityType string,
	entityID uint,
) error {
	// Remove the tag from the entity (simplified - would need actual implementation)
	// TODO: Implement RemoveTagFromEntity or equivalent logic
	api.Logger.InfoContext(
		c,
		"Removing tag from entity",
		"tag_id",
		tag.ID,
		"entity_type",
		entityType,
		"entity_id",
		entityID,
	)

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeUpdate,
		Description: fmt.Sprintf("Tag %s removed from %s", tag.Name, entityType),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	return nil
}

// performEntityOperation handles the actual database operation for a specific entity type.
func (api *APIServices) performEntityOperation(
	entityType irminmodels.TagEntityType,
	entityID uint,
	tagID uint,
	operation TagEntityOperation,
) error {
	switch entityType {
	case irminmodels.TagEntityTypeRepository:
		if operation == TagEntityOperationAdd {
			return api.DB.AddTagToRepository(entityID, tagID)
		}
		return api.DB.RemoveTagFromRepository(entityID, tagID)
	case irminmodels.TagEntityTypeQuery:
		if operation == TagEntityOperationAdd {
			return api.DB.AddTagToQuery(entityID, tagID)
		}
		return api.DB.RemoveTagFromQuery(entityID, tagID)
	case irminmodels.TagEntityTypeScript:
		if operation == TagEntityOperationAdd {
			return api.DB.AddTagToScript(entityID, tagID)
		}
		return api.DB.RemoveTagFromScript(entityID, tagID)
	case irminmodels.TagEntityTypeWorkflow:
		if operation == TagEntityOperationAdd {
			return api.DB.AddTagToWorkflow(entityID, tagID)
		}
		return api.DB.RemoveTagFromWorkflow(entityID, tagID)
	case irminmodels.TagEntityTypeConnection:
		if operation == TagEntityOperationAdd {
			return api.DB.AddTagToConnection(entityID, tagID)
		}
		return api.DB.RemoveTagFromConnection(entityID, tagID)
	case irminmodels.TagEntityTypeObject:
		if operation == TagEntityOperationAdd {
			return api.DB.AddTagToRepositoryObject(entityID, tagID)
		}
		return api.DB.RemoveTagFromRepositoryObject(entityID, tagID)
	default:
		return fmt.Errorf("invalid entity type: %s", string(entityType))
	}
}

// NormalizeEntityType normalizes the entity type string to a valid TagEntityType.
func (api *APIServices) NormalizeEntityType(entityType string) irminmodels.TagEntityType {
	switch entityType {
	case "repository", "repositories":
		return irminmodels.TagEntityTypeRepository
	case "query", "queries":
		return irminmodels.TagEntityTypeQuery
	case "script", "scripts":
		return irminmodels.TagEntityTypeScript
	case "workflow", "workflows":
		return irminmodels.TagEntityTypeWorkflow
	case "connection", "connections":
		return irminmodels.TagEntityTypeConnection
	case "object", "objects", "repository_objects":
		return irminmodels.TagEntityTypeObject
	default:
		return irminmodels.TagEntityType(entityType)
	}
}

// AddOrRemoveTagFromEntity is a helper function that handles common logic for adding/removing tags from entities.
func (api *APIServices) AddOrRemoveTagFromEntity(
	c context.Context,
	operation TagEntityOperation,
	user *db.User,
	workspace *db.Workspace,
	tag *db.TagWithAssets,
	entityType string,
	entityID string,
) error {
	// Make sure the tag is from the same workspace
	if tag.Tag.WorkspaceID != workspace.ID {
		return ErrInvalidRequest
	}

	// Normalize entity type
	sqidEntityType := api.NormalizeEntityType(entityType)

	// Decode entity ID
	entityIDUint, err := api.SQIDManager.Decode(string(sqidEntityType), entityID)
	if err != nil {
		api.Logger.ErrorContext(c, "Error decoding entity ID", "error", err)
		return ErrInvalidRequest
	}

	// Perform operation based on entity type
	operationErr := api.performEntityOperation(
		sqidEntityType,
		uint(entityIDUint),
		tag.Tag.ID,
		operation,
	)
	if operationErr != nil {
		api.Logger.ErrorContext(c, fmt.Sprintf("Error %sing tag to entity", operation), "error", operationErr)
		return operationErr
	}

	// Log the event
	action := "added to"
	if operation == TagEntityOperationRemove {
		action = "removed from"
	}
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeUpdate,
		Description: fmt.Sprintf("Tag %s %s", action, entityType),
		UserID:      &user.ID,
	})

	return nil
}
