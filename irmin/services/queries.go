package services

import (
	"context"
	"fmt"
	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/lib"
	"irmin-api/permissions"
	"irmin-api/utils"
	"strconv"
	"strings"
	"time"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"gorm.io/gorm"
)

// getStoredEntity is a generic helper function to get a stored entity (query or script) by SQID.
func getStoredEntity[T any](
	api *APIServices,
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	sqid string,
	sqidType string,
	resource db.PolicyResource,
	entityName string,
	getWorkspaceID func(*T) uint,
) (*T, error) {
	// Decode the entity ID from the sqid
	entityID, decodeErr := api.SQIDManager.Decode(sqidType, sqid)
	if decodeErr != nil {
		api.Logger.ErrorContext(c, "Error decoding sqid", "error", decodeErr)
		return nil, ErrNotFound
	}

	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(user, workspace, resource, nil, db.PolicyActionRead)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			fmt.Sprintf("User is not allowed to get %s", entityName),
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			entityName,
			sqid,
		)
		return nil, ErrAccessDenied
	}

	// Get the entity by ID
	var entity T
	if findErr := api.DB.First(&entity, entityID).Error; findErr != nil {
		api.Logger.ErrorContext(c, fmt.Sprintf("Error fetching %s", entityName), "error", findErr)
		return nil, ErrNotFound
	}

	// Verify the entity belongs to the workspace
	if getWorkspaceID(&entity) != workspace.ID {
		var entityNameCapitalized string
		if len(entityName) > 0 {
			entityNameCapitalized = strings.ToUpper(entityName[:1]) + entityName[1:]
		} else {
			entityNameCapitalized = entityName
		}
		api.Logger.ErrorContext(c, fmt.Sprintf("%s does not belong to workspace", entityNameCapitalized))
		return nil, ErrNotFound
	}

	return &entity, nil
}

func (api *APIServices) GetQuery(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	querySqid string,
) (*db.StoredQuery, error) {
	return getStoredEntity(
		api,
		c,
		user,
		workspace,
		querySqid,
		"queries",
		db.PolicyResourceQuery,
		"query",
		func(q *db.StoredQuery) uint { return q.WorkspaceID },
	)
}

func (api *APIServices) ListWorkspaceQueries(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
) ([]db.StoredQuery, error) {
	// Get all queries in the workspace.
	queries, getQueriesErr := api.DB.GetStoredQueriesByWorkspaceID(workspace.ID)
	if getQueriesErr != nil {
		api.Logger.ErrorContext(c, "Error fetching queries", "error", getQueriesErr)
		return nil, NewInternalErrorf("error fetching queries: %w", getQueriesErr)
	}

	// Filter queries based on user permissions
	filteredQueries, err := permissions.IsAllowedFilter(
		api.PermissionService,
		user,
		workspace,
		db.PolicyResourceQuery,
		db.PolicyActionRead,
		queries,
		func(q db.StoredQuery) uint { return q.ID },
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error filtering queries by permissions", "error", err)
		return nil, NewInternalErrorf("error filtering queries by permissions: %w", err)
	}

	return filteredQueries, nil
}

func (api *APIServices) CreateQuery(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	req irmincore.CreateQueryRequest,
) (*db.StoredQuery, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceQuery,
		nil,
		db.PolicyActionCreate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to create query",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
		)
		return nil, ErrAccessDenied
	}

	// Pick the name to use for the description, defaulting to the current time if not provided
	name := req.Name
	if name == "" {
		name = strconv.FormatInt(time.Now().Unix(), 10)
	}

	var query *db.StoredQuery

	// Use database transaction to ensure atomicity
	transactionErr := api.DB.Transaction(func(tx *gorm.DB) error {
		// Create the stored query in the database
		query = &db.StoredQuery{
			Name:        name,
			Description: req.Description,
			SQL:         req.SQL,
			OwnerID:     user.ID,
			WorkspaceID: workspace.ID,
		}
		if saveErr := tx.Create(query).Error; saveErr != nil {
			api.Logger.ErrorContext(c, "Error creating stored query", "error", saveErr)
			return NewInternalErrorf("error creating stored query: %w", saveErr)
		}

		// Add tags if provided
		if len(req.Tags) > 0 {
			if addTagsErr := api.addQueryTags(tx, query, req.Tags, workspace.ID); addTagsErr != nil {
				api.Logger.ErrorContext(c, "Error adding tags to query", "error", addTagsErr)
				return NewInternalErrorf("error adding tags to query: %w", addTagsErr)
			}
		}

		return nil
	})

	if transactionErr != nil {
		return nil, transactionErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:          db.LogEventTypeCreate,
		Description:   fmt.Sprintf("Query %s created", query.Name),
		UserID:        &user.ID,
		WorkspaceID:   &workspace.ID,
		StoredQueryID: &query.ID,
	})

	// Reload the query with Owner and Tags relationships preloaded
	query, getQueryByIDErr := api.DB.GetStoredQueryByID(query.ID)
	if getQueryByIDErr != nil {
		api.Logger.ErrorContext(c, "Error fetching query", "error", getQueryByIDErr)
		return nil, NewInternalErrorf("error fetching query: %w", getQueryByIDErr)
	}

	return query, nil
}

