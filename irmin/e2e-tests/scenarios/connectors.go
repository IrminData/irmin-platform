package scenarios

import (
	"context"
	"fmt"

	irmincore "github.com/IrminData/irmin-platform/sdks/go/api"

	"github.com/IrminData/irmin-e2e-tests/config"
	"github.com/IrminData/irmin-e2e-tests/runner"
)

// ConnectorScenarios returns test cases for connector operations.
func ConnectorScenarios() []runner.TestCase {
	return []runner.TestCase{
		{
			Name:        "Connector_List",
			Description: "List all available connectors",
			Run:         testConnectorList,
		},
		{
			Name:        "Connector_Get",
			Description: "Get details of a specific connector",
			Run:         testConnectorGet,
		},
		{
			Name:        "Connector_Fields",
			Description: "Get configuration fields for a connector",
			Run:         testConnectorFields,
		},
	}
}

func testConnectorList(ctx context.Context, client *irmincore.Client, _ *config.Config) error {
	connectors, _, err := client.ListConnectors(ctx)
	if err != nil {
		return fmt.Errorf("failed to list connectors: %w", err)
	}

	// There may or may not be connectors depending on the environment
	// Just verify the API call succeeded
	_ = connectors

	return nil
}

func testConnectorGet(ctx context.Context, client *irmincore.Client, _ *config.Config) error {
	// First list connectors
	connectors, _, err := client.ListConnectors(ctx)
	if err != nil {
		return fmt.Errorf("failed to list connectors: %w", err)
	}

	if len(connectors) == 0 {
		// No connectors available, skip this test
		return nil
	}

	// Get details of the first connector
	connector, _, err := client.GetConnector(ctx, connectors[0].ID)
	if err != nil {
		return fmt.Errorf("failed to get connector: %w", err)
	}

	if connector.ID != connectors[0].ID {
		return fmt.Errorf("connector ID mismatch")
	}

	return nil
}

func testConnectorFields(ctx context.Context, client *irmincore.Client, _ *config.Config) error {
	// First list connectors
	connectors, _, err := client.ListConnectors(ctx)
	if err != nil {
		return fmt.Errorf("failed to list connectors: %w", err)
	}

	if len(connectors) == 0 {
		// No connectors available, skip this test
		return nil
	}

	// Get configuration fields for the first connector
	fields, _, err := client.FetchConnectorConfigurationFields(
		ctx,
		connectors[0].ID,
		"details",
		nil,
		nil,
	)
	if err != nil {
		return fmt.Errorf("failed to get connector fields: %w", err)
	}

	// Fields may be empty depending on the connector type
	_ = fields

	return nil
}
