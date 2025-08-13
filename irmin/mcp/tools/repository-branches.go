package tools

import (
	"context"
	"irmin-api/mcp/helpers"

	irmincore "github.com/IrminData/irmin-sdk-go/core-api"
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

type listRepositoryBranchesArgs struct {
	WorkspaceSlug  string `json:"workspace_slug"  jsonschema:"required,The slug of the workspace to list repository branches in"`
	RepositorySlug string `json:"repository_slug" jsonschema:"required,The slug of the repository to list branches in"`
}

type createRepositoryBranchArgs struct {
	WorkspaceSlug    string `json:"workspace_slug"     jsonschema:"required,The slug of the workspace to create the branch in"`
	RepositorySlug   string `json:"repository_slug"    jsonschema:"required,The slug of the repository to create the branch in"`
	BranchName       string `json:"branch_name"        jsonschema:"required,The name of the branch to create, must be unique within the repository and be properly formatted"`
	CreateFromBranch string `json:"create_from_branch" jsonschema:"The name of the branch to create the new branch from, if not provided the new branch will be created from the repository's default branch"`
}

type deleteRepositoryBranchArgs struct {
	WorkspaceSlug  string `json:"workspace_slug"  jsonschema:"required,The slug of the workspace to delete the branch in"`
	RepositorySlug string `json:"repository_slug" jsonschema:"required,The slug of the repository to delete the branch in"`
	BranchName     string `json:"branch_name"     jsonschema:"required,The name of the branch to delete"`
}

type getRepositoryUncommittedChangesArgs struct {
	WorkspaceSlug  string `json:"workspace_slug"  jsonschema:"required,The slug of the workspace to get the uncommitted changes in"`
	RepositorySlug string `json:"repository_slug" jsonschema:"required,The slug of the repository to get the uncommitted changes in"`
	BranchName     string `json:"branch_name"     jsonschema:"required,The name of the branch to get the uncommitted changes in"`
}

// RegisterRepositoryBranchesTools registers all repository branch-related tools.
func (mcpTools *MCPTools) RegisterRepositoryBranchesTools() {
	mcpTools.registerListRepositoryBranchesTool()
	mcpTools.registerCreateRepositoryBranchTool()
	mcpTools.registerDeleteRepositoryBranchTool()
	mcpTools.registerGetRepositoryUncommittedChangesTool()
}

// registerListRepositoryBranchesTool registers the list_repository_branches tool for listing repository branches in a workspace
//
//nolint:dupl // This is not a duplicate, it's a different tool, with similar flow compared to other tools
func (mcpTools *MCPTools) registerListRepositoryBranchesTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "list_repository_branches",
			Description: "List branches in a repository. Branches are used to store the different versions of the data in the repository.",
		},
		func(ctx context.Context, _ *sdkmcp.ServerSession, params *sdkmcp.CallToolParamsFor[listRepositoryBranchesArgs]) (*sdkmcp.CallToolResultFor[struct{}], error) {
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

			// List the branches in the repository
			branches, err := mcpTools.apiServices.ListRepositoryBranches(ctx, "en", user, workspace, repository)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Error listing repository branches", "error", err)
				return helpers.MCPError("Error listing repository branches"), nil
			}

			return helpers.MCPSuccess(branches)
		},
	)
}

// registerCreateRepositoryBranchTool registers the create_repository_branch tool for creating a new branch in a repository
func (mcpTools *MCPTools) registerCreateRepositoryBranchTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "create_repository_branch",
			Description: "Create a new branch in a repository. Branches are used to store the different versions of the data in the repository.",
		},
		func(ctx context.Context, _ *sdkmcp.ServerSession, params *sdkmcp.CallToolParamsFor[createRepositoryBranchArgs]) (*sdkmcp.CallToolResultFor[struct{}], error) {
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

			// Create the branch
			branch, err := mcpTools.apiServices.CreateRepositoryBranch(
				ctx,
				"en",
				user,
				workspace,
				repository,
				irmincore.CreateBranchRequest{
					Name:        params.Arguments.BranchName,
					From:        params.Arguments.CreateFromBranch,
					IsImmutable: false,
				},
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to create repository branch", "error", err)
				return helpers.MCPError("Failed to create repository branch"), nil
			}

			return helpers.MCPSuccess(branch)
		},
	)
}

// registerDeleteRepositoryBranchTool registers the delete_repository_branch tool for deleting a branch in a repository
func (mcpTools *MCPTools) registerDeleteRepositoryBranchTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "delete_repository_branch",
			Description: "Delete a branch in a repository. Branches are used to store the different versions of the data in the repository.",
		},
		func(ctx context.Context, _ *sdkmcp.ServerSession, params *sdkmcp.CallToolParamsFor[deleteRepositoryBranchArgs]) (*sdkmcp.CallToolResultFor[struct{}], error) {
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

			// Get the branch
			branch, err := mcpTools.apiServices.GetRepositoryBranch(
				ctx,
				"en",
				user,
				workspace,
				repository,
				params.Arguments.BranchName,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get repository branch", "error", err)
				return helpers.MCPError("Failed to get repository branch"), nil
			}

			// Delete the branch
			err = mcpTools.apiServices.DeleteRepositoryBranch(ctx, "en", user, workspace, repository, branch)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to delete repository branch", "error", err)
				return helpers.MCPError("Failed to delete repository branch"), nil
			}

			return helpers.MCPSuccess(nil)
		},
	)
}

// registerGetRepositoryUncommittedChangesTool registers the get_repository_uncommitted_changes tool for getting the uncommitted changes in a branch in a repository
func (mcpTools *MCPTools) registerGetRepositoryUncommittedChangesTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "get_repository_uncommitted_changes",
			Description: "Get the uncommitted changes in a branch in a repository. Branches are used to store the different versions of the data in the repository.",
		},
		func(ctx context.Context, _ *sdkmcp.ServerSession, params *sdkmcp.CallToolParamsFor[getRepositoryUncommittedChangesArgs]) (*sdkmcp.CallToolResultFor[struct{}], error) {
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

			// Get the branch
			branch, err := mcpTools.apiServices.GetRepositoryBranch(
				ctx,
				"en",
				user,
				workspace,
				repository,
				params.Arguments.BranchName,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get repository branch", "error", err)
				return helpers.MCPError("Failed to get repository branch"), nil
			}

			// Get the uncommitted changes
			diff, err := mcpTools.apiServices.GetRepositoryUncommittedChanges(
				ctx,
				"en",
				user,
				workspace,
				repository,
				branch,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get repository uncommitted changes", "error", err)
				return helpers.MCPError("Failed to get repository uncommitted changes"), nil
			}

			return helpers.MCPSuccess(diff)
		},
	)
}
