package tools

import (
	"context"
	"irmin-api/mcp/helpers"

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

// registerListRepositoryTagsTool registers the irmin_list_repository_tags tool for listing repository tags in a workspace
//
//nolint:dupl // This is not a duplicate, it's a different tool, with similar flow compared to other tools
func (mcpTools *MCPTools) registerListRepositoryTagsTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_list_repository_tags",
			Description: "List all tags in a repository. Tags are immutable named references to specific commits, useful for marking releases, milestones, or important data snapshots. Returns an array of tag objects with name and target commit SHA. Requires workspace_slug and repository_slug. Use this to discover available tagged versions for data analysis or rollback operations.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args listRepositoryTagsArgs) (*sdkmcp.CallToolResult, struct{}, error) {
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

			// List the tags in the repository
			tags, err := mcpTools.apiServices.ListRepositoryTags(ctx, "en", user, workspace, repository)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Error listing repository tags", "error", err)
				return helpers.MCPError("Error listing repository tags"), struct{}{}, nil
			}

			result, err := helpers.MCPSuccess(tags)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}

// registerCreateRepositoryTagTool registers the irmin_create_repository_tag tool for creating a new tag in a repository
//
//nolint:dupl // This is not a duplicate, it's a different tool, with similar flow compared to other tools
func (mcpTools *MCPTools) registerCreateRepositoryTagTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_create_repository_tag",
			Description: "Create an immutable named tag pointing to a specific commit in the repository. Tags provide human-readable references to important data versions like production releases or quarterly snapshots. Requires workspace_slug, repository_slug, tag_name, and commit_hash. Returns the created tag object. Use this to mark significant data milestones for easy reference in queries and data operations.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args createRepositoryTagArgs) (*sdkmcp.CallToolResult, struct{}, error) {
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
				return helpers.MCPError("Failed to create tag"), struct{}{}, nil
			}

			result, err := helpers.MCPSuccess(tag)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}

// registerDeleteRepositoryTagTool registers the irmin_delete_repository_tag tool for deleting a tag in a repository
func (mcpTools *MCPTools) registerDeleteRepositoryTagTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_delete_repository_tag",
			Description: "Delete a tag from a repository. This removes the named reference but does not affect the underlying commit or data. Requires workspace_slug, repository_slug, and tag_name. Returns success confirmation. Use this to clean up obsolete or incorrectly created tags. Cannot be undone, so ensure the tag is no longer needed before deletion.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args deleteRepositoryTagArgs) (*sdkmcp.CallToolResult, struct{}, error) {
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
				return helpers.MCPError("Failed to get tag"), struct{}{}, nil
			}

			// Delete the tag
			err = mcpTools.apiServices.DeleteRepositoryTag(ctx, "en", user, workspace, repository, tag)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to delete tag", "error", err)
				return helpers.MCPError("Failed to delete tag"), struct{}{}, nil
			}

			result, err := helpers.MCPSuccess(map[string]string{
				"message": "Tag deleted successfully",
			})
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}
