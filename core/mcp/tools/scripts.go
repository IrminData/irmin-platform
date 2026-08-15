package tools

import (
	"context"
	"fmt"
	"irmin-api/formatter"
	"irmin-api/mcp/helpers"

	"irmin-api/toolregistry"

	irmincore "github.com/IrminData/irmin-platform/sdks/go/api"
	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

type listScriptsArgs struct {
	WorkspaceSlug string `json:"workspace_slug" jsonschema:"required,The slug of the workspace to list scripts in"`
}

type getScriptContentArgs struct {
	WorkspaceSlug string `json:"workspace_slug" jsonschema:"required,The slug of the workspace to get the script content in"`
	ScriptID      string `json:"script_id"      jsonschema:"required,The ID (SQID) of the script to get the content of"`
}

type createScriptArgs struct {
	WorkspaceSlug string                        `json:"workspace_slug" jsonschema:"required,The slug of the workspace to create the script in"`
	Request       irmincore.CreateScriptRequest `json:"request"        jsonschema:"required,Script creation parameters"`
}

type updateScriptArgs struct {
	WorkspaceSlug string                        `json:"workspace_slug" jsonschema:"required,The slug of the workspace"`
	ScriptID      string                        `json:"script_id"      jsonschema:"required,The ID (SQID) of the script to update"`
	Request       irmincore.UpdateScriptRequest `json:"request"        jsonschema:"required,Script update parameters"`
}

type executeScriptArgs struct {
	WorkspaceSlug string                        `json:"workspace_slug" jsonschema:"required,The slug of the workspace to execute the script in"`
	ScriptID      string                        `json:"script_id"      jsonschema:"required,The ID (SQID) of the script to execute"`
	Inputs        []irminmodels.ActionInputData `json:"inputs"         jsonschema:"required,The repository objects to pass to the script as inputs"`
}

func (mcpTools *MCPTools) RegisterScriptsTools() {
	mcpTools.registerListScriptsTool()
	mcpTools.registerGetScriptContentTool()
	mcpTools.registerCreateScriptTool()
	mcpTools.registerUpdateScriptTool()
	mcpTools.registerExecuteScriptTool()
}

// registerListScriptsTool registers the irmin_script_list tool for listing scripts in a workspace
//
//nolint:dupl // This tool is similar to other tools which list things, but for a different resource
func (mcpTools *MCPTools) registerListScriptsTool() {
	toolregistry.Register(
		mcpTools.registry,
		mcpTools.server,

		"irmin_script_list",
		"List all stored scripts in a workspace. Scripts are reusable Python or JavaScript code that can process data objects and be used in workflows or executed standalone. Returns an array of script objects with ID, name, language, input/output schema, and metadata. Requires workspace_slug. Use this to discover available scripts for data transformation workflows.",

		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args listScriptsArgs) (*sdkmcp.CallToolResult, toolregistry.ToolOutput, error) {
			// Validate user
			user, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, toolregistry.ToolOutput{}, err
			}

			// Get the workspace
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, args.WorkspaceSlug)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workspace", "error", err)
				return helpers.MCPError("Failed to get workspace"), toolregistry.ToolOutput{}, nil
			}

			// List the scripts in the workspace
			scripts, err := mcpTools.apiServices.ListWorkspaceScripts(ctx, user, workspace)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to list scripts", "error", err)
				return helpers.MCPError("Failed to list scripts"), toolregistry.ToolOutput{}, nil
			}

			// Format the response using the same formatter as the API
			formatted, ferr := formatter.FormatIndexResponse(
				scripts,
				formatter.FormatStoredScriptResponse,
				mcpTools.apiServices.SQIDManager,
			)
			if ferr != nil {
				mcpTools.apiServices.Logger.Error("Failed to format scripts", "error", ferr)
				return nil, toolregistry.ToolOutput{}, fmt.Errorf("failed to format scripts response: %w", ferr)
			}

			result, resultOutput, err := helpers.MCPSuccess(formatted)
			if err != nil {
				return nil, toolregistry.ToolOutput{}, err
			}
			return result, resultOutput, nil
		},
	)
}

