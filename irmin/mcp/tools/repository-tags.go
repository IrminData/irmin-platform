package tools

import (
	"context"
	"irmin-api/mcp/helpers"

	irmincore "github.com/IrminData/irmin-sdk-go/core-api"
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

// registerListRepositoryTagsTool registers the list_repository_tags tool for listing repository tags in a workspace
//
//nolint:dupl // This is not a duplicate, it's a different tool, with similar flow compared to other tools
func (mcpTools *MCPTools) registerListRepositoryTagsTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "list_repository_tags",
			Description: "List tags in a repository. Tags are used to mark a specific commit in the repository, as an easy way to reference it later.",
		},
		func(ctx context.Context, _ *sdkmcp.ServerSession, params *sdkmcp.CallToolParamsFor[listRepositoryTagsArgs]) (*sdkmcp.CallToolResultFor[struct{}], error) {
			// Validate user
			user, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, err
			}

			// Get the workspace first
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, params.Arguments.WorkspaceSlug)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workspace", "error", err)
				return helpers.MCPError("Failed to get workspace"), nil
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
				return helpers.MCPError("Failed to get repository"), nil
			}

			// List the tags in the repository
			tags, err := mcpTools.apiServices.ListRepositoryTags(ctx, "en", user, workspace, repository)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Error listing repository tags", "error", err)
				return helpers.MCPError("Error listing repository tags"), nil
			}

			return helpers.MCPSuccess(tags)
		},
	)
}

// registerCreateRepositoryTagTool registers the create_repository_tag tool for creating a new tag in a repository
//
//nolint:dupl // This is not a duplicate, it's a different tool, with similar flow compared to other tools
func (mcpTools *MCPTools) registerCreateRepositoryTagTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "create_repository_tag",
			Description: "Create a new tag in a repository. Tags are used to mark a specific commit in the repository, as an easy way to reference it later.",
		},
		func(ctx context.Context, _ *sdkmcp.ServerSession, params *sdkmcp.CallToolParamsFor[createRepositoryTagArgs]) (*sdkmcp.CallToolResultFor[struct{}], error) {
			// Validate user
			user, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, err
			}

			// Get the workspace
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, params.Arguments.WorkspaceSlug)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workspace", "error", err)
				return helpers.MCPError("Failed to get workspace"), nil
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
				return helpers.MCPError("Failed to get repository"), nil
			}

			// Create the tag
			tag, err := mcpTools.apiServices.CreateRepositoryTag(
				ctx,
				"en",
				user,
				workspace,
				repository,
				irmincore.CreateRepositoryTagRequest{
					Name: params.Arguments.TagName,
					Ref:  params.Arguments.CommitHash,
				},
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to create tag", "error", err)
				return helpers.MCPError("Failed to create tag"), nil
			}

			return helpers.MCPSuccess(tag)
		},
	)
}

// registerDeleteRepositoryTagTool registers the delete_repository_tag tool for deleting a tag in a repository
func (mcpTools *MCPTools) registerDeleteRepositoryTagTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "delete_repository_tag",
			Description: "Delete a tag in a repository. Tags are used to mark a specific commit in the repository, as an easy way to reference it later.",
		},
		func(ctx context.Context, _ *sdkmcp.ServerSession, params *sdkmcp.CallToolParamsFor[deleteRepositoryTagArgs]) (*sdkmcp.CallToolResultFor[struct{}], error) {
			// Validate user
			user, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, err
			}

			// Get the workspace
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, params.Arguments.WorkspaceSlug)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workspace", "error", err)
				return helpers.MCPError("Failed to get workspace"), nil
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
				return helpers.MCPError("Failed to get repository"), nil
			}

			// Get the tag
			tag, err := mcpTools.apiServices.GetRepositoryTag(
				ctx,
				"en",
				user,
				workspace,
				repository,
				params.Arguments.TagName,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get tag", "error", err)
				return helpers.MCPError("Failed to get tag"), nil
			}

			// Delete the tag
			err = mcpTools.apiServices.DeleteRepositoryTag(ctx, "en", user, workspace, repository, tag)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to delete tag", "error", err)
				return helpers.MCPError("Failed to delete tag"), nil
			}

			return helpers.MCPSuccess(map[string]string{
				"message": "Tag deleted successfully",
			})
		},
	)
}
