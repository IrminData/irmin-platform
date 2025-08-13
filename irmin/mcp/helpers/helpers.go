package helpers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"irmin-api/db"

	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

// MCPError creates a standardized error response for MCP tools.
func MCPError(message string) *sdkmcp.CallToolResultFor[struct{}] {
	return &sdkmcp.CallToolResultFor[struct{}]{
		IsError: true,
		Content: []sdkmcp.Content{&sdkmcp.TextContent{Text: message}},
	}
}

// MCPSuccess creates a standardized success response for MCP tools with JSON data.
func MCPSuccess(data any) (*sdkmcp.CallToolResultFor[struct{}], error) {
	b, err := json.Marshal(data)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal response data: %w", err)
	}

	return &sdkmcp.CallToolResultFor[struct{}]{
		Content: []sdkmcp.Content{&sdkmcp.TextContent{
			Text: string(b),
			Meta: sdkmcp.Meta{"mimeType": "application/json"},
		}},
	}, nil
}

// ValidateUser checks if the user is authenticated and authorized.
func ValidateUser(ctx context.Context, getUser func(ctx context.Context) (*db.User, bool)) (*db.User, error) {
	user, ok := getUser(ctx)
	if !ok || user == nil || user.ID == 0 {
		return nil, errors.New("unauthorized")
	}
	return user, nil
}
