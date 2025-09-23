package tools

import (
	"context"
	"encoding/json"
	"fmt"

	"irmin-api/formatter"
	"irmin-api/mcp/helpers"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

type listRepositoriesArgs struct {
	WorkspaceSlug string `json:"workspace_slug" jsonschema:"required,The slug of the workspace to list repositories in"`
}

type getRepositoryArgs struct {
	WorkspaceSlug  string `json:"workspace_slug"  jsonschema:"required,The slug of the workspace"`
	RepositorySlug string `json:"repository_slug" jsonschema:"required,The slug of the repository to get"`
}

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
	mcpTools.registerListRepositoriesTool()
	mcpTools.registerGetRepositoryTool()
	mcpTools.registerCreateRepositoryTool()
	mcpTools.registerUpdateRepositoryTool()
}

// registerListRepositoriesTool registers the list_repositories tool for listing repositories in a workspace
//
//nolint:dupl // This tool is similar to other tools which list things, but for a different resource
func (mcpTools *MCPTools) registerListRepositoriesTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "list_repositories",
			Description: "List repositories in a workspace. Data objects are stored in, and queried from repositories.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args listRepositoriesArgs) (*sdkmcp.CallToolResult, struct{}, error) {
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

			// List the repositories
			repositories, err := mcpTools.apiServices.ListRepositories(ctx, user, workspace)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to list repositories", "error", err)
				return helpers.MCPError("Failed to list repositories"), struct{}{}, nil
			}

			// Format the response using the same formatter as the API
			formatted, ferr := formatter.FormatIndexResponse(
				repositories,
				formatter.FormatRepositoryResponse,
				mcpTools.apiServices.SQIDManager,
			)
			if ferr != nil {
				mcpTools.apiServices.Logger.Error("Failed to format repositories", "error", ferr)
				return nil, struct{}{}, fmt.Errorf("failed to format repositories response: %w", ferr)
			}

			result, err := helpers.MCPSuccess(formatted)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}

// registerGetRepositoryTool registers the get_repository tool for getting a repository by slug
func (mcpTools *MCPTools) registerGetRepositoryTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{Name: "get_repository", Description: "Get a repository by slug"},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args getRepositoryArgs) (*sdkmcp.CallToolResult, struct{}, error) {
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

			// Get the repository
			repository, err := mcpTools.apiServices.GetRepositoryBySlug(
				ctx,
				"en",
				user,
				workspace,
				args.RepositorySlug,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get repository", "error", err)
				return helpers.MCPError("Failed to get repository"), struct{}{}, nil
			}

			// Format the response using the same formatter as the API
			formatted, ferr := formatter.FormatRepositoryResponse(repository, mcpTools.apiServices.SQIDManager)
			if ferr != nil {
				mcpTools.apiServices.Logger.Error("Failed to format repository response", "error", ferr)
				return nil, struct{}{}, fmt.Errorf("failed to format repository response: %w", ferr)
			}

			result, err := helpers.MCPSuccess(formatted)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}

// registerCreateRepositoryTool registers the create_repository tool for creating a new repository
func (mcpTools *MCPTools) registerCreateRepositoryTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "create_repository",
			Description: "Create a new repository in a workspace. It's recommended to read the documentation for repositories first, use `list_docs` tool for more information.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args createRepositoryArgs) (*sdkmcp.CallToolResult, struct{}, error) {
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

			// Create the repository
			repository, err := mcpTools.apiServices.CreateRepository(
				ctx,
				"en",
				user,
				workspace,
				args.Repository,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("repository creation failed", "error", err)
				return helpers.MCPError("Repository creation failed"), struct{}{}, nil
			}

			// Format the response using the same formatter as the API
			formatted, ferr := formatter.FormatRepositoryResponse(repository, mcpTools.apiServices.SQIDManager)
			if ferr != nil {
				mcpTools.apiServices.Logger.Error("Failed to format repository response", "error", ferr)
				return nil, struct{}{}, fmt.Errorf("failed to format repository response: %w", ferr)
			}

			// Marshal the formatted response to JSON
			b, err := json.Marshal(formatted)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to marshal repository response", "error", err)
				return nil, struct{}{}, fmt.Errorf("failed to marshal repository response: %w", err)
			}

			// Return the formatted response as a text content with JSON MIME type
			return &sdkmcp.CallToolResult{
				Content: []sdkmcp.Content{&sdkmcp.TextContent{
					Text: string(b),
					Meta: sdkmcp.Meta{"mimeType": "application/json"},
				}},
			}, struct{}{}, nil
		},
	)
}

// registerUpdateRepositoryTool registers the update_repository tool for updating an existing repository
func (mcpTools *MCPTools) registerUpdateRepositoryTool() {
	// Add the update_repository tool for updating an existing repository
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{Name: "update_repository", Description: "Update an existing repository"},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args updateRepositoryArgs) (*sdkmcp.CallToolResult, struct{}, error) {
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

			// Get the repository
			repository, err := mcpTools.apiServices.GetRepositoryBySlug(
				ctx,
				"en",
				user,
				workspace,
				args.RepositorySlug,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get repository", "error", err)
				return helpers.MCPError("Failed to get repository"), struct{}{}, nil
			}

			// Update the repository
			updatedRepository, err := mcpTools.apiServices.UpdateRepository(
				ctx,
				"en",
				user,
				workspace,
				repository,
				args.Repository,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("repository update failed", "error", err)
				return helpers.MCPError("Repository update failed"), struct{}{}, nil
			}

			// Format the response using the same formatter as the API
			formatted, ferr := formatter.FormatRepositoryResponse(updatedRepository, mcpTools.apiServices.SQIDManager)
			if ferr != nil {
				mcpTools.apiServices.Logger.Error("Failed to format repository", "error", ferr)
				return nil, struct{}{}, fmt.Errorf("failed to format repository response: %w", ferr)
			}

			result, err := helpers.MCPSuccess(formatted)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}
