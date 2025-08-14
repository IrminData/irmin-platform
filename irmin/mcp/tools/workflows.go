package tools

import (
	"context"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/lib"
	"irmin-api/mcp/helpers"

	irmincore "github.com/IrminData/irmin-sdk-go/core-api"
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
		func(ctx context.Context, _ *sdkmcp.ServerSession, params *sdkmcp.CallToolParamsFor[getWorkflowArgs]) (*sdkmcp.CallToolResultFor[struct{}], error) {
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

			// Get the workflow
			workflow, err := mcpTools.apiServices.GetWorkflow(ctx, user, workspace, params.Arguments.WorkflowID)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workflow", "error", err)
				return helpers.MCPError("Failed to get workflow"), nil
			}

			// Format the response using FormatWorkflowResponse
			workflowResponse, err := formatter.FormatWorkflowResponse(
				mcpTools.apiServices.DB,
				workflow,
				mcpTools.apiServices.SQIDManager,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Error formatting workflow response", "error", err)
				return helpers.MCPError("Error formatting workflow response"), nil
			}

			return helpers.MCPSuccess(workflowResponse)
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
			Description: "Create a new workflow, with workflowable and schedule configuration.",
		},
		func(ctx context.Context, _ *sdkmcp.ServerSession, params *sdkmcp.CallToolParamsFor[createWorkflowArgs]) (*sdkmcp.CallToolResultFor[struct{}], error) {
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

			// Create the workflow
			workflow, err := mcpTools.apiServices.CreateWorkflow(ctx, user, workspace, params.Arguments.Workflow)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to create workflow", "error", err)
				return helpers.MCPError("Failed to create workflow"), nil
			}

			// Format the response using FormatWorkflowResponse
			workflowResponse, err := formatter.FormatWorkflowResponse(
				mcpTools.apiServices.DB,
				workflow,
				mcpTools.apiServices.SQIDManager,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Error formatting workflow response", "error", err)
				return helpers.MCPError("Error formatting workflow response"), nil
			}

			return helpers.MCPSuccess(workflowResponse)
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
		func(ctx context.Context, _ *sdkmcp.ServerSession, params *sdkmcp.CallToolParamsFor[updateWorkflowArgs]) (*sdkmcp.CallToolResultFor[struct{}], error) {
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

			// Get the workflow
			workflow, err := mcpTools.apiServices.GetWorkflow(ctx, user, workspace, params.Arguments.WorkflowID)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workflow", "error", err)
				return helpers.MCPError("Failed to get workflow"), nil
			}

			// Update the workflow
			workflow, err = mcpTools.apiServices.UpdateWorkflow(
				ctx,
				user,
				workspace,
				workflow,
				irmincore.UpdateWorkflowRequest{
					Name:          params.Arguments.Name,
					Description:   params.Arguments.Description,
					Documentation: params.Arguments.Documentation,
				},
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to update workflow", "error", err)
				return helpers.MCPError("Failed to update workflow"), nil
			}

			// Format the response using FormatWorkflowResponse
			workflowResponse, err := formatter.FormatWorkflowResponse(
				mcpTools.apiServices.DB,
				workflow,
				mcpTools.apiServices.SQIDManager,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Error formatting workflow response", "error", err)
				return helpers.MCPError("Error formatting workflow response"), nil
			}

			return helpers.MCPSuccess(workflowResponse)
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
		func(ctx context.Context, _ *sdkmcp.ServerSession, params *sdkmcp.CallToolParamsFor[updateWorkflowWorkflowableArgs]) (*sdkmcp.CallToolResultFor[struct{}], error) {
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

			// Get the workflow
			workflow, err := mcpTools.apiServices.GetWorkflow(ctx, user, workspace, params.Arguments.WorkflowID)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workflow", "error", err)
				return helpers.MCPError("Failed to get workflow"), nil
			}

			// Update the workflowable configuration
			workflow, err = mcpTools.apiServices.UpdateWorkflowable(
				ctx,
				user,
				workspace,
				workflow,
				params.Arguments.Workflowable,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to update workflowable configuration", "error", err)
				return helpers.MCPError("Failed to update workflowable configuration"), nil
			}

			// Format the response using FormatWorkflowResponse
			workflowResponse, err := formatter.FormatWorkflowResponse(
				mcpTools.apiServices.DB,
				workflow,
				mcpTools.apiServices.SQIDManager,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Error formatting workflow response", "error", err)
				return helpers.MCPError("Error formatting workflow response"), nil
			}

			return helpers.MCPSuccess(workflowResponse)
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
		func(ctx context.Context, _ *sdkmcp.ServerSession, params *sdkmcp.CallToolParamsFor[updateWorkflowScheduleArgs]) (*sdkmcp.CallToolResultFor[struct{}], error) {
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

			// Get the workflow
			workflow, err := mcpTools.apiServices.GetWorkflow(ctx, user, workspace, params.Arguments.WorkflowID)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workflow", "error", err)
				return helpers.MCPError("Failed to get workflow"), nil
			}

			// Convert the schedule model to a database schedule
			schedule, err := lib.ScheduleModelToDBSchedule(
				&params.Arguments.Schedule,
				mcpTools.apiServices.DB,
				*workspace,
				mcpTools.apiServices.SQIDManager,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to convert schedule model to database schedule", "error", err)
				return helpers.MCPError("Failed to convert schedule model to database schedule"), nil
			}

			// Update the schedule configuration
			workflow, err = mcpTools.apiServices.UpdateWorkflowSchedule(ctx, user, workspace, workflow, schedule)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to update schedule configuration", "error", err)
				return helpers.MCPError("Failed to update schedule configuration"), nil
			}

			// Format the response using FormatWorkflowResponse
			workflowResponse, err := formatter.FormatWorkflowResponse(
				mcpTools.apiServices.DB,
				workflow,
				mcpTools.apiServices.SQIDManager,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Error formatting workflow response", "error", err)
				return helpers.MCPError("Error formatting workflow response"), nil
			}

			return helpers.MCPSuccess(workflowResponse)
		},
	)
}
