package tools

import (
	"context"
	"irmin-api/mcp/helpers"

	irmincore "github.com/IrminData/irmin-platform/sdks/go/api"
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
	"irmin-api/toolregistry"
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

// registerCompareRepositoryRefsTool registers the irmin_repository_ref_compare tool for comparing two references in a repository
func (mcpTools *MCPTools) registerCompareRepositoryRefsTool() {
	toolregistry.Register(mcpTools.registry, mcpTools.server,

		"irmin_repository_ref_compare",
		"Compare two references (branches, tags, or commit hashes) to see differences in data. Shows which objects were added, modified, or deleted between the base_ref and compare_ref. Returns a diff object with detailed change information. Requires workspace_slug, repository_slug, base_ref (target), and compare_ref (source). Use this before merging branches to preview changes or to analyze data evolution between versions.",

		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args compareRepositoryRefsArgs) (*sdkmcp.CallToolResult, toolregistry.ToolOutput, error) {
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
				return helpers.MCPError("Failed to compare repository refs"), toolregistry.ToolOutput{}, nil
			}

			result, resultOutput, err := helpers.MCPSuccess(diff)
			if err != nil {
				return nil, toolregistry.ToolOutput{}, err
			}
			return result, resultOutput, nil
		},
	)
}

// registerMergeRepositoryRefsTool registers the irmin_repository_ref_merge tool for merging two references in a repository
func (mcpTools *MCPTools) registerMergeRepositoryRefsTool() {
	toolregistry.Register(mcpTools.registry, mcpTools.server,

		"irmin_repository_ref_merge",
		"Merge changes from one reference into another, creating a merge commit. Integrates data modifications from compare_ref (source) into base_ref (destination). Requires workspace_slug, repository_slug, base_ref, and compare_ref. Optionally specify merge strategy: 'default' (smart merge), 'dest-wins' (base takes precedence), or 'source-wins' (compare takes precedence). Returns the created merge commit. Use this to incorporate feature branch changes into main branches after review and testing.",

		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args mergeRepositoryRefsArgs) (*sdkmcp.CallToolResult, toolregistry.ToolOutput, error) {
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
				return helpers.MCPError("Failed to merge repository refs"), toolregistry.ToolOutput{}, nil
			}

			result, resultOutput, err := helpers.MCPSuccess(mergeCommit)
			if err != nil {
				return nil, toolregistry.ToolOutput{}, err
			}
			return result, resultOutput, nil
		},
	)
}
