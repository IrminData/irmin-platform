package resources

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"irmin-api/formatter"

	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

// RegisterWorkspaces registers the workspaces resource.
func (mcpResources *MCPResources) RegisterWorkspaces() {
	mcpResources.server.AddResource(&sdkmcp.Resource{
		Name:        "workspaces",
		Description: "List of workspaces accessible to the authenticated user",
		MIMEType:    "application/json",
		URI:         "irmin://workspaces",
	}, func(ctx context.Context, _ *sdkmcp.ServerSession, _ *sdkmcp.ReadResourceParams) (*sdkmcp.ReadResourceResult, error) {
		user, ok := mcpResources.getUser(ctx)
		if !ok || user == nil || user.ID == 0 {
			return nil, errors.New("unauthorized")
		}

		// Use the service to get workspaces
		workspaces, err := mcpResources.apiServices.ListWorkspaces(user)
		if err != nil {
			return nil, fmt.Errorf("failed to load workspaces: %w", err)
		}

		// Format the workspaces using the same formatter as the API
		workspacesResponse, formatErr := formatter.FormatIndexResponse(
			workspaces,
			formatter.FormatWorkspaceResponse,
			mcpResources.apiServices.SQIDManager,
		)
		if formatErr != nil {
			mcpResources.apiServices.Logger.Error("Error formatting workspaces", "error", formatErr)
			return nil, formatErr
		}

		b, _ := json.Marshal(workspacesResponse)
		return &sdkmcp.ReadResourceResult{
			Contents: []*sdkmcp.ResourceContents{
				{URI: "irmin://workspaces", MIMEType: "application/json", Text: string(b)},
			},
		}, nil
	})
}