// registerGetScriptContentTool registers the irmin_script_content_get tool for getting the content of a script in the workspace
func (mcpTools *MCPTools) registerGetScriptContentTool() {
	toolregistry.Register(
		mcpTools.registry,
		mcpTools.server,

		"irmin_script_content_get",
		"Retrieve the source code of a stored script. Returns the complete script content as a string along with script ID and name. Requires workspace_slug and script_id (SQID). Use this to inspect, debug, or understand script logic before execution or modification.",

		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args getScriptContentArgs) (*sdkmcp.CallToolResult, toolregistry.ToolOutput, error) {
			// Validate user
			user, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, toolregistry.ToolOutput{}, err
			}

			// Get the workspace
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, args.WorkspaceSlug)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workspace", "error", err)
				return helpers.MCPError("Failed to get workspace"), toolregistry.ToolOutput{}, nil
			}

			// Get the script by SQID
			script, err := mcpTools.apiServices.GetScript(ctx, user, workspace, args.ScriptID)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get script", "error", err)
				return helpers.MCPError("Failed to get script"), toolregistry.ToolOutput{}, nil
			}

			// Format the script to get the SQID
			formatted, ferr := formatter.FormatStoredScriptResponse(script, mcpTools.apiServices.SQIDManager)
			if ferr != nil {
				mcpTools.apiServices.Logger.Error("Failed to format script", "error", ferr)
				return nil, toolregistry.ToolOutput{}, fmt.Errorf("failed to format script response: %w", ferr)
			}

			// Return the script content
			content := ""
			if formatted.Content != nil {
				content = *formatted.Content
			}

			result, resultOutput, err := helpers.MCPSuccess(map[string]any{
				"id":      formatted.ID,
				"name":    formatted.Name,
				"content": content,
			})
			if err != nil {
				return nil, toolregistry.ToolOutput{}, err
			}
			return result, resultOutput, nil
		},
	)
}

// registerCreateScriptTool registers the irmin_script_create tool for creating a new stored script
//
//nolint:dupl // Similar pattern to create_query tool, but for a different resource type
func (mcpTools *MCPTools) registerCreateScriptTool() {
	toolregistry.Register(
		mcpTools.registry,
		mcpTools.server,

		"irmin_script_create",
		"Create a new stored script for data transformation or processing. Scripts can be Python or JavaScript code that accepts data object inputs and produces outputs. Requires workspace_slug and script parameters (name, language, content, input/output schema). Returns the created script object with unique ID. Use irmin_documentation_retrieve with 'irmin' collection to learn about script capabilities and sandbox environment before creating.",

		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args createScriptArgs) (*sdkmcp.CallToolResult, toolregistry.ToolOutput, error) {
			// Validate user
			user, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, toolregistry.ToolOutput{}, err
			}

			// Get the workspace first
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, args.WorkspaceSlug)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workspace", "error", err)
				return helpers.MCPError("Failed to get workspace"), toolregistry.ToolOutput{}, nil
			}

			// Create the script
			script, err := mcpTools.apiServices.CreateScript(
				ctx,
				user,
				workspace,
				args.Request,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("script creation failed", "error", err)
				return helpers.MCPError("Script creation failed"), toolregistry.ToolOutput{}, nil
			}

			// Format the response using the same formatter as the API
			formatted, ferr := formatter.FormatStoredScriptResponse(script, mcpTools.apiServices.SQIDManager)
			if ferr != nil {
				mcpTools.apiServices.Logger.Error("Failed to format script", "error", ferr)
				return nil, toolregistry.ToolOutput{}, fmt.Errorf("failed to format script response: %w", ferr)
			}

			result, resultOutput, err := helpers.MCPSuccess(formatted)
			if err != nil {
				return nil, toolregistry.ToolOutput{}, err
			}
			return result, resultOutput, nil
		},
	)
}

