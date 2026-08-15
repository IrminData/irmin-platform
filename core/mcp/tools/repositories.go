package tools

import (
	"context"
	"encoding/json"
	"fmt"

	"irmin-api/formatter"
	"irmin-api/mcp/helpers"

	irmincore "github.com/IrminData/irmin-platform/sdks/go/api"
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
	"irmin-api/toolregistry"
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

// registerListRepositoriesTool registers the irmin_repository_list tool for listing repositories in a workspace
//
//nolint:dupl // This tool is similar to other tools which list things, but for a different resource
func (mcpTools *MCPTools) registerListRepositoriesTool() {
	toolregistry.Register(mcpTools.registry, mcpTools.server,

		"irmin_repository_list",
		"List all repositories in a specified workspace. Repositories are Git-like data stores with versioning capabilities where data objects are stored and queried. Returns an array of repository objects with name, slug, default branch, storage location, and configuration details. Requires workspace_slug parameter. Use this to discover available repositories before performing data operations.",

		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args listRepositoriesArgs) (*sdkmcp.CallToolResult, toolregistry.ToolOutput, error) {
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

			// List the repositories
			repositories, err := mcpTools.apiServices.ListRepositories(ctx, user, workspace)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to list repositories", "error", err)
				return helpers.MCPError("Failed to list repositories"), toolregistry.ToolOutput{}, nil
			}

			// Format the response using the same formatter as the API
			formatted, ferr := formatter.FormatIndexResponse(
				repositories,
				formatter.FormatRepositoryResponse,
				mcpTools.apiServices.SQIDManager,
			)
			if ferr != nil {
				mcpTools.apiServices.Logger.Error("Failed to format repositories", "error", ferr)
				return nil, toolregistry.ToolOutput{}, fmt.Errorf("failed to format repositories response: %w", ferr)
			}

			result, resultOutput, err := helpers.MCPSuccess(formatted)
			if err != nil {
				return nil, toolregistry.ToolOutput{}, err
			}
			return result, resultOutput, nil
		},
	)
}

// registerGetRepositoryTool registers the irmin_repository_get tool for getting a repository by slug
func (mcpTools *MCPTools) registerGetRepositoryTool() {
	toolregistry.Register(mcpTools.registry, mcpTools.server,

		"irmin_repository_get",
		"Retrieve detailed information about a specific repository by its slug identifier. Returns comprehensive repository metadata including name, description, default branch, storage backend configuration, and version control settings. Requires workspace_slug and repository_slug parameters. Use this to inspect repository configuration before performing operations.",

		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args getRepositoryArgs) (*sdkmcp.CallToolResult, toolregistry.ToolOutput, error) {
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
				return helpers.MCPError("Failed to get repository"), toolregistry.ToolOutput{}, nil
			}

			// Format the response using the same formatter as the API
			formatted, ferr := formatter.FormatRepositoryResponse(repository, mcpTools.apiServices.SQIDManager)
			if ferr != nil {
				mcpTools.apiServices.Logger.Error("Failed to format repository response", "error", ferr)
				return nil, toolregistry.ToolOutput{}, fmt.Errorf("failed to format repository response: %w", ferr)
			}

			result, resultOutput, err := helpers.MCPSuccess(formatted)
			if err != nil {
				return nil, toolregistry.ToolOutput{}, err
			}
			return result, resultOutput, nil
		},
	)
}

// registerCreateRepositoryTool registers the irmin_repository_create tool for creating a new repository
func (mcpTools *MCPTools) registerCreateRepositoryTool() {
	toolregistry.Register(mcpTools.registry, mcpTools.server,

		"irmin_repository_create",
		"Create a new Git-like versioned data repository in a workspace. Repositories store structured and unstructured data with full version control capabilities. Requires workspace_slug and repository configuration (name, storage backend, default branch). Returns the created repository object. Use irmin_documentation_retrieve tool with 'repositories' query before creating to understand configuration options and best practices.",

		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args createRepositoryArgs) (*sdkmcp.CallToolResult, toolregistry.ToolOutput, error) {
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
				return helpers.MCPError("Repository creation failed"), toolregistry.ToolOutput{}, nil
			}

			// Format the response using the same formatter as the API
			formatted, ferr := formatter.FormatRepositoryResponse(repository, mcpTools.apiServices.SQIDManager)
			if ferr != nil {
				mcpTools.apiServices.Logger.Error("Failed to format repository response", "error", ferr)
				return nil, toolregistry.ToolOutput{}, fmt.Errorf("failed to format repository response: %w", ferr)
			}

			// Marshal the formatted response to JSON
			b, err := json.Marshal(formatted)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to marshal repository response", "error", err)
				return nil, toolregistry.ToolOutput{}, fmt.Errorf("failed to marshal repository response: %w", err)
			}

			// Return the formatted response as a text content with JSON MIME type
			return &sdkmcp.CallToolResult{
				Content: []sdkmcp.Content{&sdkmcp.TextContent{
					Text: string(b),
					Meta: sdkmcp.Meta{"mimeType": "application/json"},
				}},
			}, toolregistry.ToolOutput{}, nil
		},
	)
}

// registerUpdateRepositoryTool registers the irmin_repository_update tool for updating an existing repository
func (mcpTools *MCPTools) registerUpdateRepositoryTool() {
	toolregistry.
		// Add the update_repository tool for updating an existing repository
		Register(mcpTools.registry, mcpTools.server,

			"irmin_repository_update",
			"Update metadata and configuration of an existing repository. Allows modification of name, description, and other repository settings while preserving all stored data and version history. Requires workspace_slug, repository_slug, and update parameters. Returns the updated repository object. Cannot change the storage backend or default branch after creation.",

			func(ctx context.Context, _ *sdkmcp.CallToolRequest, args updateRepositoryArgs) (*sdkmcp.CallToolResult, toolregistry.ToolOutput, error) {
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
					return helpers.MCPError("Failed to get repository"), toolregistry.ToolOutput{}, nil
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
					return helpers.MCPError("Repository update failed"), toolregistry.ToolOutput{}, nil
				}

				// Format the response using the same formatter as the API
				formatted, ferr := formatter.FormatRepositoryResponse(updatedRepository, mcpTools.apiServices.SQIDManager)
				if ferr != nil {
					mcpTools.apiServices.Logger.Error("Failed to format repository", "error", ferr)
					return nil, toolregistry.ToolOutput{}, fmt.Errorf("failed to format repository response: %w", ferr)
				}

				result, resultOutput, err := helpers.MCPSuccess(formatted)
				if err != nil {
					return nil, toolregistry.ToolOutput{}, err
				}
				return result, resultOutput, nil
			},
		)
}
