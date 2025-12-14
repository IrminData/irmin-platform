package tools

import (
	"context"
	"irmin-api/mcp/helpers"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
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

// registerListRepositoryBranchesTool registers the irmin_list_repository_branches tool for listing repository branches in a workspace
//
//nolint:dupl // This is not a duplicate, it's a different tool, with similar flow compared to other tools
func (mcpTools *MCPTools) registerListRepositoryBranchesTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_list_repository_branches",
			Description: "List all branches in a repository. Branches provide Git-like version control for isolating data changes before merging. Returns an array of branch objects with name, commit SHA, creation timestamp, and metadata. Requires workspace_slug and repository_slug. Use this to discover available branches before reading or writing data, as most data operations accept a branch parameter.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args listRepositoryBranchesArgs) (*sdkmcp.CallToolResult, struct{}, error) {
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

			// List the branches in the repository
			branches, err := mcpTools.apiServices.ListRepositoryBranches(ctx, "en", user, workspace, repository)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Error listing repository branches", "error", err)
				return helpers.MCPError("Error listing repository branches"), struct{}{}, nil
			}

			result, err := helpers.MCPSuccess(branches)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}

// registerCreateRepositoryBranchTool registers the irmin_create_repository_branch tool for creating a new branch in a repository
func (mcpTools *MCPTools) registerCreateRepositoryBranchTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_create_repository_branch",
			Description: "Create a new branch in a repository for isolated development and testing of data changes. Branches in Irmin work like Git branches, allowing parallel data modifications. Requires workspace_slug, repository_slug, and branch_name. Optionally specify create_from_branch to branch from a non-default branch. Returns the created branch object with commit reference. Use this before making experimental data changes that you may want to merge or discard later.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args createRepositoryBranchArgs) (*sdkmcp.CallToolResult, struct{}, error) {
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

			// Create the branch
			branch, err := mcpTools.apiServices.CreateRepositoryBranch(
				ctx,
				"en",
				user,
				workspace,
				repository,
				irmincore.CreateBranchRequest{
					Name:        args.BranchName,
					From:        args.CreateFromBranch,
					IsImmutable: false,
				},
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to create repository branch", "error", err)
				return helpers.MCPError("Failed to create repository branch"), struct{}{}, nil
			}

			result, err := helpers.MCPSuccess(branch)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}

// registerDeleteRepositoryBranchTool registers the irmin_delete_repository_branch tool for deleting a branch in a repository
func (mcpTools *MCPTools) registerDeleteRepositoryBranchTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_delete_repository_branch",
			Description: "Delete a branch from a repository. This permanently removes the branch reference but does not delete the underlying commit history. Requires workspace_slug, repository_slug, and branch_name. Cannot delete the repository's default branch or branches with uncommitted changes. Returns success confirmation. Use this to clean up merged or abandoned feature branches.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args deleteRepositoryBranchArgs) (*sdkmcp.CallToolResult, struct{}, error) {
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

			// Get the branch
			branch, err := mcpTools.apiServices.GetRepositoryBranch(
				ctx,
				"en",
				user,
				workspace,
				repository,
				args.BranchName,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get repository branch", "error", err)
				return helpers.MCPError("Failed to get repository branch"), struct{}{}, nil
			}

			// Delete the branch
			err = mcpTools.apiServices.DeleteRepositoryBranch(ctx, "en", user, workspace, repository, branch)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to delete repository branch", "error", err)
				return helpers.MCPError("Failed to delete repository branch"), struct{}{}, nil
			}

			result, err := helpers.MCPSuccess(nil)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}

// registerGetRepositoryUncommittedChangesTool registers the irmin_get_repository_uncommitted_changes tool for getting the uncommitted changes in a branch in a repository
func (mcpTools *MCPTools) registerGetRepositoryUncommittedChangesTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_get_repository_uncommitted_changes",
			Description: "Retrieve uncommitted changes on a specific branch. Shows pending modifications that have been made but not yet committed to the branch history. Returns a diff object showing added, modified, and deleted objects. Requires workspace_slug, repository_slug, and branch_name. Use this to review pending changes before committing them or to check if a branch has uncommitted work.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args getRepositoryUncommittedChangesArgs) (*sdkmcp.CallToolResult, struct{}, error) {
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

			// Get the branch
			branch, err := mcpTools.apiServices.GetRepositoryBranch(
				ctx,
				"en",
				user,
				workspace,
				repository,
				args.BranchName,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get repository branch", "error", err)
				return helpers.MCPError("Failed to get repository branch"), struct{}{}, nil
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
				return helpers.MCPError("Failed to get repository uncommitted changes"), struct{}{}, nil
			}

			result, err := helpers.MCPSuccess(diff)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}
