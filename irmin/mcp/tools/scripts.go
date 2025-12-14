package tools

import (
	"context"
	"fmt"
	"irmin-api/formatter"
	"irmin-api/mcp/helpers"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
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

// registerListScriptsTool registers the irmin_list_scripts tool for listing scripts in a workspace
//
//nolint:dupl // This tool is similar to other tools which list things, but for a different resource
func (mcpTools *MCPTools) registerListScriptsTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_list_scripts",
			Description: "List all stored scripts in a workspace. Scripts are reusable Python or JavaScript code that can process data objects and be used in workflows or executed standalone. Returns an array of script objects with ID, name, language, input/output schema, and metadata. Requires workspace_slug. Use this to discover available scripts for data transformation workflows.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args listScriptsArgs) (*sdkmcp.CallToolResult, struct{}, error) {
			// Validate user
			user, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, struct{}{}, err
			}

			// Get the workspace
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, args.WorkspaceSlug)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workspace", "error", err)
				return helpers.MCPError("Failed to get workspace"), struct{}{}, nil
			}

			// List the scripts in the workspace
			scripts, err := mcpTools.apiServices.ListWorkspaceScripts(ctx, user, workspace)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to list scripts", "error", err)
				return helpers.MCPError("Failed to list scripts"), struct{}{}, nil
			}

			// Format the response using the same formatter as the API
			formatted, ferr := formatter.FormatIndexResponse(
				scripts,
				formatter.FormatStoredScriptResponse,
				mcpTools.apiServices.SQIDManager,
			)
			if ferr != nil {
				mcpTools.apiServices.Logger.Error("Failed to format scripts", "error", ferr)
				return nil, struct{}{}, fmt.Errorf("failed to format scripts response: %w", ferr)
			}

			result, err := helpers.MCPSuccess(formatted)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}

// registerGetScriptContentTool registers the irmin_get_script_content tool for getting the content of a script in the workspace
func (mcpTools *MCPTools) registerGetScriptContentTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_get_script_content",
			Description: "Retrieve the source code of a stored script. Returns the complete script content as a string along with script ID and name. Requires workspace_slug and script_id (SQID). Use this to inspect, debug, or understand script logic before execution or modification.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args getScriptContentArgs) (*sdkmcp.CallToolResult, struct{}, error) {
			// Validate user
			user, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, struct{}{}, err
			}

			// Get the workspace
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, args.WorkspaceSlug)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workspace", "error", err)
				return helpers.MCPError("Failed to get workspace"), struct{}{}, nil
			}

			// Get the script by SQID
			script, err := mcpTools.apiServices.GetScript(ctx, user, workspace, args.ScriptID)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get script", "error", err)
				return helpers.MCPError("Failed to get script"), struct{}{}, nil
			}

			// Format the script to get the SQID
			formatted, ferr := formatter.FormatStoredScriptResponse(script, mcpTools.apiServices.SQIDManager)
			if ferr != nil {
				mcpTools.apiServices.Logger.Error("Failed to format script", "error", ferr)
				return nil, struct{}{}, fmt.Errorf("failed to format script response: %w", ferr)
			}

			// Return the script content
			content := ""
			if formatted.Content != nil {
				content = *formatted.Content
			}

			result, err := helpers.MCPSuccess(map[string]any{
				"id":      formatted.ID,
				"name":    formatted.Name,
				"content": content,
			})
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}

// registerCreateScriptTool registers the irmin_create_script tool for creating a new stored script
//
//nolint:dupl // Similar pattern to create_query tool, but for a different resource type
func (mcpTools *MCPTools) registerCreateScriptTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_create_script",
			Description: "Create a new stored script for data transformation or processing. Scripts can be Python or JavaScript code that accepts data object inputs and produces outputs. Requires workspace_slug and script parameters (name, language, content, input/output schema). Returns the created script object with unique ID. Use irmin_retrieve_docs_context with 'irmin' collection to learn about script capabilities and sandbox environment before creating.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args createScriptArgs) (*sdkmcp.CallToolResult, struct{}, error) {
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

			// Create the script
			script, err := mcpTools.apiServices.CreateScript(
				ctx,
				user,
				workspace,
				args.Request,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("script creation failed", "error", err)
				return helpers.MCPError("Script creation failed"), struct{}{}, nil
			}

			// Format the response using the same formatter as the API
			formatted, ferr := formatter.FormatStoredScriptResponse(script, mcpTools.apiServices.SQIDManager)
			if ferr != nil {
				mcpTools.apiServices.Logger.Error("Failed to format script", "error", ferr)
				return nil, struct{}{}, fmt.Errorf("failed to format script response: %w", ferr)
			}

			result, err := helpers.MCPSuccess(formatted)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}

// registerUpdateScriptTool registers the irmin_update_script tool for updating an existing stored script
func (mcpTools *MCPTools) registerUpdateScriptTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_update_script",
			Description: "Modify an existing stored script's code, name, description, or input/output schema. Useful for fixing bugs, adding features, or adjusting script configuration. Requires workspace_slug, script_id (SQID), and update parameters. Returns the updated script object. Use irmin_retrieve_docs_context with 'irmin' collection for script development guidance.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args updateScriptArgs) (*sdkmcp.CallToolResult, struct{}, error) {
			user, ok := mcpTools.getUser(ctx)
			if !ok || user == nil || user.ID == 0 {
				return helpers.MCPError("Unauthorized"), struct{}{}, nil
			}

			// Get the workspace first
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, args.WorkspaceSlug)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workspace", "error", err)
				return helpers.MCPError("Failed to get workspace"), struct{}{}, nil
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
				return helpers.MCPError("Failed to get script"), struct{}{}, nil
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
				return helpers.MCPError("Script update failed"), struct{}{}, nil
			}

			// Format the response using the same formatter as the API
			formatted, ferr := formatter.FormatStoredScriptResponse(updatedScript, mcpTools.apiServices.SQIDManager)
			if ferr != nil {
				mcpTools.apiServices.Logger.Error("Failed to format script", "error", ferr)
				return nil, struct{}{}, fmt.Errorf("failed to format script response: %w", ferr)
			}

			result, err := helpers.MCPSuccess(formatted)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}

// registerExecuteScriptTool registers the irmin_execute_script tool for executing a script in the workspace
func (mcpTools *MCPTools) registerExecuteScriptTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_execute_script",
			Description: "Execute a stored script with provided data object inputs in a secure sandbox. Scripts run with resource limits and return output data, metadata, and execution logs including any errors. Requires workspace_slug, script_id (SQID), and inputs array (repository object references). Returns execution results with output data and logs. Use this to transform data, validate data quality, or perform custom data processing operations.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args executeScriptArgs) (*sdkmcp.CallToolResult, struct{}, error) {
			// Validate user
			user, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, struct{}{}, err
			}

			// Get the workspace
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, args.WorkspaceSlug)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workspace", "error", err)
				return helpers.MCPError("Failed to get workspace"), struct{}{}, nil
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
				return helpers.MCPError("Failed to get script"), struct{}{}, nil
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
				return helpers.MCPError("Script execution failed"), struct{}{}, nil
			}

			result, err := helpers.MCPSuccess(scriptResult)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}
