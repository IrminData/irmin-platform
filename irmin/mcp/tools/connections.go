package tools

import (
	"context"
	"fmt"
	"irmin-api/formatter"
	"irmin-api/mcp/helpers"

	irmincore "github.com/IrminData/irmin-platform/sdks/go/api"
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

type listConnectionsArgs struct {
	WorkspaceSlug string `json:"workspace_slug" jsonschema:"required,The slug of the workspace to list connections in"`
}

type getConnectionArgs struct {
	WorkspaceSlug string `json:"workspace_slug" jsonschema:"required,The slug of the workspace to get the connection from"`
	ConnectionID  string `json:"connection_id"  jsonschema:"required,The ID (SQID) of the connection to get"`
}

type createConnectionArgs struct {
	WorkspaceSlug string         `json:"workspace_slug"          jsonschema:"required,The slug of the workspace to create the connection in"`
	Name          string         `json:"name"                    jsonschema:"required,The name of the connection"`
	Connector     string         `json:"connector"               jsonschema:"required,The ID (SQID) of the connector to use for the connection"`
	Description   string         `json:"description,omitempty"   jsonschema:"optional,The description of the connection"`
	Documentation string         `json:"documentation,omitempty" jsonschema:"optional,The detailed documentation of the connection in markdown format"`
	Details       map[string]any `json:"details"                 jsonschema:"required,The values for the 'details' part of the connector configuration as JSON object, Key-Value pairs, like host: db.example.com"`
	Settings      map[string]any `json:"settings"                jsonschema:"required,The values for the 'settings' part of the connector configuration as JSON object, Key-Value pairs, like project_id: 123456"`
}

type updateConnectionArgs struct {
	WorkspaceSlug string  `json:"workspace_slug"          jsonschema:"required,The slug of the workspace to update the connection in"`
	ConnectionID  string  `json:"connection_id"           jsonschema:"required,The ID (SQID) of the connection to update"`
	Name          *string `json:"name,omitempty"          jsonschema:"optional,The name of the connection"`
	Description   *string `json:"description,omitempty"   jsonschema:"optional,The description of the connection"`
	Documentation *string `json:"documentation,omitempty" jsonschema:"optional,The documentation of the connection"`
}

type connectionSchemaArgs struct {
	WorkspaceSlug   string `json:"workspace_slug"   jsonschema:"required,The slug of the workspace to get the connection schema from"`
	ConnectionID    string `json:"connection_id"    jsonschema:"required,The ID (SQID) of the connection to get the schema from"`
	OperationMethod string `json:"operation_method" jsonschema:"required,The operation method to get the schema for (pull, push)"`
	Path            string `json:"path"             jsonschema:"optional,The path within the connection to get the schema for, empty string means the root path"`
}

// RegisterConnectionTools registers all connection-related tools.
func (mcpTools *MCPTools) RegisterConnectionTools() {
	mcpTools.registerListConnectionsTool()
	mcpTools.registerGetConnectionTool()
	mcpTools.registerCreateConnectionTool()
	mcpTools.registerUpdateConnectionTool()
	mcpTools.registerConnectionSchemaTool()
}

// registerListConnectionsTool registers the irmin_list_connections tool for listing connections in a workspace
//
//nolint:dupl // This is not a duplicate, it's a different tool, with similar flow compared to other tools
func (mcpTools *MCPTools) registerListConnectionsTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_list_connections",
			Description: "List all configured connections in a workspace. Connections are configured instances of connectors with stored credentials and settings for accessing external systems. Returns an array of connection objects with ID, name, connector type, configuration status, and metadata. Requires workspace_slug. Use this to discover available data sources and destinations before setting up data workflows.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args listConnectionsArgs) (*sdkmcp.CallToolResult, struct{}, error) {
			// Validate user
			user, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, struct{}{}, err
			}

			// Get the workspace first
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, args.WorkspaceSlug)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workspace", "error", err)
				return helpers.MCPError("Failed to get workspace"), struct{}{}, nil
			}

			// List the connections
			connections, err := mcpTools.apiServices.ListConnections(ctx, user, workspace)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to list connections", "error", err)
				return helpers.MCPError("Failed to list connections"), struct{}{}, nil
			}

			// Format the response using the same formatter as the API
			formatted, ferr := formatter.FormatIndexResponse(
				connections,
				formatter.FormatConnectionResponse,
				mcpTools.apiServices.SQIDManager,
			)
			if ferr != nil {
				mcpTools.apiServices.Logger.Error("Failed to format connections", "error", ferr)
				return nil, struct{}{}, fmt.Errorf("failed to format connections response: %w", ferr)
			}

			result, err := helpers.MCPSuccess(formatted)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}

// registerGetConnectionTool registers the irmin_get_connection tool for getting a connection by ID
//
//nolint:dupl // Similar pattern to other get tools, but for a different resource type
func (mcpTools *MCPTools) registerGetConnectionTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_get_connection",
			Description: "Retrieve detailed information about a specific connection. Returns complete connection metadata including name, description, connector type, configuration status, and last tested timestamp. Does not expose sensitive credential values. Requires workspace_slug and connection_id (SQID). Use this to inspect connection details before using it in workflows or queries.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args getConnectionArgs) (*sdkmcp.CallToolResult, struct{}, error) {
			// Validate user
			user, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, struct{}{}, err
			}

			// Get the workspace first
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, args.WorkspaceSlug)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workspace", "error", err)
				return helpers.MCPError("Failed to get workspace"), struct{}{}, nil
			}

			// Get the connection
			connection, err := mcpTools.apiServices.GetConnection(ctx, user, workspace, args.ConnectionID)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get connection", "error", err)
				return helpers.MCPError("Failed to get connection"), struct{}{}, nil
			}

			// Format the response using the same formatter as the API
			formatted, ferr := formatter.FormatConnectionResponse(connection, mcpTools.apiServices.SQIDManager)
			if ferr != nil {
				mcpTools.apiServices.Logger.Error("Failed to format connection response", "error", ferr)
				return nil, struct{}{}, fmt.Errorf("failed to format connection response: %w", ferr)
			}

			result, err := helpers.MCPSuccess(formatted)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}

