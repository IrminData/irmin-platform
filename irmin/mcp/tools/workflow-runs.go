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

// registerCreateWorkflowRunTool registers the irmin_create_workflow_run tool for creating a new workflow run
func (mcpTools *MCPTools) registerCreateWorkflowRunTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_create_workflow_run",
			Description: "Manually trigger a workflow execution, creating a new workflow run. The workflow executes asynchronously in the background with progress tracked through status updates and logs. Returns the created workflow run object with execution ID and initial status. Requires workspace_slug and workflow_id (SQID). Use irmin_list_workflow_runs to monitor execution progress and view logs.",
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

// registerCancelWorkflowRunTool registers the irmin_cancel_workflow_run tool for cancelling a workflow run
func (mcpTools *MCPTools) registerCancelWorkflowRunTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_cancel_workflow_run",
			Description: "Cancel a currently executing or queued workflow run. Stops the workflow execution and marks the run as cancelled. Cannot cancel completed or failed runs. Requires workspace_slug, workflow_id (SQID), and run_id (SQID). Returns the updated workflow run object with cancelled status. Use this to stop long-running workflows or abort queued executions.",
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

// registerListWorkflowRunsTool registers the irmin_list_workflow_runs tool for listing workflow runs in a workspace
func (mcpTools *MCPTools) registerListWorkflowRunsTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_list_workflow_runs",
			Description: "List execution history for a specific workflow showing all workflow runs. Returns an array of workflow run objects with execution status (queued, running, completed, failed, cancelled), start/end timestamps, duration, logs, and error details. Supports pagination via per_page and page parameters. Requires workspace_slug and workflow_id (SQID). Use this to monitor workflow execution history, debug failures, or verify successful data operations.",
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
