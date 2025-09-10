package mcp

import (
	mcpresources "irmin-api/mcp/resources"
	mcptools "irmin-api/mcp/tools"
	"irmin-api/services"

	"github.com/gofiber/fiber/v3"
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

// RegisterFiber mounts the existing MCP HTTP endpoint and the new HTTP-only attach endpoint.
func RegisterFiber(app *fiber.App, apiServices *services.APIServices) {
	server := sdkmcp.NewServer(&sdkmcp.Implementation{
		Name:    MCPServerName,
		Title:   MCPServerTitle,
		Version: MCPServerVersion,
	}, nil)

	// Register resources and tools.
	mcpResources := mcpresources.NewMCPResources(server, apiServices, userFromContext)
	mcpResources.RegisterAll()

	mcpTools := mcptools.NewMCPTools(server, apiServices, userFromContext)
	mcpTools.RegisterAll()

	// Build the SDK streamable HTTP handler.
	var httpHandler = newStreamableHandler(server)

	cfg := &authConfig{apiServices: apiServices}

	// Register the attach endpoint FIRST (more specific route)
	registerAttachRoute(app, apiServices, httpHandler, cfg)

	// Keep the original endpoint (supports full HTTP-first flow; mcp-remote, Claude, etc.).
	mountHTTPHandler(app, apiServices.Env.MCPHTTPPath, httpHandler, cfg)
}
