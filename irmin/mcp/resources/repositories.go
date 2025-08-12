//nolint:dupl // Resource registration functions follow the same pattern
package resources

import (
	"context"

	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/mcp/helpers"

	irminsqids "github.com/IrminData/irmin-sdk-go/sqids"
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

// RegisterRepositories registers the repositories resource.
func (mcpResources *MCPResources) RegisterRepositories() {
	mcpResources.server.AddResource(&sdkmcp.Resource{
		Name:        "repositories",
		Description: "List of repositories in a workspace accessible to the authenticated user",
		MIMEType:    "application/json",
		URI:         "irmin://workspaces/{workspace_slug}/repositories",
	}, func(ctx context.Context, _ *sdkmcp.ServerSession, params *sdkmcp.ReadResourceParams) (*sdkmcp.ReadResourceResult, error) {
		return helpers.CreateWorkspaceResourceResponse(
			ctx,
			params.URI,
			"/repositories",
			mcpResources.apiServices,
			mcpResources.getUser,
			func(ctx context.Context, user *db.User, workspace *db.Workspace) ([]db.Repository, error) {
				return mcpResources.apiServices.ListRepositories(ctx, user, workspace)
			},
			func(repositories []db.Repository, sqidManager *irminsqids.SQIDManager) (any, error) {
				return formatter.FormatIndexResponse(
					repositories,
					formatter.FormatRepositoryResponse,
					sqidManager,
				)
			},
		)
	})
}
