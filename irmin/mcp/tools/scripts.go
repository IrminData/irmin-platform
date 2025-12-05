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

// registerListScriptsTool registers the list_scripts tool for listing scripts in a workspace
//
//nolint:dupl // This tool is similar to other tools which list things, but for a different resource
func (mcpTools *MCPTools) registerListScriptsTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "list_scripts",
			Description: "List all scripts in the workspace. Scripts are stored scripts that can be executed to perform actions. Scripts can accept input data files and return data files. Scripts can then either be executed separately or be used in a workflow.",
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

// registerGetScriptContentTool registers the get_script_content tool for getting the content of a script in the workspace
func (mcpTools *MCPTools) registerGetScriptContentTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "get_script_content",
			Description: "Get the content of a script in the workspace. The script content is returned as a string.",
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

// registerCreateScriptTool registers the create_script tool for creating a new stored script
//
//nolint:dupl // Similar pattern to create_query tool, but for a different resource type
func (mcpTools *MCPTools) registerCreateScriptTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "create_script",
			Description: "Create a new stored script in a workspace. It's recommended to read the documentation for scripts first, use `retrieve_docs_context` tool for more information.",
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

// registerUpdateScriptTool registers the update_script tool for updating an existing stored script
func (mcpTools *MCPTools) registerUpdateScriptTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "update_script",
			Description: "Update an existing stored script. It's recommended to read the documentation for scripts first, use `retrieve_docs_context` tool for more information.",
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

// registerExecuteScriptTool registers the execute_script tool for executing a script in the workspace
func (mcpTools *MCPTools) registerExecuteScriptTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "execute_script",
			Description: "Execute a script in the workspace. The script will be executed and the output data, metadata and logs, such as errors, will be returned.",
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
