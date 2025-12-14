package tools

import (
	"context"
	"fmt"

	"irmin-api/formatter"
	"irmin-api/mcp/helpers"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

// RegisterWorkspaceTools registers the tools for workspace management.
func (mcpTools *MCPTools) RegisterWorkspaceTools() {
	mcpTools.registerListWorkspacesTool()
	mcpTools.registerCreateWorkspaceTool()
}

// registerListWorkspacesTool registers the irmin_list_workspaces tool for listing workspaces accessible to the current user
func (mcpTools *MCPTools) registerListWorkspacesTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_list_workspaces",
			Description: "List all workspaces accessible to the authenticated user. Returns an array of workspace objects containing name, slug, description, creation date, and associated metadata. Requires authentication via Bearer token. Use this tool at the start of operations to discover available workspaces, as most other Irmin tools require a workspace_slug parameter to specify which workspace to operate on.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, _ struct{}) (*sdkmcp.CallToolResult, struct{}, error) {
			// Validate user
			user, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, struct{}{}, err
			}

			// List the workspaces
			workspaces, err := mcpTools.apiServices.ListWorkspaces(user)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to list workspaces", "error", err)
				return helpers.MCPError("Failed to list workspaces"), struct{}{}, nil
			}

			// Format the response using the same formatter as the API
			formatted, ferr := formatter.FormatIndexResponse(
				workspaces,
				formatter.FormatWorkspaceResponse,
				mcpTools.apiServices.SQIDManager,
			)
			if ferr != nil {
				mcpTools.apiServices.Logger.Error("Failed to format workspaces", "error", ferr)
				return nil, struct{}{}, fmt.Errorf("failed to format workspaces response: %w", ferr)
			}

			result, err := helpers.MCPSuccess(formatted)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}

// registerCreateWorkspaceTool registers the irmin_create_workspace tool for creating a new workspace
func (mcpTools *MCPTools) registerCreateWorkspaceTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_create_workspace",
			Description: "Create a new workspace for the authenticated user. A workspace is a top-level organizational unit that contains repositories, connections, workflows, and queries. Requires a name (alphanumeric with hyphens/underscores) and optional description. Returns the created workspace object with its unique slug identifier. Use this when you need to set up a new isolated environment for data management operations.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args irmincore.CreateWorkspaceRequest) (*sdkmcp.CallToolResult, struct{}, error) {
			// Validate user
			user, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, struct{}{}, err
			}

			// Use the request directly (validation will be handled by the service)
			req := args

			// Use the service to create the workspace
			newWorkspace, err := mcpTools.apiServices.CreateWorkspace(ctx, user, req)
			if err != nil {
				mcpTools.apiServices.Logger.Error("workspace creation failed", "error", err)
				return helpers.MCPError("Workspace creation failed"), struct{}{}, nil
			}

			// Format the response using the same formatter as the API
			formatted, ferr := formatter.FormatWorkspaceResponse(newWorkspace, mcpTools.apiServices.SQIDManager)
			if ferr != nil {
				mcpTools.apiServices.Logger.Error("Failed to format workspace", "error", ferr)
				return nil, struct{}{}, fmt.Errorf("failed to format workspace response: %w", ferr)
			}

			result, err := helpers.MCPSuccess(formatted)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}