// registerUpdateScriptTool registers the irmin_script_update tool for updating an existing stored script
func (mcpTools *MCPTools) registerUpdateScriptTool() {
	toolregistry.Register(
		mcpTools.registry,
		mcpTools.server,

		"irmin_script_update",
		"Modify an existing stored script's code, name, description, or input/output schema. Useful for fixing bugs, adding features, or adjusting script configuration. Requires workspace_slug, script_id (SQID), and update parameters. Returns the updated script object. Use irmin_documentation_retrieve with 'irmin' collection for script development guidance.",

		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args updateScriptArgs) (*sdkmcp.CallToolResult, toolregistry.ToolOutput, error) {
			user, ok := mcpTools.getUser(ctx)
			if !ok || user == nil || user.ID == 0 {
				return helpers.MCPError("Unauthorized"), toolregistry.ToolOutput{}, nil
			}

			// Get the workspace first
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, args.WorkspaceSlug)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workspace", "error", err)
				return helpers.MCPError("Failed to get workspace"), toolregistry.ToolOutput{}, nil
			}

			// Get the script by SQID
			script, err := mcpTools.apiServices.GetScript(
				ctx,
				user,
				workspace,
				args.ScriptID,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get script", "error", err)
				return helpers.MCPError("Failed to get script"), toolregistry.ToolOutput{}, nil
			}

			// Update the script
			updatedScript, err := mcpTools.apiServices.UpdateScript(
				ctx,
				user,
				workspace,
				script,
				args.Request,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("script update failed", "error", err)
				return helpers.MCPError("Script update failed"), toolregistry.ToolOutput{}, nil
			}

			// Format the response using the same formatter as the API
			formatted, ferr := formatter.FormatStoredScriptResponse(updatedScript, mcpTools.apiServices.SQIDManager)
			if ferr != nil {
				mcpTools.apiServices.Logger.Error("Failed to format script", "error", ferr)
				return nil, toolregistry.ToolOutput{}, fmt.Errorf("failed to format script response: %w", ferr)
			}

			result, resultOutput, err := helpers.MCPSuccess(formatted)
			if err != nil {
				return nil, toolregistry.ToolOutput{}, err
			}
			return result, resultOutput, nil
		},
	)
}

// registerExecuteScriptTool registers the irmin_script_execute tool for executing a script in the workspace
func (mcpTools *MCPTools) registerExecuteScriptTool() {
	toolregistry.Register(
		mcpTools.registry,
		mcpTools.server,

		"irmin_script_execute",
		"Execute a stored script with provided data object inputs in a secure sandbox. Scripts run with resource limits and return output data, metadata, and execution logs including any errors. Requires workspace_slug, script_id (SQID), and inputs array (repository object references). Returns execution results with output data and logs. Use this to transform data, validate data quality, or perform custom data processing operations.",

		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args executeScriptArgs) (*sdkmcp.CallToolResult, toolregistry.ToolOutput, error) {
			// Validate user
			user, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, toolregistry.ToolOutput{}, err
			}

			// Get the workspace
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, args.WorkspaceSlug)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workspace", "error", err)
				return helpers.MCPError("Failed to get workspace"), toolregistry.ToolOutput{}, nil
			}

			// Get the script by SQID
			script, err := mcpTools.apiServices.GetScript(
				ctx,
				user,
				workspace,
				args.ScriptID,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get script", "error", err)
				return helpers.MCPError("Failed to get script"), toolregistry.ToolOutput{}, nil
			}

			// Execute the script
			scriptResult, err := mcpTools.apiServices.ExecuteScript(
				ctx,
				user,
				workspace,
				script,
				irmincore.ExecuteScriptRequest{
					Input: args.Inputs,
				},
				true, // Always limit response for MCP
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("script execution failed", "error", err)
				return helpers.MCPError("Script execution failed"), toolregistry.ToolOutput{}, nil
			}

			result, resultOutput, err := helpers.MCPSuccess(scriptResult)
			if err != nil {
				return nil, toolregistry.ToolOutput{}, err
			}
			return result, resultOutput, nil
		},
	)
}