// registerCreateConnectionTool registers the irmin_create_connection tool for creating a new connection in a workspace
func (mcpTools *MCPTools) registerCreateConnectionTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_create_connection",
			Description: "Create a new connection to an external data source or destination. Requires workspace_slug, name, connector_id (SQID), details (authentication credentials), and settings (connection-specific configuration). Optionally provide description and documentation. Returns the created connection object. Always validate configuration with irmin_validate_connector_configuration before creating to ensure credentials are correct and connectivity works.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args createConnectionArgs) (*sdkmcp.CallToolResult, struct{}, error) {
			// Validate user
			user, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, struct{}{}, err
			}

			// Get the workspace first
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, args.WorkspaceSlug)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workspace", "error", err)
				return helpers.MCPError("Failed to get workspace"), struct{}{}, nil
			}

			// Create the connection
			connection, err := mcpTools.apiServices.CreateConnection(
				ctx,
				"en",
				user,
				workspace,
				irmincore.CreateConnectionRequest{
					Name:          args.Name,
					Connector:     args.Connector,
					Description:   args.Description,
					Documentation: args.Documentation,
					Details:       args.Details,
					Settings:      args.Settings,
				},
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to create connection", "error", err)
				return helpers.MCPError("Failed to create connection"), struct{}{}, nil
			}

			// Format the connection for the response
			formatted, ferr := formatter.FormatConnectionResponse(connection, mcpTools.apiServices.SQIDManager)
			if ferr != nil {
				mcpTools.apiServices.Logger.Error("Failed to format connection", "error", ferr)
				return nil, struct{}{}, fmt.Errorf("failed to format connection response: %w", ferr)
			}

			result, err := helpers.MCPSuccess(formatted)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}

// registerUpdateConnectionTool registers the irmin_update_connection tool for updating a connection in a workspace
func (mcpTools *MCPTools) registerUpdateConnectionTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_update_connection",
			Description: "Update metadata of an existing connection including name, description, and documentation. Cannot modify credentials or settings through this tool - those must be reconfigured through the connector interface. Requires workspace_slug, connection_id (SQID), and update parameters. Returns the updated connection object. Use this to maintain clear documentation and naming for connections.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args updateConnectionArgs) (*sdkmcp.CallToolResult, struct{}, error) {
			// Validate user
			user, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, struct{}{}, err
			}

			// Get the workspace first
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, args.WorkspaceSlug)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workspace", "error", err)
				return helpers.MCPError("Failed to get workspace"), struct{}{}, nil
			}

			// Get the connection
			connection, err := mcpTools.apiServices.GetConnection(ctx, user, workspace, args.ConnectionID)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get connection", "error", err)
				return helpers.MCPError("Failed to get connection"), struct{}{}, nil
			}

			// Update the connection
			connection, err = mcpTools.apiServices.UpdateConnection(
				ctx,
				user,
				workspace,
				connection,
				irmincore.UpdateConnectionRequest{
					Name:          args.Name,
					Description:   args.Description,
					Documentation: args.Documentation,
				},
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to update connection", "error", err)
				return helpers.MCPError("Failed to update connection"), struct{}{}, nil
			}

			// Format the connection for the response
			formatted, ferr := formatter.FormatConnectionResponse(connection, mcpTools.apiServices.SQIDManager)
			if ferr != nil {
				mcpTools.apiServices.Logger.Error("Failed to format connection", "error", ferr)
				return nil, struct{}{}, fmt.Errorf("failed to format connection response: %w", ferr)
			}

			result, err := helpers.MCPSuccess(formatted)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}

// registerConnectionSchemaTool registers the irmin_get_connection_schema tool for getting the schema of a connection
func (mcpTools *MCPTools) registerConnectionSchemaTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_get_connection_schema",
			Description: "Retrieve the data schema available through a connection for a specific operation. Shows available tables, collections, or endpoints with their structure for pull (import) or push (export) operations. Requires workspace_slug, connection_id (SQID), operation_method ('pull' or 'push'), and optionally path to scope the schema query. Returns schema information for the external data source. Use this before configuring workflows to understand available data structures.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args connectionSchemaArgs) (*sdkmcp.CallToolResult, struct{}, error) {
			// Validate user
			user, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, struct{}{}, err
			}

			// Get the workspace
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, args.WorkspaceSlug)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workspace", "error", err)
				return helpers.MCPError("Failed to get workspace"), struct{}{}, nil
			}

			// Get the connection
			connection, err := mcpTools.apiServices.GetConnection(ctx, user, workspace, args.ConnectionID)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get connection", "error", err)
				return helpers.MCPError("Failed to get connection"), struct{}{}, nil
			}

			// Get the schema of the connection
			schema, err := mcpTools.apiServices.GetConnectionSchema(
				ctx,
				"en",
				user,
				workspace,
				connection,
				args.OperationMethod,
				args.Path,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get connection schema", "error", err)
				return helpers.MCPError("Failed to get connection schema"), struct{}{}, nil
			}

			// Return the schema
			result, err := helpers.MCPSuccess(schema)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}