func (api *APIServices) addQueryTags(
	tx *gorm.DB,
	query *db.StoredQuery,
	tags []string,
	workspaceID uint,
) error {
	if len(tags) > 0 {
		for _, tagSqid := range tags {
			tagID, tagDecodeErr := api.SQIDManager.Decode("tags", tagSqid)
			if tagDecodeErr != nil {
				return tagDecodeErr
			}

			// Verify tag belongs to the workspace
			var tag db.Tag
			if err := tx.First(&tag, uint(tagID)).Error; err != nil {
				return err
			}
			if tag.WorkspaceID != workspaceID {
				return ErrInvalidRequest
			}

			if tagAppendErr := tx.Model(query).Association("Tags").Append(&db.Tag{Model: gorm.Model{ID: uint(tagID)}}); tagAppendErr != nil {
				return tagAppendErr
			}
		}
	}
	return nil
}

func (api *APIServices) UpdateQuery(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	query *db.StoredQuery,
	req irmincore.UpdateQueryRequest,
) (*db.StoredQuery, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceQuery,
		&query.ID,
		db.PolicyActionUpdate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to update query",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"query",
			query.ID,
		)
		return nil, ErrAccessDenied
	}

	// Check if the query exists
	if query == nil {
		return nil, ErrNotFound
	}

	// Update the stored query in the database
	if req.Name != nil && len(*req.Name) > 0 {
		query.Name = *req.Name
	}
	if req.Description != nil {
		query.Description = *req.Description
	}
	if req.SQL != nil && len(*req.SQL) > 0 {
		query.SQL = *req.SQL
	}
	if saveErr := api.DB.Save(&query).Error; saveErr != nil {
		api.Logger.ErrorContext(c, "Error updating stored query", "error", saveErr)
		return nil, saveErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:          db.LogEventTypeInfo,
		Description:   fmt.Sprintf("Query %s updated", query.Name),
		UserID:        &user.ID,
		WorkspaceID:   &workspace.ID,
		StoredQueryID: &query.ID,
	})

	return query, nil
}

// DeleteQuery deletes a query from a workspace.
//
//nolint:dupl // This is not a duplicate, it's a different service, which functions in a similar way to other services.
func (api *APIServices) DeleteQuery(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	query *db.StoredQuery,
) error {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceQuery,
		&query.ID,
		db.PolicyActionDelete,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to delete query",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"query",
			query.ID,
		)
		return ErrAccessDenied
	}

	// Delete the stored query from the database
	deleteStoredQueryErr := api.DB.Transaction(func(tx *gorm.DB) error {
		return api.DB.DeleteStoredQuery(tx, query.ID)
	})
	if deleteStoredQueryErr != nil {
		api.Logger.ErrorContext(c, "Error deleting stored query", "error", deleteStoredQueryErr)
		return NewInternalErrorf("error deleting stored query: %w", deleteStoredQueryErr)
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:          db.LogEventTypeDelete,
		Description:   fmt.Sprintf("Query %s deleted", query.Name),
		UserID:        &user.ID,
		WorkspaceID:   &workspace.ID,
		StoredQueryID: &query.ID,
	})

	return nil
}

