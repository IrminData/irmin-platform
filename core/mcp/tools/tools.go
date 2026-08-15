package tools

import (
	"context"

	"irmin-api/db"
	"irmin-api/services"
	"irmin-api/toolregistry"

	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

type MCPTools struct {
	server      *sdkmcp.Server
	apiServices *services.APIServices
	getUser     func(ctx context.Context) (*db.User, bool)
	registry    *toolregistry.Registry
}

func NewMCPTools(
	server *sdkmcp.Server,
	apiServices *services.APIServices,
	getUser func(ctx context.Context) (*db.User, bool),
) *MCPTools {
	return &MCPTools{
		server: server, apiServices: apiServices, getUser: getUser, registry: toolregistry.New(),
	}
}

// RegisterAll registers all tools in this package.
func (mcpTools *MCPTools) RegisterAll() {
	mcpTools.RegisterWorkspaceTools()
	mcpTools.RegisterConnectorTools()
	mcpTools.RegisterConnectionTools()
	mcpTools.RegisterRepositoryTools()
	mcpTools.RegisterRepositoryBranchesTools()
	mcpTools.RegisterRepositoryCommitsTools()
	mcpTools.RegisterRepositoryCompareTools()
	mcpTools.RegisterRepositoryObjectsTools()
	mcpTools.RegisterQueryTools()
	mcpTools.RegisterWorkflowsTools()
	mcpTools.RegisterWorkflowRunsTools()
	mcpTools.RegisterDocsTools()
	mcpTools.RegisterScriptsTools()
	mcpTools.registerCatalogTool()
}

// Catalog returns the deterministic, handler-free tool catalog.
func (mcpTools *MCPTools) Catalog() []toolregistry.Descriptor {
	return mcpTools.registry.List()
}

func (mcpTools *MCPTools) registerCatalogTool() {
	toolregistry.Register(
		mcpTools.registry,
		mcpTools.server,
		"irmin_tool_catalog_list",
		"List the versioned Irmin tool descriptors available in this workspace.",
		func(
			_ context.Context,
			_ *sdkmcp.CallToolRequest,
			_ struct{},
		) (*sdkmcp.CallToolResult, toolregistry.ToolOutput, error) {
			return nil, toolregistry.ToolOutput{Data: mcpTools.Catalog()}, nil
		},
	)
}
