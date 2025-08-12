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

// RegisterQueries registers the queries resource.
func (mcpResources *MCPResources) RegisterQueries() {
	mcpResources.server.AddResource(&sdkmcp.Resource{
		Name:        "queries",
		Description: "List of stored queries in a workspace accessible to the authenticated user",
		MIMEType:    "application/json",
		URI:         "irmin://workspaces/{workspace_slug}/queries",
	}, func(ctx context.Context, _ *sdkmcp.ServerSession, params *sdkmcp.ReadResourceParams) (*sdkmcp.ReadResourceResult, error) {
		return helpers.CreateWorkspaceResourceResponse(
			ctx,
			params.URI,
			"/queries",
			mcpResources.apiServices,
			mcpResources.getUser,
			func(ctx context.Context, user *db.User, workspace *db.Workspace) ([]db.StoredQuery, error) {
				return mcpResources.apiServices.ListWorkspaceQueries(ctx, user, workspace)
			},
			func(queries []db.StoredQuery, sqidManager *irminsqids.SQIDManager) (any, error) {
				return formatter.FormatIndexResponse(
					queries,
					formatter.FormatStoredQueryResponse,
					sqidManager,
				)
			},
		)
	})
}
