package tools

import (
	"context"
	"irmin-api/mcp/helpers"

	irmincore "github.com/IrminData/irmin-sdk-go/core-api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

type listScriptsArgs struct {
	WorkspaceSlug string `json:"workspace_slug" jsonschema:"required,The slug of the workspace to list scripts in"`
}

type getScriptContentArgs struct {
	WorkspaceSlug string `json:"workspace_slug" jsonschema:"required,The slug of the workspace to get the script content in"`
	ScriptPath    string `json:"script_path"    jsonschema:"required,The path of the script to get the content of, like 'examples/script.go' or 'hello-world.go'"`
}

type saveScriptArgs struct {
	WorkspaceSlug string `json:"workspace_slug" jsonschema:"required,The slug of the workspace to save the script in"`
	ScriptPath    string `json:"script_path"    jsonschema:"required,The path of the script to save, like 'examples/script.go' or 'hello-world.go'"`
	ScriptContent string `json:"script_content" jsonschema:"required,The content of the script to save"`
}

type executeScriptArgs struct {
	WorkspaceSlug string                        `json:"workspace_slug" jsonschema:"required,The slug of the workspace to execute the script in"`
	ScriptPath    string                        `json:"script_path"    jsonschema:"required,The path of the script to execute, like 'examples/script.go' or 'hello-world.go'"`
	Inputs        []irminmodels.ActionInputData `json:"inputs"         jsonschema:"required,The repository objects to pass to the script as inputs"`
}

func (mcpTools *MCPTools) RegisterScriptsTools() {
	mcpTools.registerListScriptsTool()
	mcpTools.registerGetScriptContentTool()
	mcpTools.registerSaveScriptTool()
	mcpTools.registerExecuteScriptTool()
}

// registerListScriptsTool registers the list_scripts tool for listing scripts in a workspace
func (mcpTools *MCPTools) registerListScriptsTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "list_scripts",
			Description: "List all scripts in the workspace. Scripts are stored in the editor and can be executed to perform actions. Scripts can accept input data files and return data files. Scripts can then either be executed seperately or be used in a workflow.",
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
				return nil, struct{}{}, err
			}

			// List the scripts in the root of the workspace
			scripts, err := mcpTools.apiServices.ListEditorItems(ctx, user, workspace, "")
			if err != nil {
				return nil, struct{}{}, err
			}

			result, err := helpers.MCPSuccess(scripts)
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
				return nil, struct{}{}, err
			}

			// Get the script content
			scriptContent, err := mcpTools.apiServices.GetEditorItemContent(
				ctx,
				user,
				workspace,
				args.ScriptPath,
			)
			if err != nil {
				return nil, struct{}{}, err
			}

			result, err := helpers.MCPSuccess(map[string]string{
				"path":    args.ScriptPath,
				"content": scriptContent,
			})
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}

// registerSaveScriptTool registers the save_script tool for saving a script in the workspace (create or update)
func (mcpTools *MCPTools) registerSaveScriptTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "save_script",
			Description: "Save a script in the workspace. Saving the script can mean creating a new script or updating an existing one. It's recommended to read the documentation for scripts first, use `list_docs` tool for more information.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args saveScriptArgs) (*sdkmcp.CallToolResult, struct{}, error) {
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

			// Save the script
			editorItem, err := mcpTools.apiServices.SaveEditorItem(
				ctx,
				user,
				workspace,
				args.ScriptPath,
				irmincore.CreateEditorItemRequest{
					Content: &args.ScriptContent,
					Type:    irmincore.EditorItemTypeFile,
				},
			)
			if err != nil {
				return nil, struct{}{}, err
			}

			result, err := helpers.MCPSuccess(editorItem)
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
				return nil, struct{}{}, err
			}

			// Execute the script
			scriptResult, err := mcpTools.apiServices.ExecuteEditorItem(
				ctx,
				user,
				workspace,
				args.ScriptPath,
				args.Inputs,
				"en",
			)
			if err != nil {
				return nil, struct{}{}, err
			}

			result, err := helpers.MCPSuccess(scriptResult)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}
