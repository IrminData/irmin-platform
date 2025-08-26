package tools

import (
	"context"
	"irmin-api/mcp/helpers"

	irmincore "github.com/IrminData/irmin-sdk-go/core-api"
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

// registerListRepositoryCommitsTool registers the list_repository_commits tool for listing repository commits in a workspace
func (mcpTools *MCPTools) registerListRepositoryCommitsTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "list_repository_commits",
			Description: "List commits in a repository branch. Commits are used to store the different versions of the data in the repository.",
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

// registerCreateRepositoryCommitTool registers the create_repository_commit tool for creating a new commit in a repository
//
//nolint:dupl // This is not a duplicate, it's a different tool, with similar flow compared to other tools
func (mcpTools *MCPTools) registerCreateRepositoryCommitTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "create_repository_commit",
			Description: "Create a new commit in a repository branch, committing all the uncommitted changes in the branch, permamently saving them in the version history.",
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

// registerRevertRepositoryUncommittedChangesTool registers the revert_repository_uncommitted_changes tool for reverting the uncommitted changes in a repository
func (mcpTools *MCPTools) registerRevertRepositoryUncommittedChangesTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "revert_repository_uncommitted_changes",
			Description: "Revert the uncommitted changes in a repository branch, restoring the branch to the previous commit.",
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
