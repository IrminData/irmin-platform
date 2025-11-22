package services

import (
	"context"
	"fmt"
	"irmin-api/db"
	"irmin-api/lib"
	"irmin-api/utils"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	"gorm.io/gorm"
)

// GetConnection gets a connection by its SQID.
//
//nolint:dupl // This is not a duplicate, it's a different service, which functions in a similar way to other services.
func (api *APIServices) GetConnection(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	connectionSqid string,
) (*db.Connection, error) {
	// Decode the ID
	connectionID, err := api.SQIDManager.Decode("connections", connectionSqid)
	if err != nil {
		api.Logger.ErrorContext(c, "Error decoding connection SQID", "error", err)
		return nil, err
	}

	// Make sure this is allowed
	resourceID := uint(connectionID)
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceConnection,
		&resourceID,
		db.PolicyActionRead,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, err
	}
	if !isAllowed {
		return nil, ErrAccessDenied
	}

	// Get the connection
	connection, err := api.DB.GetConnectionByID(uint(connectionID))
	if err != nil {
		api.Logger.ErrorContext(c, "Error getting connection", "error", err)
		return nil, err
	}

	return connection, nil
}

// ListConnections lists all connections in a workspace available to the user.
//
//nolint:dupl // This is not a duplicate, it's a different service, which functions in a similar way to other services.
func (api *APIServices) ListConnections(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
) ([]db.Connection, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceConnection,
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
			"User is not allowed to list connections",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
		)
		return nil, ErrAccessDenied
	}

	// Get all connections in the workspace.
	connections, getConnectionsByWorkspaceIDErr := api.DB.GetConnectionsByWorkspaceID(workspace.ID)
	if getConnectionsByWorkspaceIDErr != nil {
		api.Logger.ErrorContext(c, "Error fetching connections", "error", getConnectionsByWorkspaceIDErr)
		return nil, getConnectionsByWorkspaceIDErr
	}

	// Filter connections based on user permissions
	filteredConnections, err := lib.IsAllowedFilter(
		api.PermissionService,
		user,
		workspace,
		db.PolicyResourceConnection,
		db.PolicyActionRead,
		connections,
		func(c db.Connection) uint { return c.ID },
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error filtering connections by permissions", "error", err)
		return nil, err
	}

	return filteredConnections, nil
}

// CreateConnection creates a new connection in a workspace.
//

func (api *APIServices) CreateConnection(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	req irmincore.CreateConnectionRequest,
) (*db.Connection, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceConnection,
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
			"User is not allowed to create connection",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
		)
		return nil, ErrAccessDenied
	}

	// Validate and decode the connector SQID
	connectorID, err := api.SQIDManager.Decode("connectors", req.Connector)
	if err != nil {
		api.Logger.ErrorContext(c, "Error decoding SQID", "sqid", req.Connector, "type", "connectors", "error", err)
		return nil, err
	}

	// Convert any maps to string maps for compatibility with database models
	detailsStr := utils.ConvertToStringMap(req.Details)
	settingsStr := utils.ConvertToStringMap(req.Settings)

	var connection *db.Connection

	// Use database transaction to ensure atomicity
	transactionErr := api.DB.Transaction(func(tx *gorm.DB) error {
		// Create the connection
		connection = &db.Connection{
			Name:          req.Name,
			Description:   req.Description,
			Documentation: req.Documentation,
			Details:       detailsStr,
			Settings:      settingsStr,
			ConnectorID:   uint(connectorID),
			OwnerID:       user.ID,
			WorkspaceID:   workspace.ID,
		}
		if createConnectionErr := tx.Create(connection).Error; createConnectionErr != nil {
			api.Logger.ErrorContext(c, "Error creating connection", "error", createConnectionErr)
			return createConnectionErr
		}

		// Add tags
		if addTagErr := api.addConnectionTags(tx, connection, req.Tags, workspace.ID); addTagErr != nil {
			return addTagErr
		}

		return nil
	})

	if transactionErr != nil {
		return nil, transactionErr
	}

	// Fetch the newly created connection with preloaded associations
	connection, getConnectionByIDErr := api.DB.GetConnectionByID(connection.ID)
	if getConnectionByIDErr != nil {
		api.Logger.ErrorContext(c, "Error fetching connection", "error", getConnectionByIDErr)
		return nil, getConnectionByIDErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeCreate,
		Description:  fmt.Sprintf("Connection %s created", connection.Name),
		UserID:       &user.ID,
		WorkspaceID:  &workspace.ID,
		ConnectionID: &connection.ID,
	})

	return connection, nil
}

func (api *APIServices) UpdateConnection(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	connection *db.Connection,
	req irmincore.UpdateConnectionRequest,
) (*db.Connection, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceConnection,
		&connection.ID,
		db.PolicyActionUpdate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to update connection",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"connection",
			connection.Name,
		)
		return nil, ErrAccessDenied
	}

	// Update the connection fields
	if updateConnectionFieldsErr := api.updateConnectionFields(connection, req); updateConnectionFieldsErr != nil {
		api.Logger.ErrorContext(c, "Error updating connection fields", "error", updateConnectionFieldsErr)
		return nil, updateConnectionFieldsErr
	}

	// Update the connection
	if updateConnectionErr := api.DB.Save(connection).Error; updateConnectionErr != nil {
		api.Logger.ErrorContext(c, "Error updating connection", "error", updateConnectionErr)
		return nil, updateConnectionErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeUpdate,
		Description:  fmt.Sprintf("Connection %s updated", connection.Name),
		UserID:       &user.ID,
		WorkspaceID:  &workspace.ID,
		ConnectionID: &connection.ID,
	})

	return connection, nil
}

