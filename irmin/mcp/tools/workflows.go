package tools

import (
	"context"
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
	WorkspaceSlug string                    `json:"workspace_slug" jsonschema:"required,The slug of the workspace to create a workflow in"`
	Workflow      irmincore.WorkflowRequest `json:"workflow"       jsonschema:"required,The workflow to create, with workflowable configuration and schedule"`
}

type updateWorkflowArgs struct {
	WorkspaceSlug string `json:"workspace_slug"          jsonschema:"required,The slug of the workspace to update the workflow in"`
	WorkflowID    string `json:"workflow_id"             jsonschema:"required,The ID of the workflow to update"`
	Name          string `json:"name"                    jsonschema:"required,The name of the workflow"`
	Description   string `json:"description,omitempty"   jsonschema:"optional,The description of the workflow"`
	Documentation string `json:"documentation,omitempty" jsonschema:"optional,The documentation of the workflow, in markdown format, to provide additional context"`
}

type updateWorkflowWorkflowableArgs struct {
	WorkspaceSlug string                   `json:"workspace_slug" jsonschema:"required,The slug of the workspace to update the workflow in"`
	WorkflowID    string                   `json:"workflow_id"    jsonschema:"required,The ID of the workflow to update"`
	Workflowable  irminmodels.Workflowable `json:"workflowable"   jsonschema:"required,The workflowable configuration to update"`
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

// registerListWorkflowsTool registers the list_workflows tool for listing workflows in a workspace
func (mcpTools *MCPTools) registerListWorkflowsTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "list_workflows",
			Description: "List workflows in a workspace. Workflows are used to orchestrate the execution of data ingestion, export, and other operations.",
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

// registerGetWorkflowTool registers the get_workflow tool for getting a workflow by ID
//
//nolint:dupl // This is not a duplicate, but the outline is similar to other tools
func (mcpTools *MCPTools) registerGetWorkflowTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "get_workflow",
			Description: "Get a workflow by ID.",
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

// registerCreateWorkflowTool registers the create_workflow tool for creating a new workflow
//
//nolint:dupl // This is not a duplicate, but the outline is similar to other tools
func (mcpTools *MCPTools) registerCreateWorkflowTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "create_workflow",
			Description: "Create a new workflow, with workflowable and schedule configuration. It's recommended to read the documentation for workflows first, use `list_docs` tool for more information.",
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

			// Create the workflow
			workflow, err := mcpTools.apiServices.CreateWorkflow(ctx, user, workspace, args.Workflow)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to create workflow", "error", err)
				return helpers.MCPError("Failed to create workflow"), struct{}{}, nil
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

// registerUpdateWorkflowTool registers the update_workflow tool for updating a workflow
func (mcpTools *MCPTools) registerUpdateWorkflowTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "update_workflow",
			Description: "Update the basic workflow configuration, like name and description, but not the workflowable or schedule configuration.",
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

// registerUpdateWorkflowableConfigTool registers the update_workflowable_config tool for updating the workflowable configuration of a workflow
func (mcpTools *MCPTools) registerUpdateWorkflowableConfigTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "update_workflowable_config",
			Description: "Update the workflowable configuration of a workflow.",
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

			// Update the workflowable configuration
			workflow, err = mcpTools.apiServices.UpdateWorkflowable(
				ctx,
				user,
				workspace,
				workflow,
				args.Workflowable,
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

// registerUpdateWorkflowScheduleTool registers the update_workflow_schedule tool for updating the schedule configuration of a workflow
func (mcpTools *MCPTools) registerUpdateWorkflowScheduleTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "update_workflow_schedule",
			Description: "Update the schedule configuration of a workflow.",
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
