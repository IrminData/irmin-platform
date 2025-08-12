package tools

import (
	"context"
	"encoding/json"

	"irmin-api/formatter"
	"irmin-api/mcp/helpers"

	irmincore "github.com/IrminData/irmin-sdk-go/core-api"
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

type createRepositoryArgs struct {
	WorkspaceSlug string                            `json:"workspace_slug" jsonschema:"required,The slug of the workspace to create the repository in"`
	Repository    irmincore.CreateRepositoryRequest `json:"repository"     jsonschema:"required,Repository creation parameters"`
}

type updateRepositoryArgs struct {
	WorkspaceSlug  string                            `json:"workspace_slug"  jsonschema:"required,The slug of the workspace"`
	RepositorySlug string                            `json:"repository_slug" jsonschema:"required,The slug of the repository to update"`
	Repository     irmincore.UpdateRepositoryRequest `json:"repository"      jsonschema:"required,Repository update parameters"`
}

// RegisterRepositoryTools registers all repository-related tools.
func (mcpTools *MCPTools) RegisterRepositoryTools() {
	mcpTools.registerCreateRepositoryTool()
	mcpTools.registerUpdateRepositoryTool()
}

// registerCreateRepositoryTool registers the create_repository tool for creating a new repository
func (mcpTools *MCPTools) registerCreateRepositoryTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{Name: "create_repository", Description: "Create a new repository in a workspace"},
		func(ctx context.Context, _ *sdkmcp.ServerSession, params *sdkmcp.CallToolParamsFor[createRepositoryArgs]) (*sdkmcp.CallToolResultFor[struct{}], error) {
			user, ok := mcpTools.getUser(ctx)
			if !ok || user == nil || user.ID == 0 {
				return helpers.MCPError("Unauthorized"), nil
			}

			// Get the workspace first
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, params.Arguments.WorkspaceSlug)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workspace", "error", err)
				return helpers.MCPError("Failed to get workspace"), err
			}

			// Create the repository
			repository, err := mcpTools.apiServices.CreateRepository(
				ctx,
				"en",
				user,
				workspace,
				params.Arguments.Repository,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("repository creation failed", "error", err)
				return helpers.MCPError("Repository creation failed"), err
			}

			// Format the response using the same formatter as the API
			formatted, ferr := formatter.FormatRepositoryResponse(repository, mcpTools.apiServices.SQIDManager)
			if ferr != nil {
				return &sdkmcp.CallToolResultFor[struct{}]{
					IsError: true,
					Content: []sdkmcp.Content{&sdkmcp.TextContent{Text: "Failed to format repository"}},
				}, ferr
			}

			// Marshal the formatted response to JSON
			b, err := json.Marshal(formatted)
			if err != nil {
				return &sdkmcp.CallToolResultFor[struct{}]{
					IsError: true,
					Content: []sdkmcp.Content{&sdkmcp.TextContent{Text: "Failed to format repository"}},
				}, err
			}

			// Return the formatted response as a text content with JSON MIME type
			return &sdkmcp.CallToolResultFor[struct{}]{
				Content: []sdkmcp.Content{&sdkmcp.TextContent{
					Text: string(b),
					Meta: sdkmcp.Meta{"mimeType": "application/json"},
				}},
			}, nil
		},
	)
}

// registerUpdateRepositoryTool registers the update_repository tool for updating an existing repository
func (mcpTools *MCPTools) registerUpdateRepositoryTool() {
	// Add the update_repository tool for updating an existing repository
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{Name: "update_repository", Description: "Update an existing repository"},
		func(ctx context.Context, _ *sdkmcp.ServerSession, params *sdkmcp.CallToolParamsFor[updateRepositoryArgs]) (*sdkmcp.CallToolResultFor[struct{}], error) {
			user, ok := mcpTools.getUser(ctx)
			if !ok || user == nil || user.ID == 0 {
				return helpers.MCPError("Unauthorized"), nil
			}

			// Get the workspace first
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, params.Arguments.WorkspaceSlug)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workspace", "error", err)
				return helpers.MCPError("Failed to get workspace"), err
			}

			// Get the repository
			repository, err := mcpTools.apiServices.GetRepositoryBySlug(
				ctx,
				"en",
				user,
				workspace,
				params.Arguments.RepositorySlug,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get repository", "error", err)
				return helpers.MCPError("Failed to get repository"), err
			}

			// Update the repository
			updatedRepository, err := mcpTools.apiServices.UpdateRepository(
				ctx,
				"en",
				user,
				workspace,
				repository,
				params.Arguments.Repository,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("repository update failed", "error", err)
				return helpers.MCPError("Repository update failed"), err
			}

			// Format the response using the same formatter as the API
			formatted, ferr := formatter.FormatRepositoryResponse(updatedRepository, mcpTools.apiServices.SQIDManager)
			if ferr != nil {
				mcpTools.apiServices.Logger.Error("Failed to format repository", "error", ferr)
				return helpers.MCPError("Failed to format repository"), ferr
			}

			return helpers.MCPSuccess(formatted)
		},
	)
}