// updateConnectionFields updates the connection fields based on the request.
func (api *APIServices) updateConnectionFields(
	connection *db.Connection,
	req irmincore.UpdateConnectionRequest,
) error {
	// Only update fields that were provided
	if req.Name != "" {
		connection.Name = req.Name
	}
	if req.Description != "" {
		connection.Description = req.Description
	}
	if req.Documentation != "" {
		connection.Documentation = req.Documentation
	}
	if len(req.Details) > 0 {
		connection.Details = utils.ConvertToStringMap(req.Details)
	}
	if len(req.Settings) > 0 {
		connection.Settings = utils.ConvertToStringMap(req.Settings)
	}
	if req.Connector != "" {
		connectorID, tagDecodeErr := api.SQIDManager.Decode("connectors", req.Connector)
		if tagDecodeErr != nil {
			return fmt.Errorf("error decoding connector SQID: %w", tagDecodeErr)
		}
		connection.ConnectorID = uint(connectorID)
	}
	return nil
}

// DeleteConnection deletes a connection from a workspace.
//
//nolint:dupl // This is not a duplicate, it's a different service, which functions in a similar way to other services.
func (api *APIServices) DeleteConnection(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	connection *db.Connection,
) error {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceConnection,
		&connection.ID,
		db.PolicyActionDelete,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to delete connection",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"connection",
			connection.Name,
		)
		return ErrAccessDenied
	}

	// TODO: Verify that the connection is not used in any workflows before deletion
	// This should include:
	// - Check if connection is referenced in any active workflows
	// - Check if connection is referenced in any scheduled workflows
	// - Check if connection is referenced in any workflow templates
	// - Optionally provide a force delete option that removes workflow references
	// - Return appropriate error message if connection is in use

	// Delete the connection
	deleteConnectionErr := api.DB.Transaction(func(tx *gorm.DB) error {
		return api.DB.DeleteConnection(tx, connection.ID)
	})
	if deleteConnectionErr != nil {
		api.Logger.ErrorContext(c, "Error deleting connection", "error", deleteConnectionErr)
		return deleteConnectionErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeDelete,
		Description:  fmt.Sprintf("Connection %s deleted", connection.Name),
		UserID:       &user.ID,
		WorkspaceID:  &workspace.ID,
		ConnectionID: &connection.ID,
	})

	return nil
}

// TransferConnectionOwnership transfers the ownership of a connection to a new user.
//

func (api *APIServices) TransferConnectionOwnership(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	connection *db.Connection,
	req irmincore.TransferConnectionOwnershipRequest,
) (*db.Connection, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceConnection,
		&connection.ID,
		db.PolicyActionUpdate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to transfer connection ownership",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"connection",
			connection.Name,
		)
		return nil, ErrAccessDenied
	}

	// Validate and decode the new owner SQID
	newOwnerID, err := api.SQIDManager.Decode("users", req.NewOwnerID)
	if err != nil {
		api.Logger.ErrorContext(c, "Error decoding SQID", "sqid", req.NewOwnerID, "type", "users", "error", err)
		return nil, err
	}

	// Make sure the new owner is valid and a member of the workspace
	inWorkspace, isUserInWorkspaceErr := api.DB.IsUserInWorkspace(uint(newOwnerID), workspace.ID)
	if isUserInWorkspaceErr != nil {
		api.Logger.ErrorContext(c, "Error checking if user is in workspace", "error", isUserInWorkspaceErr)
		return nil, isUserInWorkspaceErr
	}
	if !inWorkspace {
		api.Logger.ErrorContext(c, "New owner is not a member of the workspace")
		return nil, ErrNewOwnerInvalid
	}

	// Get the new owner's information for the audit log
	newOwner, getNewOwnerErr := api.DB.GetUser(uint(newOwnerID))
	if getNewOwnerErr != nil {
		api.Logger.ErrorContext(c, "Error fetching new owner information", "error", getNewOwnerErr)
		return nil, getNewOwnerErr
	}

	// Update the connection
	connection.OwnerID = uint(newOwnerID)
	if updateConnectionErr := api.DB.Save(connection).Error; updateConnectionErr != nil {
		api.Logger.ErrorContext(c, "Error updating connection", "error", updateConnectionErr)
		return nil, updateConnectionErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type: db.LogEventTypeUpdate,
		Description: fmt.Sprintf(
			"Connection %s ownership transferred to %s",
			connection.Name,
			newOwner.Email,
		),
		UserID:       &user.ID,
		WorkspaceID:  &workspace.ID,
		ConnectionID: &connection.ID,
	})

	return connection, nil
}

func (api *APIServices) addConnectionTags(
	tx *gorm.DB,
	connection *db.Connection,
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
			if tagErr := tx.First(&tag, uint(tagID)).Error; tagErr != nil {
				return tagErr
			}
			if tag.WorkspaceID != workspaceID {
				return ErrInvalidRequest
			}

			// Add tag using the transaction
			if tagAddErr := tx.Model(connection).Association("Tags").Append(&db.Tag{Model: gorm.Model{ID: uint(tagID)}}); tagAddErr != nil {
				return tagAddErr
			}
		}
	}
	return nil
}
