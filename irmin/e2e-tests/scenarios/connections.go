package scenarios

import (
	"context"
	"fmt"

	irmincore "github.com/IrminData/irmin-sdk-go/api"

	"github.com/IrminData/irmin-e2e-tests/config"
	"github.com/IrminData/irmin-e2e-tests/runner"
)

// ConnectionScenarios returns test cases for connection operations.
func ConnectionScenarios() []runner.TestCase {
	return []runner.TestCase{
		{
			Name:        "Connection_List",
			Description: "List all connections in the workspace",
			Run:         testConnectionList,
		},
		{
			Name:        "Connection_Get",
			Description: "Get connection details",
			Run:         testConnectionGet,
		},
		{
			Name:        "Connection_Update",
			Description: "Update a connection",
			Run:         testConnectionUpdate,
		},
		{
			Name:        "Connection_Create_Delete",
			Description: "Create and delete a connection with proper configuration",
			Run:         testConnectionCreateDelete,
		},
	}
}

func testConnectionList(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	connections, _, err := client.ListConnections(ctx, cfg.Workspace)
	if err != nil {
		return fmt.Errorf("failed to list connections: %w", err)
	}

	// If we have a test connection, verify it's in the list
	if cfg.TestConnection != "" {
		found := false
		for _, c := range connections {
			if c.ID == cfg.TestConnection {
				found = true
				break
			}
		}
		if !found {
			return fmt.Errorf("test connection not found in list")
		}
	}

	return nil
}

func testConnectionGet(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	if cfg.TestConnection == "" {
		// No test connection configured, skip
		return nil
	}

	connection, _, err := client.GetConnection(ctx, cfg.Workspace, cfg.TestConnection)
	if err != nil {
		return fmt.Errorf("failed to get connection: %w", err)
	}

	if connection.ID != cfg.TestConnection {
		return fmt.Errorf("connection ID mismatch: expected %q, got %q", cfg.TestConnection, connection.ID)
	}

	if connection.Connector.ID == "" {
		return fmt.Errorf("connection connector ID is empty")
	}

	return nil
}

func testConnectionUpdate(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	if cfg.TestConnection == "" {
		// No test connection configured, skip
		return nil
	}

	// Update the connection description
	updatedDescription := fmt.Sprintf("Updated E2E test connection %d", randomSuffix())
	_, _, err := client.UpdateConnection(ctx, cfg.Workspace, cfg.TestConnection, irmincore.UpdateConnectionRequest{
		Description: &updatedDescription,
	})
	if err != nil {
		return fmt.Errorf("failed to update connection: %w", err)
	}

	// Verify the update
	connection, _, err := client.GetConnection(ctx, cfg.Workspace, cfg.TestConnection)
	if err != nil {
		return fmt.Errorf("failed to get updated connection: %w", err)
	}

	if connection.Description != updatedDescription {
		return fmt.Errorf(
			"connection description not updated: expected %q, got %q",
			updatedDescription, connection.Description,
		)
	}

	return nil
}

func testConnectionCreateDelete(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	if cfg.Connection == nil || cfg.Connection.ConnectorID == "" {
		// No connection configuration, skip
		return nil
	}

	// Create a new connection using the same configuration
	connectionName := fmt.Sprintf("e2e-connection-lifecycle-%d", randomSuffix())

	connection, _, err := client.CreateConnection(ctx, cfg.Workspace, irmincore.CreateConnectionRequest{
		Name:        connectionName,
		Connector:   cfg.Connection.ConnectorID,
		Description: "E2E connection lifecycle test",
		Details:     cfg.Connection.Details,
		Settings:    cfg.Connection.Settings,
	})
	if err != nil {
		return fmt.Errorf("failed to create connection: %w", err)
	}

	// Verify the connection was created
	if connection.ID == "" {
		return fmt.Errorf("created connection ID is empty")
	}

	if connection.Name != connectionName {
		return fmt.Errorf("connection name mismatch: expected %q, got %q", connectionName, connection.Name)
	}

	// Delete the connection
	_, err = client.DeleteConnection(ctx, cfg.Workspace, connection.ID)
	if err != nil {
		return fmt.Errorf("failed to delete connection: %w", err)
	}

	// Verify deletion - get should fail
	_, _, err = client.GetConnection(ctx, cfg.Workspace, connection.ID)
	if err == nil {
		return fmt.Errorf("connection still exists after deletion")
	}

	return nil
}
