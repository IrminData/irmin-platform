package tools

import (
	"context"
	"encoding/json"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/lib"
	"irmin-api/mcp/helpers"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	irminsqids "github.com/IrminData/irmin-sdk-go/sqids"
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

type listWorkflowsArgs struct {
	WorkspaceSlug string `json:"workspace_slug" jsonschema:"required,The slug of the workspace to list workflows in"`
}

type getWorkflowArgs struct {
	WorkspaceSlug string `json:"workspace_slug" jsonschema:"required,The slug of the workspace to get a workflow from"`
	WorkflowID    string `json:"workflow_id"    jsonschema:"required,The ID of the workflow to get"`
}

type createWorkflowArgs struct {
	WorkspaceSlug string `json:"workspace_slug" jsonschema:"required,The slug of the workspace to create a workflow in"`
	WorkflowJSON  string `json:"workflow"       jsonschema:"required,The workflow to create as JSON string, with workflowable configuration and schedule"`
}

type updateWorkflowArgs struct {
	WorkspaceSlug string  `json:"workspace_slug"          jsonschema:"required,The slug of the workspace to update the workflow in"`
	WorkflowID    string  `json:"workflow_id"             jsonschema:"required,The ID of the workflow to update"`
	Name          *string `json:"name,omitempty"          jsonschema:"optional,The name of the workflow"`
	Description   *string `json:"description,omitempty"   jsonschema:"optional,The description of the workflow"`
	Documentation *string `json:"documentation,omitempty" jsonschema:"optional,The documentation of the workflow, in markdown format, to provide additional context"`
}

type updateWorkflowWorkflowableArgs struct {
	WorkspaceSlug    string `json:"workspace_slug" jsonschema:"required,The slug of the workspace to update the workflow in"`
	WorkflowID       string `json:"workflow_id"    jsonschema:"required,The ID of the workflow to update"`
	WorkflowableJSON string `json:"workflowable"   jsonschema:"required,The workflowable configuration to update as JSON string"`
}

type updateWorkflowScheduleArgs struct {
	WorkspaceSlug string               `json:"workspace_slug" jsonschema:"required,The slug of the workspace to update the workflow in"`
	WorkflowID    string               `json:"workflow_id"    jsonschema:"required,The ID of the workflow to update"`
	Schedule      irminmodels.Schedule `json:"schedule"       jsonschema:"required,The schedule configuration to update"`
}

// RegisterWorkflowsTools registers all workflows-related tools.
func (mcpTools *MCPTools) RegisterWorkflowsTools() {
	mcpTools.registerListWorkflowsTool()
	mcpTools.registerGetWorkflowTool()
	mcpTools.registerCreateWorkflowTool()
	mcpTools.registerUpdateWorkflowTool()
	mcpTools.registerUpdateWorkflowableConfigTool()
	mcpTools.registerUpdateWorkflowScheduleTool()
}

// registerListWorkflowsTool registers the irmin_list_workflows tool for listing workflows in a workspace
func (mcpTools *MCPTools) registerListWorkflowsTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_list_workflows",
			Description: "List all workflows in a workspace. Workflows orchestrate automated data operations like data ingestion from connections, script execution, and data transformations on schedules or triggers. Returns an array of workflow objects with ID, name, workflowable configuration, schedule, execution status, and metadata. Requires workspace_slug. Use this to discover existing automation before creating new workflows or triggering executions.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args listWorkflowsArgs) (*sdkmcp.CallToolResult, struct{}, error) {
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

			// List the workflows
			workflows, err := mcpTools.apiServices.ListWorkflows(ctx, user, workspace, "")
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to list workflows", "error", err)
				return helpers.MCPError("Failed to list workflows"), struct{}{}, nil
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
				return helpers.MCPError("Error formatting workflow response"), struct{}{}, nil
			}

			result, err := helpers.MCPSuccess(workflowsResponse)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}

// registerGetWorkflowTool registers the irmin_get_workflow tool for getting a workflow by ID
//

