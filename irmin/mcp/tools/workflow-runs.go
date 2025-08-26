package tools

import (
	"context"
	"irmin-api/formatter"
	"irmin-api/mcp/helpers"

	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

type listWorkflowRunsArgs struct {
	WorkspaceSlug string `json:"workspace_slug" jsonschema:"required,The slug of the workspace to list workflow runs in"`
	WorkflowID    string `json:"workflow_id"    jsonschema:"required,The ID of the workflow to list workflow runs for"`
	PerPage       int    `json:"per_page"       jsonschema:"required,The number of workflow runs to list per page"`
	Page          int    `json:"page"           jsonschema:"required,The page number to list"`
}

type createWorkflowRunArgs struct {
	WorkspaceSlug string `json:"workspace_slug" jsonschema:"required,The slug of the workspace to create a workflow run in"`
	WorkflowID    string `json:"workflow_id"    jsonschema:"required,The ID of the workflow to create a workflow run for"`
}

type cancelWorkflowRunArgs struct {
	WorkspaceSlug string `json:"workspace_slug" jsonschema:"required,The slug of the workspace to cancel a workflow run in"`
	WorkflowID    string `json:"workflow_id"    jsonschema:"required,The ID of the workflow to cancel a workflow run for"`
	RunID         string `json:"run_id"         jsonschema:"required,The ID of the workflow run to cancel"`
}

func (mcpTools *MCPTools) RegisterWorkflowRunsTools() {
	mcpTools.registerListWorkflowRunsTool()
	mcpTools.registerCreateWorkflowRunTool()
	mcpTools.registerCancelWorkflowRunTool()
}

// registerCreateWorkflowRunTool registers the create_workflow_run tool for creating a new workflow run
func (mcpTools *MCPTools) registerCreateWorkflowRunTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "create_workflow_run",
			Description: "Create a new workflow run for a given workflow, executing the workflow. The workflow will be executed in the background, with logs and status updates available in the workflow run.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args createWorkflowRunArgs) (*sdkmcp.CallToolResult, struct{}, error) {
			// Validate user
			user, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, struct{}{}, err
			}

			// Get the workspace
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, args.WorkspaceSlug)
			if err != nil {
				return nil, struct{}{}, err
			}

			// Get the workflow
			workflow, err := mcpTools.apiServices.GetWorkflow(ctx, user, workspace, args.WorkflowID)
			if err != nil {
				return nil, struct{}{}, err
			}

			// Create the workflow run
			workflowRun, err := mcpTools.apiServices.CreateWorkflowRun(ctx, user, workspace, workflow)
			if err != nil {
				return nil, struct{}{}, err
			}

			// Format the workflow run for the response.
			formattedRun, formatErr := formatter.FormatWorkflowRunResponse(
				workflowRun,
				mcpTools.apiServices.SQIDManager,
			)
			if formatErr != nil {
				return nil, struct{}{}, formatErr
			}

			result, err := helpers.MCPSuccess(formattedRun)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}

// registerCancelWorkflowRunTool registers the cancel_workflow_run tool for cancelling a workflow run
func (mcpTools *MCPTools) registerCancelWorkflowRunTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "cancel_workflow_run",
			Description: "Cancel an existing workflow run. The workflow run will be set to cancelled, and the workflow will stop executing.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args cancelWorkflowRunArgs) (*sdkmcp.CallToolResult, struct{}, error) {
			// Validate user
			user, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, struct{}{}, err
			}

			// Get the workspace
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, args.WorkspaceSlug)
			if err != nil {
				return nil, struct{}{}, err
			}

			// Get the workflow
			workflow, err := mcpTools.apiServices.GetWorkflow(ctx, user, workspace, args.WorkflowID)
			if err != nil {
				return nil, struct{}{}, err
			}

			// Cancel the workflow run
			workflowRun, err := mcpTools.apiServices.CancelWorkflowRun(
				ctx,
				user,
				workspace,
				workflow,
				args.RunID,
			)
			if err != nil {
				return nil, struct{}{}, err
			}

			// Format the workflow run for the response.
			formattedRun, formatErr := formatter.FormatWorkflowRunResponse(
				workflowRun,
				mcpTools.apiServices.SQIDManager,
			)
			if formatErr != nil {
				return nil, struct{}{}, formatErr
			}

			result, err := helpers.MCPSuccess(formattedRun)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}

// registerListWorkflowRunsTool registers the list_workflow_runs tool for listing workflow runs in a workspace
func (mcpTools *MCPTools) registerListWorkflowRunsTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "list_workflow_runs",
			Description: "List the workflow runs for a given workflow. Workflow runs are executions of a workflow that have been run, with statuses, timestamps, logs, and other metadata.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args listWorkflowRunsArgs) (*sdkmcp.CallToolResult, struct{}, error) {
			// Validate user
			user, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, struct{}{}, err
			}

			// Get the workspace
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, args.WorkspaceSlug)
			if err != nil {
				return nil, struct{}{}, err
			}

			// Get the workflow
			workflow, err := mcpTools.apiServices.GetWorkflow(ctx, user, workspace, args.WorkflowID)
			if err != nil {
				return nil, struct{}{}, err
			}

			// Get the workflow runs for the workflow.
			runs, count, err := mcpTools.apiServices.ListWorkflowRuns(
				ctx,
				user,
				workspace,
				workflow,
				args.PerPage,
				args.Page,
			)
			if err != nil {
				return nil, struct{}{}, err
			}

			// Format the workflow runs for the response.
			formattedRuns, formatErr := formatter.FormatIndexResponse(
				runs,
				formatter.FormatWorkflowRunResponse,
				mcpTools.apiServices.SQIDManager,
			)
			if formatErr != nil {
				return nil, struct{}{}, formatErr
			}
			result, err := helpers.MCPSuccess(map[string]any{
				"data":     formattedRuns,
				"count":    count,
				"per_page": args.PerPage,
				"page":     args.Page,
				"total":    count,
			})
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}
