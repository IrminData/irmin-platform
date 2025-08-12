package tools

import (
	"context"

	"irmin-api/db"
	"irmin-api/services"

	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

type MCPTools struct {
	server      *sdkmcp.Server
	apiServices *services.APIServices
	getUser     func(ctx context.Context) (*db.User, bool)
}

func NewMCPTools(
	server *sdkmcp.Server,
	apiServices *services.APIServices,
	getUser func(ctx context.Context) (*db.User, bool),
) *MCPTools {
	return &MCPTools{server: server, apiServices: apiServices, getUser: getUser}
}

// RegisterAll registers all tools in this package.
func (mcpTools *MCPTools) RegisterAll() {
	mcpTools.RegisterWorkspaceTools()
	mcpTools.RegisterRepositoryTools()
	mcpTools.RegisterQueryTools()
}
