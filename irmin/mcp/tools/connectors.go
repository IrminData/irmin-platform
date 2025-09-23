package tools

import (
	"context"
	"fmt"
	"irmin-api/formatter"
	"irmin-api/mcp/helpers"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

type configurationFieldsType string

const (
	configurationFieldsTypeDetails  configurationFieldsType = "details"
	configurationFieldsTypeSettings configurationFieldsType = "settings"
)

type showRequiredConnectorConfigurationFieldsArgs struct {
	ConnectorID          string                                  `json:"connector_id"          jsonschema:"required,The ID (SQID) of the connector to show the required configuration fields for"`
	ConfigurationType    configurationFieldsType                 `json:"configuration_type"    jsonschema:"required,The type of configuration fields to show. Details fields are used to establish initial connection and authenticate with the connector, while settings fields are used to configure the connection after it is established."`
	CurrentConfiguration irmincore.ConnectorConfigurationRequest `json:"current_configuration" jsonschema:"required,The current configuration field values for the connector, used to for example fetch the options for a dropdown fields."`
}

type validateConnectorConfigurationArgs struct {
	ConnectorID   string                                  `json:"connector_id"  jsonschema:"required,The ID (SQID) of the connector to validate the configuration for"`
	Configuration irmincore.ConnectorConfigurationRequest `json:"configuration" jsonschema:"required,The configuration to validate. The configuration fields which are required are returned in the show_required_connector_configuration_fields tool."`
}

// RegisterConnectorTools registers all connector-related tools.
func (mcpTools *MCPTools) RegisterConnectorTools() {
	mcpTools.registerListConnectorsTool()
	mcpTools.registerShowRequiredConnectorConfigurationFieldsTool()
	mcpTools.registerValidateConnectorConfigurationTool()
}

// registerListConnectorsTool registers the list_connectors tool for listing connectors available on the platform
func (mcpTools *MCPTools) registerListConnectorsTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "list_connectors",
			Description: "List connectors available to be used for data ingestion, export, and other operations.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, _ struct{}) (*sdkmcp.CallToolResult, struct{}, error) {
			// List the connectors
			connectors, err := mcpTools.apiServices.ListConnectors(ctx)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to list connectors", "error", err)
				return helpers.MCPError("Failed to list connectors"), struct{}{}, nil
			}

			// Format the response using the same formatter as the API
			formatted, ferr := formatter.FormatIndexResponse(
				connectors,
				formatter.FormatConnectorResponse,
				mcpTools.apiServices.SQIDManager,
			)
			if ferr != nil {
				mcpTools.apiServices.Logger.Error("Failed to format connectors", "error", ferr)
				return nil, struct{}{}, fmt.Errorf("failed to format connectors response: %w", ferr)
			}

			result, err := helpers.MCPSuccess(formatted)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}

// registerShowRequiredConnectorConfigurationFieldsTool registers the show_required_connector_configuration_fields tool for showing the required configuration fields for a connector
func (mcpTools *MCPTools) registerShowRequiredConnectorConfigurationFieldsTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "show_required_connector_configuration_fields",
			Description: "Show the required configuration fields for a connector. The values for these fields need to be supplied when creating a new connection, to authenticate and establish a connection with the external system.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args showRequiredConnectorConfigurationFieldsArgs) (*sdkmcp.CallToolResult, struct{}, error) {
			// Parse the connector ID from the SQID
			connectorID, err := mcpTools.apiServices.SQIDManager.Decode("connectors", args.ConnectorID)
			if err != nil {
				return nil, struct{}{}, err
			}

			// Get the connector
			connector, err := mcpTools.apiServices.GetConnector(ctx, uint(connectorID))
			if err != nil {
				return nil, struct{}{}, err
			}

			// Validate the configuration type
			if args.ConfigurationType != configurationFieldsTypeDetails &&
				args.ConfigurationType != configurationFieldsTypeSettings {
				return helpers.MCPError("Invalid configuration type"), struct{}{}, nil
			}

			// Get the configuration fields
			configurationFields, err := mcpTools.apiServices.GetConnectorConfigurationFields(
				ctx,
				"en",
				connector,
				string(args.ConfigurationType),
				args.CurrentConfiguration,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Error fetching connection configuration fields", "error", err)
				return helpers.MCPError("Error fetching connection configuration fields"), struct{}{}, nil
			}

			result, err := helpers.MCPSuccess(configurationFields)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}

// registerValidateConnectorConfigurationTool registers the validate_connector_configuration tool for validating the configuration of a connector
func (mcpTools *MCPTools) registerValidateConnectorConfigurationTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "validate_connector_configuration",
			Description: "Validate the configuration of a connector. This is used to validate the configuration of a connector before creating a new connection.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args validateConnectorConfigurationArgs) (*sdkmcp.CallToolResult, struct{}, error) {
			// Parse the connector ID from the SQID
			connectorID, err := mcpTools.apiServices.SQIDManager.Decode("connectors", args.ConnectorID)
			if err != nil {
				return nil, struct{}{}, err
			}

			// Get the connector
			connector, err := mcpTools.apiServices.GetConnector(ctx, uint(connectorID))
			if err != nil {
				return nil, struct{}{}, err
			}

			// Validate the configuration
			validationResult, err := mcpTools.apiServices.ValidateConnectorConfiguration(
				ctx,
				"en",
				connector,
				args.Configuration,
			)
			if err != nil {
				return nil, struct{}{}, err
			}

			result, err := helpers.MCPSuccess(validationResult)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}