func (mcpTools *MCPTools) registerGetWorkflowTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_get_workflow",
			Description: "Retrieve detailed information about a specific workflow including its configuration, schedule, last execution status, and complete workflowable definition. Returns comprehensive workflow object with execution history. Requires workspace_slug and workflow_id (SQID). Use this to inspect workflow configuration before modifying it or to debug execution issues.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args getWorkflowArgs) (*sdkmcp.CallToolResult, struct{}, error) {
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

			// Get the workflow
			workflow, err := mcpTools.apiServices.GetWorkflow(ctx, user, workspace, args.WorkflowID)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workflow", "error", err)
				return helpers.MCPError("Failed to get workflow"), struct{}{}, nil
			}

			// Format the response using FormatWorkflowResponse
			workflowResponse, err := formatter.FormatWorkflowResponse(
				mcpTools.apiServices.DB,
				workflow,
				mcpTools.apiServices.SQIDManager,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Error formatting workflow response", "error", err)
				return helpers.MCPError("Error formatting workflow response"), struct{}{}, nil
			}

			result, err := helpers.MCPSuccess(workflowResponse)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}

// registerCreateWorkflowTool registers the irmin_create_workflow tool for creating a new workflow
//

func (mcpTools *MCPTools) registerCreateWorkflowTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_create_workflow",
			Description: "Create a new automated workflow with workflowable action and schedule configuration. Workflows can pull data from connections, execute scripts, or perform other data operations on a schedule. Requires workspace_slug and workflow parameters (name, workflowable config, schedule). Returns the created workflow object. Use irmin_retrieve_docs_context with 'irmin' collection to learn about workflow types and configuration options before creating.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args createWorkflowArgs) (*sdkmcp.CallToolResult, struct{}, error) {
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

			// Parse the workflow from JSON string
			var workflow irmincore.WorkflowRequest
			if unmarshalErr := json.Unmarshal([]byte(args.WorkflowJSON), &workflow); unmarshalErr != nil {
				mcpTools.apiServices.Logger.Error("Failed to parse workflow JSON", "error", unmarshalErr)
				return helpers.MCPError(
					"Failed to parse workflow JSON: " + unmarshalErr.Error(),
				), struct{}{}, nil
			}

			// Create the workflow
			createdWorkflow, err := mcpTools.apiServices.CreateWorkflow(ctx, user, workspace, workflow)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to create workflow", "error", err)
				return helpers.MCPError("Failed to create workflow"), struct{}{}, nil
			}

			// Format the response using FormatWorkflowResponse
			workflowResponse, err := formatter.FormatWorkflowResponse(
				mcpTools.apiServices.DB,
				createdWorkflow,
				mcpTools.apiServices.SQIDManager,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Error formatting workflow response", "error", err)
				return helpers.MCPError("Error formatting workflow response"), struct{}{}, nil
			}

			result, err := helpers.MCPSuccess(workflowResponse)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}

// registerUpdateWorkflowTool registers the irmin_update_workflow tool for updating a workflow
func (mcpTools *MCPTools) registerUpdateWorkflowTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_update_workflow",
			Description: "Update basic workflow metadata including name, description, and documentation. Does not modify the workflowable action or schedule configuration - use dedicated tools for those. Requires workspace_slug, workflow_id (SQID), and update parameters. Returns the updated workflow object. Use this to maintain clear documentation for workflows.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args updateWorkflowArgs) (*sdkmcp.CallToolResult, struct{}, error) {
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

			// Get the workflow
			workflow, err := mcpTools.apiServices.GetWorkflow(ctx, user, workspace, args.WorkflowID)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workflow", "error", err)
				return helpers.MCPError("Failed to get workflow"), struct{}{}, nil
			}

			// Update the workflow
			workflow, err = mcpTools.apiServices.UpdateWorkflow(
				ctx,
				user,
				workspace,
				workflow,
				irmincore.UpdateWorkflowRequest{
					Name:          args.Name,
					Description:   args.Description,
					Documentation: args.Documentation,
				},
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to update workflow", "error", err)
				return helpers.MCPError("Failed to update workflow"), struct{}{}, nil
			}

			// Format the response using FormatWorkflowResponse
			workflowResponse, err := formatter.FormatWorkflowResponse(
				mcpTools.apiServices.DB,
				workflow,
				mcpTools.apiServices.SQIDManager,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Error formatting workflow response", "error", err)
				return helpers.MCPError("Error formatting workflow response"), struct{}{}, nil
			}

			result, err := helpers.MCPSuccess(workflowResponse)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}

