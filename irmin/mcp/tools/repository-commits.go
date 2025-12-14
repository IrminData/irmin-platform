package tools

import (
	"context"
	"irmin-api/mcp/helpers"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

type listRepositoryCommitsArgs struct {
	WorkspaceSlug  string `json:"workspace_slug"  jsonschema:"required,The slug of the workspace to list repository commits in"`
	RepositorySlug string `json:"repository_slug" jsonschema:"required,The slug of the repository to list commits in"`
	BranchName     string `json:"branch_name"     jsonschema:"The name of the branch to list commits in, if not provided the default branch will be used"`
	After          string `json:"after"           jsonschema:"The cursor, commit hash, to start listing commits from, if not provided the first page will be used"`
	PerPage        int    `json:"per_page"        jsonschema:"The number of commits to list per page, if not provided the default value will be used"`
}

type createRepositoryCommitArgs struct {
	WorkspaceSlug  string `json:"workspace_slug"  jsonschema:"required,The slug of the workspace to create the commit in"`
	RepositorySlug string `json:"repository_slug" jsonschema:"required,The slug of the repository to create the commit in"`
	BranchName     string `json:"branch_name"     jsonschema:"The name of the branch to create the commit in"`
	Message        string `json:"message"         jsonschema:"The message of the commit"`
}

type revertRepositoryUncommittedChangesArgs struct {
	WorkspaceSlug  string `json:"workspace_slug"  jsonschema:"required,The slug of the workspace to revert the uncommitted changes in"`
	RepositorySlug string `json:"repository_slug" jsonschema:"required,The slug of the repository to revert the uncommitted changes in"`
	BranchName     string `json:"branch_name"     jsonschema:"The name of the branch to revert the uncommitted changes in"`
}

// RegisterRepositoryCommitsTools registers all repository commit-related tools.
func (mcpTools *MCPTools) RegisterRepositoryCommitsTools() {
	mcpTools.registerListRepositoryCommitsTool()
	mcpTools.registerCreateRepositoryCommitTool()
	mcpTools.registerRevertRepositoryUncommittedChangesTool()
}

// registerListRepositoryCommitsTool registers the irmin_list_repository_commits tool for listing repository commits in a workspace
func (mcpTools *MCPTools) registerListRepositoryCommitsTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_list_repository_commits",
			Description: "List commit history for a repository branch. Commits represent snapshots of data at specific points in time, forming the version history. Returns an array of commit objects with SHA, message, author, timestamp, and parent commits. Supports pagination via after cursor and per_page parameters. Requires workspace_slug and repository_slug. Use this to inspect the data lineage and understand what changes were made over time.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args listRepositoryCommitsArgs) (*sdkmcp.CallToolResult, struct{}, error) {
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

			// Get the commits using the service
			filteredCommits, lakefsPagination, err := mcpTools.apiServices.ListRepositoryCommits(
				ctx,
				"en",
				user,
				workspace,
				repository,
				args.BranchName,
				&args.After,
				&args.PerPage,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to list repository commits", "error", err)
				return helpers.MCPError("Failed to list repository commits"), struct{}{}, nil
			}

			// Build the pagination response
			if lakefsPagination != nil {
				response, responseErr := helpers.MCPSuccess(irminmodels.IrminAPIResponse{
					Pagination: &irminmodels.IrminAPIPaginationMetadata{
						Total:   &lakefsPagination.Results,
						PerPage: &args.PerPage,
						HasMore: &lakefsPagination.HasMore,
						Next:    &lakefsPagination.NextOffset,
					},
					Data: filteredCommits,
				})
				if responseErr != nil {
					return nil, struct{}{}, responseErr
				}
				return response, struct{}{}, nil
			}

			result, err := helpers.MCPSuccess(irminmodels.IrminAPIResponse{
				Data: filteredCommits,
			})
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}

// registerCreateRepositoryCommitTool registers the irmin_create_repository_commit tool for creating a new commit in a repository
//
//nolint:dupl // This is not a duplicate, it's a different tool, with similar flow compared to other tools
func (mcpTools *MCPTools) registerCreateRepositoryCommitTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_create_repository_commit",
			Description: "Create a new commit to permanently save all uncommitted changes on a branch. Commits snapshot the current state of all data objects and add them to the version history. Requires workspace_slug, repository_slug, and a descriptive commit message. Optionally specify branch_name (defaults to repository's default branch). Returns the created commit object with SHA. Use this after making data changes to preserve them in the repository history before merging or sharing.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args createRepositoryCommitArgs) (*sdkmcp.CallToolResult, struct{}, error) {
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

			// Create the commit using the service
			commit, err := mcpTools.apiServices.CreateRepositoryCommit(
				ctx,
				"en",
				user,
				workspace,
				repository,
				irmincore.CreateCommitRequest{
					Message: args.Message,
					Branch:  args.BranchName,
				},
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to create repository commit", "error", err)
				return helpers.MCPError("Failed to create repository commit"), struct{}{}, nil
			}

			result, err := helpers.MCPSuccess(commit)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}

// registerRevertRepositoryUncommittedChangesTool registers the irmin_revert_repository_uncommitted_changes tool for reverting the uncommitted changes in a repository
func (mcpTools *MCPTools) registerRevertRepositoryUncommittedChangesTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_revert_repository_uncommitted_changes",
			Description: "Discard all uncommitted changes on a branch, restoring it to the state of the last commit. This operation is destructive and cannot be undone. All pending modifications to data objects will be permanently lost. Requires workspace_slug, repository_slug, and optionally branch_name. Returns success confirmation. Use this to abandon unwanted changes or reset a branch to a clean state.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args revertRepositoryUncommittedChangesArgs) (*sdkmcp.CallToolResult, struct{}, error) {
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

			// Revert the uncommitted changes using the service
			err = mcpTools.apiServices.RevertRepositoryUncommittedChanges(
				ctx,
				"en",
				user,
				workspace,
				repository,
				irmincore.RevertUncommittedChangesRequest{
					Branch: args.BranchName,
				},
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to revert repository uncommitted changes", "error", err)
				return helpers.MCPError("Failed to revert repository uncommitted changes"), struct{}{}, nil
			}

			result, err := helpers.MCPSuccess(map[string]string{
				"message": "Changes reverted to the previous commit",
			})
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}
