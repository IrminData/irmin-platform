package tools

import (
	"context"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/mcp/helpers"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	irminsqids "github.com/IrminData/irmin-sdk-go/sqids"
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

type listWorkflowsArgs struct {
	WorkspaceSlug string `json:"workspace_slug" jsonschema:"required,The slug of the workspace to list workflows in"`
}

// RegisterWorkflowsTools registers all workflows-related tools.
func (mcpTools *MCPTools) RegisterWorkflowsTools() {
	mcpTools.registerListWorkflowsTool()
}

// registerListWorkflowsTool registers the list_workflows tool for listing workflows in a workspace
func (mcpTools *MCPTools) registerListWorkflowsTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "list_workflows",
			Description: "List workflows in a workspace. Workflows are used to orchestrate the execution of data ingestion, export, and other operations.",
		},
		func(ctx context.Context, _ *sdkmcp.ServerSession, params *sdkmcp.CallToolParamsFor[listWorkflowsArgs]) (*sdkmcp.CallToolResultFor[struct{}], error) {
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

			// List the workflows
			workflows, err := mcpTools.apiServices.ListWorkflows(ctx, user, workspace, "")
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to list workflows", "error", err)
				return helpers.MCPError("Failed to list workflows"), nil
			}

			// Create a wrapper function that adapts FormatWorkflowResponse to the expected signature
			formatWorkflow := func(workflow *db.Workflow, sqidManager *irminsqids.SQIDManager) (*irminmodels.Workflow, error) {
				return formatter.FormatWorkflowResponse(mcpTools.apiServices.DB, workflow, sqidManager)
			}

			// Format the response using FormatIndexResponse
			workflowsResponse, err := formatter.FormatIndexResponse(
				workflows,
				formatWorkflow,
				mcpTools.apiServices.SQIDManager,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Error formatting workflow response", "error", err)
				return helpers.MCPError("Error formatting workflow response"), nil
			}

			return helpers.MCPSuccess(workflowsResponse)
		},
	)
}
