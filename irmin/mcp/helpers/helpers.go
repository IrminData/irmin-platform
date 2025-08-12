package helpers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"irmin-api/db"
	"irmin-api/services"

	irminsqids "github.com/IrminData/irmin-sdk-go/sqids"
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
		return MCPError("Failed to format response"), err
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

// GetWorkspaceFromSlug retrieves a workspace by slug with proper error handling.
func GetWorkspaceFromSlug(
	ctx context.Context,
	apiServices *services.APIServices,
	user *db.User,
	workspaceSlug string,
) (*db.Workspace, error) {
	workspace, err := apiServices.GetWorkspace(ctx, user, workspaceSlug)
	if err != nil {
		return nil, fmt.Errorf("failed to get workspace: %w", err)
	}
	return workspace, nil
}

// ParseWorkspaceSlugFromURI extracts workspace slug from MCP resource URIs.
func ParseWorkspaceSlugFromURI(uri, suffix string) (string, error) {
	if uri == "" {
		return "", errors.New("workspace slug is required in URI")
	}

	const prefix = "irmin://workspaces/"
	if !strings.HasPrefix(uri, prefix) || !strings.HasSuffix(uri, suffix) {
		return "", fmt.Errorf("invalid URI format, expected %s{workspace_slug}%s", prefix, suffix)
	}

	workspaceSlug := strings.TrimPrefix(strings.TrimSuffix(uri, suffix), prefix)
	if workspaceSlug == "" || workspaceSlug == "{workspace_slug}" {
		return "", errors.New("workspace slug is required")
	}

	return workspaceSlug, nil
}

// CreateWorkspaceResourceResponse creates a standardized response for workspace-scoped resources.
func CreateWorkspaceResourceResponse[T any](
	ctx context.Context,
	uri string,
	suffix string,
	apiServices *services.APIServices,
	getUser func(ctx context.Context) (*db.User, bool),
	getItems func(ctx context.Context, user *db.User, workspace *db.Workspace) ([]T, error),
	formatItems func([]T, *irminsqids.SQIDManager) (any, error),
) (*sdkmcp.ReadResourceResult, error) {
	// Validate user
	user, err := ValidateUser(ctx, getUser)
	if err != nil {
		return nil, err
	}

	// Parse workspace slug from URI
	workspaceSlug, err := ParseWorkspaceSlugFromURI(uri, suffix)
	if err != nil {
		return nil, err
	}

	// Get the workspace
	workspace, err := GetWorkspaceFromSlug(ctx, apiServices, user, workspaceSlug)
	if err != nil {
		return nil, err
	}

	// Get the items
	items, err := getItems(ctx, user, workspace)
	if err != nil {
		return nil, fmt.Errorf("failed to load items: %w", err)
	}

	// Format the items
	response, formatErr := formatItems(items, apiServices.SQIDManager)
	if formatErr != nil {
		apiServices.Logger.ErrorContext(ctx, "Error formatting items", "error", formatErr)
		return nil, formatErr
	}

	b, _ := json.Marshal(response)
	return &sdkmcp.ReadResourceResult{
		Contents: []*sdkmcp.ResourceContents{
			{URI: uri, MIMEType: "application/json", Text: string(b)},
		},
	}, nil
}