// registerUpdateWorkflowableConfigTool registers the irmin_update_workflowable_config tool for updating the workflowable configuration of a workflow
func (mcpTools *MCPTools) registerUpdateWorkflowableConfigTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_update_workflowable_config",
			Description: "Update the workflowable action configuration of a workflow, changing what operation it performs. Workflowable defines the actual action (data pull, script execution, etc.) and its parameters. Requires workspace_slug, workflow_id (SQID), and new workflowable configuration. Returns the updated workflow object. Use this to modify workflow behavior while preserving schedule and metadata.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args updateWorkflowWorkflowableArgs) (*sdkmcp.CallToolResult, struct{}, error) {
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

			// Get the workflow
			workflow, err := mcpTools.apiServices.GetWorkflow(ctx, user, workspace, args.WorkflowID)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workflow", "error", err)
				return helpers.MCPError("Failed to get workflow"), struct{}{}, nil
			}

			// Parse the workflowable from JSON string
			var workflowable irminmodels.Workflowable
			if unmarshalErr := json.Unmarshal([]byte(args.WorkflowableJSON), &workflowable); unmarshalErr != nil {
				mcpTools.apiServices.Logger.Error("Failed to parse workflowable JSON", "error", unmarshalErr)
				return helpers.MCPError(
					"Failed to parse workflowable JSON: " + unmarshalErr.Error(),
				), struct{}{}, nil
			}

			// Update the workflowable configuration
			workflow, err = mcpTools.apiServices.UpdateWorkflowable(
				ctx,
				user,
				workspace,
				workflow,
				workflowable,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to update workflowable configuration", "error", err)
				return helpers.MCPError("Failed to update workflowable configuration"), struct{}{}, nil
			}

			// Format the response using FormatWorkflowResponse
			workflowResponse, err := formatter.FormatWorkflowResponse(
				mcpTools.apiServices.DB,
				workflow,
				mcpTools.apiServices.SQIDManager,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Error formatting workflow response", "error", err)
				return helpers.MCPError("Error formatting workflow response"), struct{}{}, nil
			}

			result, err := helpers.MCPSuccess(workflowResponse)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}

// registerUpdateWorkflowScheduleTool registers the irmin_update_workflow_schedule tool for updating the schedule configuration of a workflow
func (mcpTools *MCPTools) registerUpdateWorkflowScheduleTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_update_workflow_schedule",
			Description: "Update the execution schedule of a workflow, controlling when and how often it runs. Supports cron expressions, fixed intervals, and manual-only triggers. Requires workspace_slug, workflow_id (SQID), and new schedule configuration. Returns the updated workflow object. Use this to adjust workflow timing without changing what it does.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args updateWorkflowScheduleArgs) (*sdkmcp.CallToolResult, struct{}, error) {
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

			// Get the workflow
			workflow, err := mcpTools.apiServices.GetWorkflow(ctx, user, workspace, args.WorkflowID)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workflow", "error", err)
				return helpers.MCPError("Failed to get workflow"), struct{}{}, nil
			}

			// Convert the schedule model to a database schedule
			schedule, err := lib.ScheduleModelToDBSchedule(
				&args.Schedule,
				mcpTools.apiServices.DB,
				*workspace,
				mcpTools.apiServices.SQIDManager,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to convert schedule model to database schedule", "error", err)
				return helpers.MCPError("Failed to convert schedule model to database schedule"), struct{}{}, nil
			}

			// Update the schedule configuration
			workflow, err = mcpTools.apiServices.UpdateWorkflowSchedule(ctx, user, workspace, workflow, schedule)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to update schedule configuration", "error", err)
				return helpers.MCPError("Failed to update schedule configuration"), struct{}{}, nil
			}

			// Format the response using FormatWorkflowResponse
			workflowResponse, err := formatter.FormatWorkflowResponse(
				mcpTools.apiServices.DB,
				workflow,
				mcpTools.apiServices.SQIDManager,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Error formatting workflow response", "error", err)
				return helpers.MCPError("Error formatting workflow response"), struct{}{}, nil
			}

			result, err := helpers.MCPSuccess(workflowResponse)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}
