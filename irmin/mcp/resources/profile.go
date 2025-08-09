package resources

import (
	"context"
	"encoding/json"
	"errors"

	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/services"

	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

// RegisterProfile registers the profile resource.
func RegisterProfile(
	server *sdkmcp.Server,
	apiServices *services.APIServices,
	getUser func(ctx context.Context) (*db.User, bool),
) {
	server.AddResource(&sdkmcp.Resource{
		Name:        "profile",
		Description: "User information of the authenticated user",
		MIMEType:    "application/json",
		URI:         "irmin://profile",
	}, func(ctx context.Context, _ *sdkmcp.ServerSession, _ *sdkmcp.ReadResourceParams) (*sdkmcp.ReadResourceResult, error) {
		user, ok := getUser(ctx)
		if !ok || user == nil || user.ID == 0 {
			return nil, errors.New("unauthorized")
		}

		// Format the user response using the same formatter as the API
		userResponse, formatUserResponseErr := formatter.FormatUserResponse(user, apiServices.SQIDManager)
		if formatUserResponseErr != nil {
			apiServices.Logger.Error("Error formatting user response", "error", formatUserResponseErr)
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
