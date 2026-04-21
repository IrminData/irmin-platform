package services

import (
	"context"
	"fmt"
	connectorsclient "irmin-api/connectors-client"
	"irmin-api/db"
	"irmin-api/lib"
	"irmin-api/permissions"
	"irmin-api/utils"
	"maps"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"gorm.io/gorm"
)

const secretPlaceholder = "SECRET"

// GetConnection gets a connection by its SQID.
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
		return nil, NewInternalErrorf("error decoding connection SQID: %w", err)
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
		return nil, NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		return nil, ErrAccessDenied
	}

	// Get the connection
	connection, err := api.DB.GetConnectionByID(uint(connectionID))
	if err != nil {
		api.Logger.ErrorContext(c, "Error getting connection", "error", err)
		return nil, NewInternalErrorf("error getting connection: %w", err)
	}

	// Mask secrets
	api.MaskConnectionSecrets(c, connection)

	return connection, nil
}

// ListConnections lists all connections in a workspace available to the user.
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
		return nil, NewInternalErrorf("error checking permissions: %w", err)
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
		return nil, NewInternalErrorf("error fetching connections: %w", getConnectionsByWorkspaceIDErr)
	}

	// Filter connections based on user permissions
	filteredConnections, err := permissions.IsAllowedFilter(
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
		return nil, NewInternalErrorf("error filtering connections by permissions: %w", err)
	}

	// Mask secrets
	connectionsPtrs := make([]*db.Connection, len(filteredConnections))
	for i := range filteredConnections {
		connectionsPtrs[i] = &filteredConnections[i]
	}
	api.MaskConnectionSecrets(c, connectionsPtrs...)

	return filteredConnections, nil
}

// CreateConnection creates a new connection in a workspace.
func (api *APIServices) CreateConnection(
	c context.Context,
	locale string,
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
		return nil, NewInternalErrorf("error checking permissions: %w", err)
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
		return nil, NewInternalErrorf("error decoding connector SQID: %w", err)
	}

	// Convert any maps to string maps for compatibility with database models
	detailsStr := utils.ConvertToStringMap(req.Details)
	settingsStr := utils.ConvertToStringMap(req.Settings)

	// Get the connector information
	connector, err := api.DB.GetConnector(uint(connectorID))
	if err != nil {
		api.Logger.ErrorContext(c, "Error getting connector", "error", err)
		return nil, NewInternalErrorf("error getting connector: %w", err)
	}

	// Create a connector client scoped to the user's locale for localized validation errors
	client := connectorsclient.NewClient(connector.APIBaseURL, connector.SystemToken, locale)

	// Validate the connection using the provided configuration
	validationResult, err := client.ValidateConfigFields(c, detailsStr, settingsStr)
	if err != nil {
		api.Logger.ErrorContext(c, "Error validating connection configuration", "error", err)
		return nil, NewInternalErrorf("error validating connection configuration: %w", err)
	}
	if !validationResult.OK {
		return nil, fmt.Errorf("configuration validation failed: %v", validationResult.Errors)
	}

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
			return NewInternalErrorf("error creating connection: %w", createConnectionErr)
		}

		// Add tags
		if addTagErr := api.addConnectionTags(tx, connection, req.Tags, workspace.ID); addTagErr != nil {
			return NewInternalErrorf("error adding connection tags: %w", addTagErr)
		}

		return nil
	})

	if transactionErr != nil {
		return nil, NewInternalErrorf("error in database transaction: %w", transactionErr)
	}

	// Fetch the newly created connection with preloaded associations
	connection, getConnectionByIDErr := api.DB.GetConnectionByID(connection.ID)
	if getConnectionByIDErr != nil {
		api.Logger.ErrorContext(c, "Error fetching connection", "error", getConnectionByIDErr)
		return nil, NewInternalErrorf("error fetching connection: %w", getConnectionByIDErr)
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeCreate,
		Description:  fmt.Sprintf("Connection %s created", connection.Name),
		UserID:       &user.ID,
		WorkspaceID:  &workspace.ID,
		ConnectionID: &connection.ID,
	})

	// Mask secrets
	api.MaskConnectionSecrets(c, connection)

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
		return nil, NewInternalErrorf("error checking permissions: %w", err)
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

	// Only update fields that were provided
	applyOptionalField(&connection.Name, req.Name)
	applyNullableField(&connection.Description, req.Description)
	applyNullableField(&connection.Documentation, req.Documentation)

	// We ignore updates to the connector ID.
	// The connection configuration fields are updated via the configuration endpoint.

	// Update the connection
	if updateConnectionErr := api.DB.Save(connection).Error; updateConnectionErr != nil {
		api.Logger.ErrorContext(c, "Error updating connection", "error", updateConnectionErr)
		return nil, NewInternalErrorf("error updating connection: %w", updateConnectionErr)
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeUpdate,
		Description:  fmt.Sprintf("Connection %s updated", connection.Name),
		UserID:       &user.ID,
		WorkspaceID:  &workspace.ID,
		ConnectionID: &connection.ID,
	})

	// Refresh the connection to ensure the new connector is preloaded
	// This is crucial for maskConnectionSecrets to use the correct schema
	refreshedConnection, refreshErr := api.DB.GetConnectionByID(connection.ID)
	if refreshErr != nil {
		api.Logger.ErrorContext(c, "Error refreshing connection", "error", refreshErr)
		return nil, NewInternalErrorf("error refreshing connection: %w", refreshErr)
	}
	connection = refreshedConnection

	// Mask secrets
	api.MaskConnectionSecrets(c, connection)

	return connection, nil
}

