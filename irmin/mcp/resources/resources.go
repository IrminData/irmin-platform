package resources

import (
	"context"

	"irmin-api/db"
	"irmin-api/services"

	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

type MCPResources struct {
	server      *sdkmcp.Server
	apiServices *services.APIServices
	getUser     func(ctx context.Context) (*db.User, bool)
}

func NewMCPResources(
	server *sdkmcp.Server,
	apiServices *services.APIServices,
	getUser func(ctx context.Context) (*db.User, bool),
) *MCPResources {
	return &MCPResources{server: server, apiServices: apiServices, getUser: getUser}
}

// RegisterAll registers all resources in this package.
func (mcpResources *MCPResources) RegisterAll() {
	mcpResources.RegisterProfile()
	mcpResources.RegisterWorkspaces()
	mcpResources.RegisterRepositories()
	mcpResources.RegisterQueries()
}
