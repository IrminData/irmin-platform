package tools

import (
	"context"
	"irmin-api/mcp/helpers"

	irmincore "github.com/IrminData/irmin-sdk-go/core-api"
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

type compareRepositoryRefsArgs struct {
	WorkspaceSlug  string `json:"workspace_slug"  jsonschema:"required,The slug of the workspace to list repository commits in"`
	RepositorySlug string `json:"repository_slug" jsonschema:"required,The slug of the repository to list commits in"`
	BaseRef        string `json:"base_ref"        jsonschema:"required,The reference which the changes would be merged in to. Can be branches, tags or commit hashes"`
	CompareRef     string `json:"compare_ref"     jsonschema:"required,The reference which is the source of the changes, which would be merged in to the base ref. Can be branches, tags or commit hashes"`
}

type mergeStrategy string

const (
	mergeStrategyDefault    mergeStrategy = "default"
	mergeStrategyDestWins   mergeStrategy = "dest-wins"
	mergeStrategySourceWins mergeStrategy = "source-wins"
)

type mergeRepositoryRefsArgs struct {
	WorkspaceSlug  string        `json:"workspace_slug"  jsonschema:"required,The slug of the workspace to merge repository refs in"`
	RepositorySlug string        `json:"repository_slug" jsonschema:"required,The slug of the repository to merge repository refs in"`
	BaseRef        string        `json:"base_ref"        jsonschema:"required,The reference which the changes would be merged in to. Can be branches, tags or commit hashes"`
	CompareRef     string        `json:"compare_ref"     jsonschema:"required,The reference which is the source of the changes, which would be merged in to the base ref. Can be branches, tags or commit hashes"`
	Strategy       mergeStrategy `json:"strategy"        jsonschema:"The strategy to use for the merge"`
	Description    string        `json:"description"     jsonschema:"The description to use for the merge commit"`
}

// RegisterRepositoryCompareTools registers all repository compare-related tools.
func (mcpTools *MCPTools) RegisterRepositoryCompareTools() {
	mcpTools.registerCompareRepositoryRefsTool()
	mcpTools.registerMergeRepositoryRefsTool()
}

// registerCompareRepositoryRefsTool registers the compare_repository_refs tool for comparing two references in a repository
func (mcpTools *MCPTools) registerCompareRepositoryRefsTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "compare_repository_refs",
			Description: "Compare two references in a repository. References can be branches, tags or commit hashes.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args compareRepositoryRefsArgs) (*sdkmcp.CallToolResult, struct{}, error) {
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

			// Get the diff between the refs
			diff, err := mcpTools.apiServices.CompareRepositoryRefs(
				ctx,
				"en",
				user,
				workspace,
				repository,
				args.BaseRef,
				args.CompareRef,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to compare repository refs", "error", err)
				return helpers.MCPError("Failed to compare repository refs"), struct{}{}, nil
			}

			result, err := helpers.MCPSuccess(diff)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}

// registerMergeRepositoryRefsTool registers the merge_repository_refs tool for merging two references in a repository
func (mcpTools *MCPTools) registerMergeRepositoryRefsTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "merge_repository_refs",
			Description: "Merge one reference into another in a repository. References can be branches, tags or commit hashes.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args mergeRepositoryRefsArgs) (*sdkmcp.CallToolResult, struct{}, error) {
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

			// Determine the strategy to use
			strategy := mergeStrategyDefault
			if args.Strategy != "" {
				strategy = args.Strategy
			}

			// Merge the refs
			mergeCommit, err := mcpTools.apiServices.MergeRepositoryRefs(
				ctx,
				"en",
				user,
				workspace,
				repository,
				irmincore.MergeRefsRequest{
					BaseRef:     args.BaseRef,
					CompareRef:  args.CompareRef,
					Strategy:    string(strategy),
					Description: args.Description,
					AllowEmpty:  false,
				},
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to merge repository refs", "error", err)
				return helpers.MCPError("Failed to merge repository refs"), struct{}{}, nil
			}

			result, err := helpers.MCPSuccess(mergeCommit)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}
