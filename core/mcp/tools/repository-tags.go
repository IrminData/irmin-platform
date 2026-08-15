package tools

import (
	"context"
	"irmin-api/mcp/helpers"

	"irmin-api/toolregistry"

	irmincore "github.com/IrminData/irmin-platform/sdks/go/api"
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

type listRepositoryTagsArgs struct {
	WorkspaceSlug  string `json:"workspace_slug"  jsonschema:"required,The slug of the workspace to list repository tags in"`
	RepositorySlug string `json:"repository_slug" jsonschema:"required,The slug of the repository to list tags in"`
}

type createRepositoryTagArgs struct {
	WorkspaceSlug  string `json:"workspace_slug"  jsonschema:"required,The slug of the workspace to create the tag in"`
	RepositorySlug string `json:"repository_slug" jsonschema:"required,The slug of the repository to create the tag in"`
	TagName        string `json:"tag_name"        jsonschema:"required,The name of the tag to create, must be unique within the repository and be properly formatted"`
	CommitHash     string `json:"commit_hash"     jsonschema:"required,The hash of the commit to create the tag from."`
}

type deleteRepositoryTagArgs struct {
	WorkspaceSlug  string `json:"workspace_slug"  jsonschema:"required,The slug of the workspace to delete the tag in"`
	RepositorySlug string `json:"repository_slug" jsonschema:"required,The slug of the repository to delete the tag in"`
	TagName        string `json:"tag_name"        jsonschema:"required,The name of the tag to delete"`
}

// RegisterRepositoryTagsTools registers all repository tag-related tools.
func (mcpTools *MCPTools) RegisterRepositoryTagsTools() {
	mcpTools.registerListRepositoryTagsTool()
	mcpTools.registerCreateRepositoryTagTool()
	mcpTools.registerDeleteRepositoryTagTool()
}

// registerListRepositoryTagsTool registers the irmin_repository_tag_list tool for listing repository tags in a workspace
//
//nolint:dupl // This is not a duplicate, it's a different tool, with similar flow compared to other tools
func (mcpTools *MCPTools) registerListRepositoryTagsTool() {
	toolregistry.Register(
		mcpTools.registry,
		mcpTools.server,

		"irmin_repository_tag_list",
		"List all tags in a repository. Tags are immutable named references to specific commits, useful for marking releases, milestones, or important data snapshots. Returns an array of tag objects with name and target commit SHA. Requires workspace_slug and repository_slug. Use this to discover available tagged versions for data analysis or rollback operations.",

		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args listRepositoryTagsArgs) (*sdkmcp.CallToolResult, toolregistry.ToolOutput, error) {
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

			// List the tags in the repository
			tags, err := mcpTools.apiServices.ListRepositoryTags(ctx, "en", user, workspace, repository)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Error listing repository tags", "error", err)
				return helpers.MCPError("Error listing repository tags"), toolregistry.ToolOutput{}, nil
			}

			result, resultOutput, err := helpers.MCPSuccess(tags)
			if err != nil {
				return nil, toolregistry.ToolOutput{}, err
			}
			return result, resultOutput, nil
		},
	)
}

// registerCreateRepositoryTagTool registers the irmin_repository_tag_create tool for creating a new tag in a repository
//
//nolint:dupl // This is not a duplicate, it's a different tool, with similar flow compared to other tools
func (mcpTools *MCPTools) registerCreateRepositoryTagTool() {
	toolregistry.Register(
		mcpTools.registry,
		mcpTools.server,

		"irmin_repository_tag_create",
		"Create an immutable named tag pointing to a specific commit in the repository. Tags provide human-readable references to important data versions like production releases or quarterly snapshots. Requires workspace_slug, repository_slug, tag_name, and commit_hash. Returns the created tag object. Use this to mark significant data milestones for easy reference in queries and data operations.",

		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args createRepositoryTagArgs) (*sdkmcp.CallToolResult, toolregistry.ToolOutput, error) {
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

			// Create the tag
			tag, err := mcpTools.apiServices.CreateRepositoryTag(
				ctx,
				"en",
				user,
				workspace,
				repository,
				irmincore.CreateRepositoryTagRequest{
					Name: args.TagName,
					Ref:  args.CommitHash,
				},
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to create tag", "error", err)
				return helpers.MCPError("Failed to create tag"), toolregistry.ToolOutput{}, nil
			}

			result, resultOutput, err := helpers.MCPSuccess(tag)
			if err != nil {
				return nil, toolregistry.ToolOutput{}, err
			}
			return result, resultOutput, nil
		},
	)
}

// registerDeleteRepositoryTagTool registers the irmin_repository_tag_delete tool for deleting a tag in a repository
func (mcpTools *MCPTools) registerDeleteRepositoryTagTool() {
	toolregistry.Register(
		mcpTools.registry,
		mcpTools.server,

		"irmin_repository_tag_delete",
		"Delete a tag from a repository. This removes the named reference but does not affect the underlying commit or data. Requires workspace_slug, repository_slug, and tag_name. Returns success confirmation. Use this to clean up obsolete or incorrectly created tags. Cannot be undone, so ensure the tag is no longer needed before deletion.",

		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args deleteRepositoryTagArgs) (*sdkmcp.CallToolResult, toolregistry.ToolOutput, error) {
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

			// Get the tag
			tag, err := mcpTools.apiServices.GetRepositoryTag(
				ctx,
				"en",
				user,
				workspace,
				repository,
				args.TagName,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get tag", "error", err)
				return helpers.MCPError("Failed to get tag"), toolregistry.ToolOutput{}, nil
			}

			// Delete the tag
			err = mcpTools.apiServices.DeleteRepositoryTag(ctx, "en", user, workspace, repository, tag)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to delete tag", "error", err)
				return helpers.MCPError("Failed to delete tag"), toolregistry.ToolOutput{}, nil
			}

			result, resultOutput, err := helpers.MCPSuccess(map[string]string{
				"message": "Tag deleted successfully",
			})
			if err != nil {
				return nil, toolregistry.ToolOutput{}, err
			}
			return result, resultOutput, nil
		},
	)
}
