package tools

import (
	"context"
	"encoding/json"
	"strings"

	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/services"

	irmincore "github.com/IrminData/irmin-sdk-go/core-api"
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

type CreateWorkspaceArgs struct {
	Name        string `json:"name"        jsonschema:"required,The name of the workspace"`
	Description string `json:"description" jsonschema:"Description of the workspace"`
}

// RegisterCreateWorkspace registers the create_workspace tool.
func RegisterCreateWorkspace(
	server *sdkmcp.Server,
	apiServices *services.APIServices,
	getUser func(ctx context.Context) (*db.User, bool),
) {
	sdkmcp.AddTool(
		server,
		&sdkmcp.Tool{Name: "create_workspace", Description: "Create a new workspace for the current user"},
		func(ctx context.Context, _ *sdkmcp.ServerSession, params *sdkmcp.CallToolParamsFor[CreateWorkspaceArgs]) (*sdkmcp.CallToolResultFor[struct{}], error) {
			user, ok := getUser(ctx)
			if !ok || user == nil || user.ID == 0 {
				return &sdkmcp.CallToolResultFor[struct{}]{
					IsError: true,
					Content: []sdkmcp.Content{&sdkmcp.TextContent{Text: "Unauthorized"}},
				}, nil
			}
			name := strings.TrimSpace(params.Arguments.Name)
			if name == "" {
				return &sdkmcp.CallToolResultFor[struct{}]{
					IsError: true,
					Content: []sdkmcp.Content{&sdkmcp.TextContent{Text: "Name is required"}},
				}, nil
			}

			// Create the request object
			req := irmincore.CreateWorkspaceRequest{
				Name:        name,
				Description: params.Arguments.Description,
			}

			// Use the service to create the workspace
			newWorkspace, err := apiServices.CreateWorkspace(ctx, user, req)
			if err != nil {
				apiServices.Logger.Error("workspace creation failed", "error", err)
				return &sdkmcp.CallToolResultFor[struct{}]{
					IsError: true,
					Content: []sdkmcp.Content{&sdkmcp.TextContent{Text: "Workspace creation failed"}},
				}, nil
			}

			// Format the response using the same formatter as the API
			formatted, ferr := formatter.FormatWorkspaceResponse(newWorkspace, apiServices.SQIDManager)
			if ferr != nil {
				return &sdkmcp.CallToolResultFor[struct{}]{
					IsError: true,
					Content: []sdkmcp.Content{&sdkmcp.TextContent{Text: "Failed to format workspace"}},
				}, ferr
			}
			b, _ := json.Marshal(formatted)
			return &sdkmcp.CallToolResultFor[struct{}]{
				Content: []sdkmcp.Content{&sdkmcp.TextContent{Text: string(b)}},
			}, nil
		},
	)
}