// UpdateConnectionConfiguration updates the configuration of a connection.
func (api *APIServices) UpdateConnectionConfiguration(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	connection *db.Connection,
	req irmincore.UpdateConnectionConfigurationRequest,
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
		return nil, NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to update connection configuration",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"connection",
			connection.Name,
		)
		return nil, ErrAccessDenied
	}

	// Fetch the connection with unmasked secrets from the database
	fullConnection, err := api.DB.GetConnectionByID(connection.ID)
	if err != nil {
		api.Logger.ErrorContext(c, "Error getting connection", "error", err)
		return nil, err
	}

	// Merge secrets
	newDetails := api.processSecretUpdates(fullConnection.Details, req.Details)
	newSettings := api.processSecretUpdates(fullConnection.Settings, req.Settings)

	// Get the connector information
	connector, err := api.DB.GetConnector(fullConnection.ConnectorID)
	if err != nil {
		api.Logger.ErrorContext(c, "Error getting connector", "error", err)
		return nil, err
	}

	// Create a connector client scoped to the user's locale for localized validation errors.
	// Stamp the connection ID on outbound calls so OAuth-backed connectors can fetch
	// the right access token from Core during validation that hits vendor APIs.
	client := connectorsclient.NewClient(connector.APIBaseURL, connector.SystemToken, locale).
		WithConnectionID(fullConnection.ID)

	// Validate the connection using the new configuration
	validationResult, err := client.ValidateConfigFields(c, newDetails, newSettings)
	if err != nil {
		api.Logger.ErrorContext(c, "Error validating connection configuration", "error", err)
		return nil, err
	}
	if !validationResult.OK {
		return nil, fmt.Errorf("configuration validation failed: %v", validationResult.Errors)
	}

	// Update the connection
	fullConnection.Details = newDetails
	fullConnection.Settings = newSettings
	if updateConnectionErr := api.DB.Save(fullConnection).Error; updateConnectionErr != nil {
		api.Logger.ErrorContext(c, "Error updating connection", "error", updateConnectionErr)
		return nil, updateConnectionErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeUpdate,
		Description:  fmt.Sprintf("Connection %s configuration updated", connection.Name),
		UserID:       &user.ID,
		WorkspaceID:  &workspace.ID,
		ConnectionID: &connection.ID,
	})

	// Refresh the connection to ensure the new connector is preloaded
	refreshedConnection, refreshErr := api.DB.GetConnectionByID(connection.ID)
	if refreshErr != nil {
		api.Logger.ErrorContext(c, "Error refreshing connection", "error", refreshErr)
		return nil, NewInternalErrorf("error refreshing connection: %w", refreshErr)
	}
	connection = refreshedConnection

	// Mask secrets
	api.MaskConnectionSecrets(c, connection)

	return connection, nil
}

func (api *APIServices) processSecretUpdates(current map[string]string, updates map[string]any) map[string]string {
	// Start with a copy of current to preserve existing fields (merge strategy)
	newValues := make(map[string]string)
	maps.Copy(newValues, current)

	updatesMap := utils.ConvertToStringMap(updates)
	for k, v := range updatesMap {
		if v == secretPlaceholder {
			// If the value is the secret placeholder, we want to keep the existing value.
			// Since newValues is initialized with current values, we just ensure we don't overwrite it if it exists.
			// If it doesn't exist in current, we ignore the update (we don't want to save "SECRET").
			continue
		}
		// Otherwise update the value
		newValues[k] = v
	}
	return newValues
}

