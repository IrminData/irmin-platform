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
		func(ctx context.Context, _ *sdkmcp.ServerSession, params *sdkmcp.CallToolParamsFor[listScriptsArgs]) (*sdkmcp.CallToolResultFor[struct{}], error) {
			// Validate user
			user, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, err
			}

			// Get the workspace
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, params.Arguments.WorkspaceSlug)
			if err != nil {
				return nil, err
			}

			// List the scripts in the root of the workspace
			scripts, err := mcpTools.apiServices.ListEditorItems(ctx, user, workspace, "")
			if err != nil {
				return nil, err
			}

			return helpers.MCPSuccess(scripts)
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
		func(ctx context.Context, _ *sdkmcp.ServerSession, params *sdkmcp.CallToolParamsFor[getScriptContentArgs]) (*sdkmcp.CallToolResultFor[struct{}], error) {
			// Validate user
			user, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, err
			}

			// Get the workspace
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, params.Arguments.WorkspaceSlug)
			if err != nil {
				return nil, err
			}

			// Get the script content
			scriptContent, err := mcpTools.apiServices.GetEditorItemContent(
				ctx,
				user,
				workspace,
				params.Arguments.ScriptPath,
			)
			if err != nil {
				return nil, err
			}

			return helpers.MCPSuccess(map[string]string{
				"path":    params.Arguments.ScriptPath,
				"content": scriptContent,
			})
		},
	)
}

// registerSaveScriptTool registers the save_script tool for saving a script in the workspace (create or update)
func (mcpTools *MCPTools) registerSaveScriptTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "save_script",
			Description: "Save a script in the workspace. Saving the script can mean creating a new script or updating an existing one.",
		},
		func(ctx context.Context, _ *sdkmcp.ServerSession, params *sdkmcp.CallToolParamsFor[saveScriptArgs]) (*sdkmcp.CallToolResultFor[struct{}], error) {
			// Validate user
			user, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, err
			}

			// Get the workspace
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, params.Arguments.WorkspaceSlug)
			if err != nil {
				return nil, err
			}

			// Save the script
			editorItem, err := mcpTools.apiServices.SaveEditorItem(
				ctx,
				user,
				workspace,
				params.Arguments.ScriptPath,
				irmincore.CreateEditorItemRequest{
					Content: &params.Arguments.ScriptContent,
					Type:    irmincore.EditorItemTypeFile,
				},
			)
			if err != nil {
				return nil, err
			}

			return helpers.MCPSuccess(editorItem)
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
		func(ctx context.Context, _ *sdkmcp.ServerSession, params *sdkmcp.CallToolParamsFor[executeScriptArgs]) (*sdkmcp.CallToolResultFor[struct{}], error) {
			// Validate user
			user, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, err
			}

			// Get the workspace
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, params.Arguments.WorkspaceSlug)
			if err != nil {
				return nil, err
			}

			// Execute the script
			scriptResult, err := mcpTools.apiServices.ExecuteEditorItem(
				ctx,
				user,
				workspace,
				params.Arguments.ScriptPath,
				params.Arguments.Inputs,
				"en",
			)
			if err != nil {
				return nil, err
			}

			return helpers.MCPSuccess(scriptResult)
		},
	)
}
