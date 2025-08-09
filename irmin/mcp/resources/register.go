package resources

import (
	"context"

	"irmin-api/db"
	"irmin-api/services"

	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

// RegisterAll registers all resources in this package.
func RegisterAll(
	server *sdkmcp.Server,
	apiServices *services.APIServices,
	getUser func(ctx context.Context) (*db.User, bool),
) {
	RegisterProfile(server, apiServices, getUser)
	RegisterWorkspaces(server, apiServices, getUser)
}
