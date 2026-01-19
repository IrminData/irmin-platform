package scenarios

import (
	"context"
	"fmt"

	irmincore "github.com/IrminData/irmin-sdk-go/api"

	"github.com/IrminData/irmin-e2e-tests/config"
	"github.com/IrminData/irmin-e2e-tests/runner"
)

// LogScenarios returns test cases for audit log operations.
func LogScenarios() []runner.TestCase {
	return []runner.TestCase{
		{
			Name:        "Log_List_Workspace",
			Description: "List audit log events for the workspace",
			Run:         testLogListWorkspace,
		},
		{
			Name:        "Log_List_Repository",
			Description: "List audit log events for a repository",
			Run:         testLogListRepository,
		},
		{
			Name:        "Log_List_User",
			Description: "List audit log events for a specific user",
			Run:         testLogListUser,
		},
		{
			Name:        "Log_List_Connection",
			Description: "List audit log events for a connection",
			Run:         testLogListConnection,
		},
	}
}

func testLogListWorkspace(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	// List workspace log events
	logs, _, err := client.FetchLogEvents(ctx, cfg.Workspace, "", 1, 10)
	if err != nil {
		return fmt.Errorf("failed to list workspace logs: %w", err)
	}

	// Logs may be empty for a new workspace, that's OK
	_ = logs

	return nil
}

func testLogListRepository(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	// List repository log events using the shared test repository
	logs, _, err := client.FetchLogEventsForRepository(ctx, cfg.Workspace, cfg.TestRepository, "", 1, 10)
	if err != nil {
		return fmt.Errorf("failed to list repository logs: %w", err)
	}

	// Logs may be empty, that's OK
	_ = logs

	return nil
}

func testLogListUser(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	// Get users to get a valid user ID
	users, _, err := client.ListUsers(ctx, cfg.Workspace)
	if err != nil {
		return fmt.Errorf("failed to list users: %w", err)
	}

	if len(users) == 0 {
		return fmt.Errorf("no users found in workspace")
	}

	// List log events for the first user
	logs, _, err := client.FetchLogEventsForUser(ctx, cfg.Workspace, users[0].ID, "", 1, 10)
	if err != nil {
		return fmt.Errorf("failed to list user logs: %w", err)
	}

	// Logs may be empty, that's OK
	_ = logs

	return nil
}

func testLogListConnection(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	// List connections
	connections, _, err := client.ListConnections(ctx, cfg.Workspace)
	if err != nil {
		return fmt.Errorf("failed to list connections: %w", err)
	}

	if len(connections) == 0 {
		// No connections available, skip this test
		return nil
	}

	// List log events for the first connection
	logs, _, err := client.FetchLogEventsForConnection(ctx, cfg.Workspace, connections[0].ID, "", 1, 10)
	if err != nil {
		return fmt.Errorf("failed to list connection logs: %w", err)
	}

	// Logs may be empty, that's OK
	_ = logs

	return nil
}
