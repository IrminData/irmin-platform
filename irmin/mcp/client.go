package mcp

import (
	"context"
	"fmt"
	"irmin-api/services"
	"net/http"
	"time"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

const (
	HTTPClientTimeout = 10 * time.Second
)

// CreateMCPClientSession creates a new MCP client session
func CreateMCPClientSession(ctx context.Context, apiServices *services.APIServices) (*mcp.ClientSession, error) {
	mcpURL := fmt.Sprintf("%s%s", apiServices.Env.URL, apiServices.Env.MCPHTTPPath)
	client := mcp.NewClient(&mcp.Implementation{Name: "irmin-mcp-client", Version: "v1.0.0"}, &mcp.ClientOptions{})
	streamableClientTransport := &mcp.StreamableClientTransport{
		Endpoint: mcpURL,
		HTTPClient: &http.Client{
			Timeout: HTTPClientTimeout,
		},
	}
	cs, err := client.Connect(ctx, streamableClientTransport, &mcp.ClientSessionOptions{})

	if err != nil {
		return nil, fmt.Errorf("failed to connect to MCP client: %w", err)
	}

	return cs, nil
}
