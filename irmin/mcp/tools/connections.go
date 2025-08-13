package tools

import (
	"context"
	"fmt"
	"irmin-api/formatter"
	"irmin-api/mcp/helpers"

	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

type listConnectionsArgs struct {
	WorkspaceSlug string `json:"workspace_slug" jsonschema:"required,The slug of the workspace to list connections in"`
}

// RegisterConnectionTools registers all connection-related tools.
func (mcpTools *MCPTools) RegisterConnectionTools() {
	mcpTools.registerListConnectionsTool()
}

// registerListConnectionsTool registers the list_connections tool for listing connections in a workspace
//
//nolint:dupl // This is not a duplicate, it's a different tool, with similar flow compared to other tools
func (mcpTools *MCPTools) registerListConnectionsTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "list_connections",
			Description: "List connections in a workspace. Connections store the configurations for the Connectors used to connect and interact with external services.",
		},
		func(ctx context.Context, _ *sdkmcp.ServerSession, params *sdkmcp.CallToolParamsFor[listConnectionsArgs]) (*sdkmcp.CallToolResultFor[struct{}], error) {
			// Validate user
			user, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, err
			}

			// Get the workspace first
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, params.Arguments.WorkspaceSlug)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workspace", "error", err)
				return helpers.MCPError("Failed to get workspace"), nil
			}

			// List the connections
			connections, err := mcpTools.apiServices.ListConnections(ctx, user, workspace)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to list connections", "error", err)
				return helpers.MCPError("Failed to list connections"), nil
			}

			// Format the response using the same formatter as the API
			formatted, ferr := formatter.FormatIndexResponse(
				connections,
				formatter.FormatConnectionResponse,
				mcpTools.apiServices.SQIDManager,
			)
			if ferr != nil {
				mcpTools.apiServices.Logger.Error("Failed to format connections", "error", ferr)
				return nil, fmt.Errorf("failed to format connections response: %w", ferr)
			}

			return helpers.MCPSuccess(formatted)
		},
	)
}
