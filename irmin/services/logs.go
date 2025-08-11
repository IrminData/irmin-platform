package services

import (
	"context"
	"irmin-api/db"
)

// GetLogEventByID retrieves a log event by its ID and validates access permissions.
func (api *APIServices) GetLogEventByID(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	logEventSqid string,
) (*db.LogEvent, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceAuditLog,
		nil,
		db.PolicyActionRead,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to get log event",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"logEvent",
			logEventSqid,
		)
		return nil, ErrAccessDenied
	}

	// Decode the log event SQID
	logEventID, err := api.SQIDManager.Decode("logs", logEventSqid)
	if err != nil {
		api.Logger.ErrorContext(c, "Error decoding log event sqid", "error", err)
		return nil, err
	}

	// Get the log event by ID
	var logEvent db.LogEvent
	if dbErr := api.DB.Preload("User").
		Preload("Workspace").
		Preload("Repository").
		Preload("Workflow").
		Preload("WorkflowRun").
		Preload("Connection").
		Preload("Policy").
		Preload("StoredQuery").
		Preload("RepositoryObject.Repository").
		First(&logEvent, uint(logEventID)).Error; dbErr != nil {
		api.Logger.ErrorContext(c, "Error fetching log event", "error", dbErr)
		return nil, ErrNotFound
	}

	// Check if the log event exists and user has access to the workspace
	if logEvent.WorkspaceID == nil {
		return nil, ErrNotFound
	}

	// Verify user has access to the workspace containing this log event
	hasAccess := false
	for _, workspaceUser := range user.Workspaces {
		if workspaceUser.WorkspaceID == *logEvent.WorkspaceID {
			hasAccess = true
			break
		}
	}
	if !hasAccess {
		return nil, ErrNotFound
	}

	return &logEvent, nil
}

// ListLogEventsForWorkspace retrieves log events for a workspace with permissions filtering.
func (api *APIServices) ListLogEventsForWorkspace(
	c context.Context,
	workspace *db.Workspace,
	user *db.User,
	searchTerm string,
	limit, offset int,
) ([]db.LogEvent, int64, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceAuditLog,
		nil,
		db.PolicyActionRead,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, 0, err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to list log events for workspace",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
		)
		return nil, 0, ErrAccessDenied
	}

	// Get log events from the database
	logEvents, total, err := api.DB.GetLogEventsForWorkspace(workspace.ID, searchTerm, limit, offset)
	if err != nil {
		api.Logger.ErrorContext(c, "Error fetching log events", "error", err)
		return nil, 0, err
	}

	return logEvents, total, nil
}

// ListLogEventsForWorkspaceAndAsset retrieves log events for a specific asset within a workspace.
func (api *APIServices) ListLogEventsForWorkspaceAndAsset(
	c context.Context,
	workspace *db.Workspace,
	user *db.User,
	assetType string,
	assetID uint,
	searchTerm string,
	limit, offset int,
) ([]db.LogEvent, int64, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceAuditLog,
		nil,
		db.PolicyActionRead,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, 0, err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to list log events for workspace and asset",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"assetType",
			assetType,
			"assetID",
			assetID,
		)
		return nil, 0, ErrAccessDenied
	}

	// Get log events from the database
	logEvents, total, err := api.DB.GetLogEventsByWorkspaceAndAsset(
		workspace.ID,
		assetType,
		assetID,
		searchTerm,
		limit,
		offset,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error fetching log events for asset", "error", err)
		return nil, 0, err
	}

	return logEvents, total, nil
}
