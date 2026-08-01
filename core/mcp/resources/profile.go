package resources

import (
	"context"
	"encoding/json"
	"errors"

	"irmin-api/formatter"

	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

// RegisterProfile registers the profile resource.
func (mcpResources *MCPResources) RegisterProfile() {
	mcpResources.server.AddResource(&sdkmcp.Resource{
		Name:        "profile",
		Description: "User information of the authenticated user",
		MIMEType:    "application/json",
		URI:         "irmin://profile",
	}, func(ctx context.Context, _ *sdkmcp.ReadResourceRequest) (*sdkmcp.ReadResourceResult, error) {
		user, ok := mcpResources.getUser(ctx)
		if !ok || user == nil || user.ID == 0 {
			return nil, errors.New("unauthorized")
		}

		// Format the user response using the same formatter as the API
		userResponse, formatUserResponseErr := formatter.FormatUserResponse(user, mcpResources.apiServices.SQIDManager)
		if formatUserResponseErr != nil {
			mcpResources.apiServices.Logger.Error("Error formatting user response", "error", formatUserResponseErr)
			return nil, formatUserResponseErr
		}

		b, _ := json.Marshal(userResponse)
		return &sdkmcp.ReadResourceResult{
			Contents: []*sdkmcp.ResourceContents{
				{URI: "irmin://profile", MIMEType: "application/json", Text: string(b)},
			},
		}, nil
	})
}
