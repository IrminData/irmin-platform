package tools

import (
	"context"

	"irmin-api/formatter"
	"irmin-api/mcp/helpers"

	irmincore "github.com/IrminData/irmin-sdk-go/core-api"
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

// RegisterWorkspaceTools registers the tools for workspace management.
func (mcpTools *MCPTools) RegisterWorkspaceTools() {
	mcpTools.registerCreateWorkspaceTool()
}

// registerCreateWorkspaceTool registers the create_workspace tool for creating a new workspace
func (mcpTools *MCPTools) registerCreateWorkspaceTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{Name: "create_workspace", Description: "Create a new workspace for the current user"},
		func(ctx context.Context, _ *sdkmcp.ServerSession, params *sdkmcp.CallToolParamsFor[irmincore.CreateWorkspaceRequest]) (*sdkmcp.CallToolResultFor[struct{}], error) {
			user, ok := mcpTools.getUser(ctx)
			if !ok || user == nil || user.ID == 0 {
				return helpers.MCPError("Unauthorized"), nil
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
				return helpers.MCPError("Failed to format workspace"), ferr
			}

			return helpers.MCPSuccess(formatted)
		},
	)
}