// DeleteConnection deletes a connection from a workspace.
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
		return NewInternalErrorf("error checking permissions: %w", err)
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

	// Unregister all subscriptions from the connector before database deletion
	// This prevents orphaned subscriptions on the connector side
	subscriptions, subErr := api.DB.GetConnectionSubscriptionsByConnectionID(connection.ID)
	if subErr != nil {
		api.Logger.ErrorContext(c, "Error fetching subscriptions for cleanup", "error", subErr)
		// Continue with deletion even if we can't fetch subscriptions
	} else {
		subscriptionService := NewConnectionSubscriptionService(api.DB, api.Env.URL)
		for _, sub := range subscriptions {
			if sub.ConnectorSubscriptionID != nil {
				if unsubErr := subscriptionService.UnregisterSubscriptionFromConnector(
					c,
					connection,
					*sub.ConnectorSubscriptionID,
				); unsubErr != nil {
					// Log but don't fail - we still want to delete the connection
					api.Logger.ErrorContext(c, "Failed to unsubscribe from connector during connection deletion",
						"error", unsubErr,
						"subscription_id", sub.ID,
						"connector_subscription_id", *sub.ConnectorSubscriptionID)
				}
			}
		}
	}

	// Delete the connection
	deleteConnectionErr := api.DB.Transaction(func(tx *gorm.DB) error {
		return api.DB.DeleteConnection(tx, connection.ID)
	})
	if deleteConnectionErr != nil {
		api.Logger.ErrorContext(c, "Error deleting connection", "error", deleteConnectionErr)
		return NewInternalErrorf("error deleting connection: %w", deleteConnectionErr)
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
		return nil, NewInternalErrorf("error checking permissions: %w", err)
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
		return nil, NewInternalErrorf("error decoding user SQID: %w", err)
	}

	// Make sure the new owner is valid and a member of the workspace
	inWorkspace, isUserInWorkspaceErr := api.DB.IsUserInWorkspace(uint(newOwnerID), workspace.ID)
	if isUserInWorkspaceErr != nil {
		api.Logger.ErrorContext(c, "Error checking if user is in workspace", "error", isUserInWorkspaceErr)
		return nil, NewInternalErrorf("error checking if user is in workspace: %w", isUserInWorkspaceErr)
	}
	if !inWorkspace {
		api.Logger.ErrorContext(c, "New owner is not a member of the workspace")
		return nil, ErrNewOwnerInvalid
	}

	// Get the new owner's information for the audit log
	newOwner, getNewOwnerErr := api.DB.GetUser(uint(newOwnerID))
	if getNewOwnerErr != nil {
		api.Logger.ErrorContext(c, "Error fetching new owner information", "error", getNewOwnerErr)
		return nil, NewInternalErrorf("error fetching new owner information: %w", getNewOwnerErr)
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

	// Mask secrets
	api.MaskConnectionSecrets(c, connection)

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
				return NewInternalErrorf("error decoding tag SQID: %w", tagDecodeErr)
			}

			// Verify tag belongs to the workspace
			var tag db.Tag
			if tagErr := tx.First(&tag, uint(tagID)).Error; tagErr != nil {
				return NewInternalErrorf("error fetching tag from database: %w", tagErr)
			}
			if tag.WorkspaceID != workspaceID {
				return ErrInvalidRequest
			}

			// Add tag using the transaction
			if tagAddErr := tx.Model(connection).Association("Tags").Append(&db.Tag{Model: gorm.Model{ID: uint(tagID)}}); tagAddErr != nil {
				return NewInternalErrorf("error adding tag to connection: %w", tagAddErr)
			}
		}
	}
	return nil
}

// MaskConnectionSecrets masks secret fields in connection details and settings based on connector schema.
func (api *APIServices) MaskConnectionSecrets(c context.Context, connections ...*db.Connection) {
	// 1. Identify unique connectors and fetch any that aren't preloaded
	connectorMap := make(map[uint]*db.Connector)
	for _, conn := range connections {
		if conn.ConnectorID != 0 {
			if conn.Connector.ID != 0 {
				// Connector is preloaded, use it
				connectorMap[conn.ConnectorID] = &conn.Connector
			} else {
				// Connector is not preloaded, fetch it from the database
				connector, fetchErr := api.DB.GetConnector(conn.ConnectorID)
				if fetchErr != nil {
					api.Logger.WarnContext(
						c,
						"Connector not preloaded and failed to fetch from database, all fields will be masked as fail-safe",
						"connection_id",
						conn.ID,
						"connector_id",
						conn.ConnectorID,
						"error",
						fetchErr,
					)
					// Continue without this connector - applySecretMasking will mask all fields as fail-safe
					continue
				}
				connectorMap[conn.ConnectorID] = connector
			}
		}
	}

	// 2. Resolve schema for each connector (cached on the Connector row;
	//    lazily backfilled for pre-cache rows).
	schemas := api.resolveConnectorSchemas(c, connectorMap)

	// 3. Mask secrets
	api.applySecretMasking(connections, schemas)
}

