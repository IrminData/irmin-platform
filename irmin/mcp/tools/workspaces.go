package tools

import (
	"context"
	"fmt"

	"irmin-api/formatter"
	"irmin-api/mcp/helpers"

	irmincore "github.com/IrminData/irmin-sdk-go/core-api"
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

// RegisterWorkspaceTools registers the tools for workspace management.
func (mcpTools *MCPTools) RegisterWorkspaceTools() {
	mcpTools.registerListWorkspacesTool()
	mcpTools.registerCreateWorkspaceTool()
}

// registerListWorkspacesTool registers the list_workspaces tool for listing workspaces accessible to the current user
func (mcpTools *MCPTools) registerListWorkspacesTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "list_workspaces",
			Description: "List workspaces accessible to the current user. Most tool calls require a workspace to be specified.",
		},
		func(ctx context.Context, _ *sdkmcp.ServerSession, _ *sdkmcp.CallToolParamsFor[struct{}]) (*sdkmcp.CallToolResultFor[struct{}], error) {
			// Validate user
			user, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, err
			}

			// List the workspaces
			workspaces, err := mcpTools.apiServices.ListWorkspaces(user)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to list workspaces", "error", err)
				return helpers.MCPError("Failed to list workspaces"), nil
			}

			// Format the response using the same formatter as the API
			formatted, ferr := formatter.FormatIndexResponse(
				workspaces,
				formatter.FormatWorkspaceResponse,
				mcpTools.apiServices.SQIDManager,
			)
			if ferr != nil {
				mcpTools.apiServices.Logger.Error("Failed to format workspaces", "error", ferr)
				return nil, fmt.Errorf("failed to format workspaces response: %w", ferr)
			}

			return helpers.MCPSuccess(formatted)
		},
	)
}

// registerCreateWorkspaceTool registers the create_workspace tool for creating a new workspace
func (mcpTools *MCPTools) registerCreateWorkspaceTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{Name: "create_workspace", Description: "Create a new workspace for the current user"},
		func(ctx context.Context, _ *sdkmcp.ServerSession, params *sdkmcp.CallToolParamsFor[irmincore.CreateWorkspaceRequest]) (*sdkmcp.CallToolResultFor[struct{}], error) {
			// Validate user
			user, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, err
			}

			// Use the request directly (validation will be handled by the service)
			req := params.Arguments

			// Use the service to create the workspace
			newWorkspace, err := mcpTools.apiServices.CreateWorkspace(ctx, user, req)
			if err != nil {
				mcpTools.apiServices.Logger.Error("workspace creation failed", "error", err)
				return helpers.MCPError("Workspace creation failed"), nil
			}

			// Format the response using the same formatter as the API
			formatted, ferr := formatter.FormatWorkspaceResponse(newWorkspace, mcpTools.apiServices.SQIDManager)
			if ferr != nil {
				mcpTools.apiServices.Logger.Error("Failed to format workspace", "error", ferr)
				return nil, fmt.Errorf("failed to format workspace response: %w", ferr)
			}

			return helpers.MCPSuccess(formatted)
		},
	)
}