func (api *APIServices) TransferQueryOwnership(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	query *db.StoredQuery,
	req irmincore.TransferQueryOwnershipRequest,
) (*db.StoredQuery, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceQuery,
		&query.ID,
		db.PolicyActionUpdate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to transfer query ownership",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"query",
			query.ID,
		)
		return nil, ErrAccessDenied
	}

	// Validate required fields
	if req.NewOwnerID == "" {
		return nil, ErrNewOwnerInvalid
	}

	// Parse the new owner ID from the sqid
	newOwnerID, decodeSqidsErr := api.SQIDManager.Decode("users", req.NewOwnerID)
	if decodeSqidsErr != nil {
		api.Logger.ErrorContext(c, "Error decoding sqid", "error", decodeSqidsErr)
		return nil, ErrNewOwnerInvalid
	}

	// Make sure the new owner is valid and a member of the workspace
	inWorkspace, isUserInWorkspaceErr := api.DB.IsUserInWorkspace(uint(newOwnerID), workspace.ID)
	if isUserInWorkspaceErr != nil {
		api.Logger.ErrorContext(c, "Error checking if user is in workspace", "error", isUserInWorkspaceErr)
		return nil, NewInternalErrorf("error checking if user is in workspace: %w", isUserInWorkspaceErr)
	}
	if !inWorkspace {
		return nil, ErrNewOwnerInvalid
	}

	// Get the new owner's information for the audit log
	newOwner, getNewOwnerErr := api.DB.GetUser(uint(newOwnerID))
	if getNewOwnerErr != nil {
		api.Logger.ErrorContext(c, "Error fetching new owner information", "error", getNewOwnerErr)
		return nil, NewInternalErrorf("error fetching new owner information: %w", getNewOwnerErr)
	}

	// Update the stored query in the database
	query.OwnerID = uint(newOwnerID)
	if saveErr := api.DB.Save(&query).Error; saveErr != nil {
		api.Logger.ErrorContext(c, "Error updating stored query", "error", saveErr)
		return nil, NewInternalErrorf("error updating stored query: %w", saveErr)
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:          db.LogEventTypeInfo,
		Description:   fmt.Sprintf("Query %s ownership transferred to %s", query.Name, newOwner.Email),
		UserID:        &user.ID,
		WorkspaceID:   &query.WorkspaceID,
		StoredQueryID: &query.ID,
	})

	return query, nil
}

func (api *APIServices) ExecuteSQL(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	req irmincore.ExecuteSQLRequest,
	limitResponse bool,
) (*irminmodels.QueryResult, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceQuery,
		nil,
		db.PolicyActionCreate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to execute SQL query",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
		)
		return nil, ErrAccessDenied
	}

	// Initialize Data Engine client
	dataEngine, createDataEngineClientErr := engine.NewClient(c, locale, api.Logger, api.Env, api.DB)
	if createDataEngineClientErr != nil {
		api.Logger.ErrorContext(c, "error creating data engine client", "error", createDataEngineClientErr)
		return nil, NewInternalErrorf("error creating data engine client: %w", createDataEngineClientErr)
	}

	// Set permission checker
	dataEngine.SetPermissionChecker(api.PermissionService)

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeInfo,
		Description: "SQL query execution started",
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	// Execute the SQL
	result := dataEngine.ExecuteQuery(c, user, workspace, req.SQL)

	// Limit response data if requested
	if limitResponse {
		result = api.limitQueryResultSize(result)
	}

	// Check for errors
	if result.HasErrors {
		api.Logger.ErrorContext(c, "Error executing SQL query", "error", result.Logs)
		lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
			Type:        db.LogEventTypeError,
			Description: "SQL query execution failed",
			UserID:      &user.ID,
			WorkspaceID: &workspace.ID,
		})
	} else {
		lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
			Type:        db.LogEventTypeInfo,
			Description: "SQL query execution completed",
			UserID:      &user.ID,
			WorkspaceID: &workspace.ID,
		})
	}

	return result, nil
}

// limitQueryResultSize limits the size of query result data to prevent large responses.
func (api *APIServices) limitQueryResultSize(
	result *irminmodels.QueryResult,
) *irminmodels.QueryResult {
	if result.Data == nil {
		return result
	}

	limitResult := utils.LimitJSONResponseSize(result.Data, utils.DefaultMaxJSONResponseSizeBytes)

	// Always use the limiter's returned data when trimming occurred
	if limitResult.WasTrimmed {
		// Type assert to expected type, or use empty slice if type assertion fails
		if trimmedData, ok := limitResult.Data.([]map[string]any); ok {
			result.Data = trimmedData
		} else {
			// Limiter returned a non-slice (oversized non-array data) - return empty array
			// The error message is already in result.Logs (see below)
			result.Data = []map[string]any{}
		}
	}

	if limitResult.LogMessage != "" {
		if result.Logs == nil {
			result.Logs = []string{}
		}
		result.Logs = append(result.Logs, limitResult.LogMessage)
	}

	return result
}