func (api *APIServices) applySecretMasking(
	connections []*db.Connection,
	schemas map[uint]map[string]irminmodels.DynamicField,
) {
	for _, conn := range connections {
		schema, hasSchema := schemas[conn.ConnectorID]

		// Mask Details
		for k := range conn.Details {
			field, fieldExists := schema["details."+k]
			// If schema is missing (fetch failed), mask everything to be safe.
			// If field is missing from schema, mask it to be safe.
			// If field exists, mask only if marked as Secret.
			if !hasSchema || !fieldExists || field.Secret {
				conn.Details[k] = secretPlaceholder
			}
		}

		// Mask Settings
		for k := range conn.Settings {
			field, fieldExists := schema["settings."+k]
			if !hasSchema || !fieldExists || field.Secret {
				conn.Settings[k] = secretPlaceholder
			}
		}
	}
}

// resolveConnectorSchemas returns the cached secret-masking schema for each
// connector. Schemas are populated on connector register/update and stored on
// the Connector row, so the hot read path (list/get connections) does not
// fan out to irmin-connectors. If a row predates the cache, the schema is
// fetched once and persisted lazily.
func (api *APIServices) resolveConnectorSchemas(
	c context.Context,
	connectorMap map[uint]*db.Connector,
) map[uint]map[string]irminmodels.DynamicField {
	schemas := make(map[uint]map[string]irminmodels.DynamicField)
	for id, connector := range connectorMap {
		if connector.Schema != nil {
			// Presence-checked, not length-checked: a connector with zero
			// dynamic fields is legitimate and must still hit the cache path.
			schemas[id] = connector.Schema
			continue
		}

		// Lazy backfill for rows that predate the cached schema column.
		// Use "en" locale for internal schema fetching.
		client := connectorsclient.NewClient(connector.APIBaseURL, connector.SystemToken, "en")
		fetched, complete := api.fetchConnectorSchema(c, client, connector.Name)
		if !complete {
			// Transient failure on at least one side — applySecretMasking will
			// mask everything as fail-safe. Don't persist; retry next request.
			continue
		}

		// `fetched` may legitimately be empty (connector declares no fields);
		// cache it anyway so we stop fanning out on every read. Use a
		// non-nil empty map so the presence check above hits.
		if fetched == nil {
			fetched = map[string]irminmodels.DynamicField{}
		}
		connector.Schema = fetched
		schemas[id] = fetched

		// Persist the backfill. Pass a struct (not a map) so GORM applies the
		// `serializer:json` tag and JSON-encodes the value into jsonb; a map
		// Updates call skips the serializer and the write fails. Select the
		// schema column explicitly so we don't touch other fields.
		if err := api.DB.Model(connector).
			Select("schema").
			Updates(&db.Connector{Schema: fetched}).Error; err != nil {
			api.Logger.WarnContext(
				c,
				"Failed to persist lazily-fetched connector schema; masking will still work, but next request will re-fetch",
				"connector",
				connector.Name,
				"connector_id",
				id,
				"error",
				err,
			)
		}
	}
	return schemas
}

// TestConnection tests an existing connection using its stored credentials.
func (api *APIServices) TestConnection(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	connection *db.Connection,
) (*irminmodels.ConnectorConfigurationValidationResult, error) {
	// Check permissions
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceConnection,
		&connection.ID,
		db.PolicyActionRead,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to test connection",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"connection",
			connection.Name,
		)
		return nil, ErrAccessDenied
	}

	// Fetch the connection with unmasked secrets from the database
	fullConnection, err := api.DB.GetConnectionByID(connection.ID)
	if err != nil {
		api.Logger.ErrorContext(c, "Error getting connection", "error", err)
		return nil, NewInternalErrorf("error getting connection: %w", err)
	}

	// Get the connector information
	connector, err := api.DB.GetConnector(fullConnection.ConnectorID)
	if err != nil {
		api.Logger.ErrorContext(c, "Error getting connector", "error", err)
		return nil, NewInternalErrorf("error getting connector: %w", err)
	}

	// Create a connector client. Stamp the connection ID so OAuth-backed
	// connectors can resolve the right access token from Core while the
	// test call exercises vendor endpoints.
	client := connectorsclient.NewClient(connector.APIBaseURL, connector.SystemToken, locale).
		WithConnectionID(fullConnection.ID)

	// Validate the connection using the stored credentials
	validationResult, err := client.ValidateConfigFields(c, fullConnection.Details, fullConnection.Settings)
	if err != nil {
		api.Logger.ErrorContext(c, "Error validating connection", "error", err)
		return nil, NewInternalErrorf("error validating connection: %w", err)
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeInfo,
		Description:  fmt.Sprintf("Connection %s tested", connection.Name),
		UserID:       &user.ID,
		WorkspaceID:  &workspace.ID,
		ConnectionID: &connection.ID,
	})

	return validationResult, nil
}
