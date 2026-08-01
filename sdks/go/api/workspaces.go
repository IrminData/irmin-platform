package irmincore

import (
	"context"
	"fmt"
	"net/http"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
)

// CreateWorkspaceRequest represents the JSON request body for creating a workspace.
type CreateWorkspaceRequest struct {
	Name        string `json:"name"                  validate:"required,max=100" example:"Customer Analytics"`
	Description string `json:"description,omitempty" validate:"max=500"          example:"Customer data analysis and reporting"`
}

// UpdateWorkspaceRequest represents the JSON request body for updating a workspace.
type UpdateWorkspaceRequest struct {
	Name        *string `json:"name,omitempty"        validate:"omitnil,max=100" example:"Customer Analytics"`
	Description *string `json:"description,omitempty" validate:"omitnil,max=500" example:"Customer data analysis and reporting"`
}

// TransferOwnershipRequest represents the JSON request body for transferring workspace ownership.
type TransferOwnershipRequest struct {
	NewOwnerID string `json:"new_owner_id" validate:"required,validsqid=users" example:"usr_2k8n9q1m7p3x4z"`
}

func (c *Client) ListWorkspaces(ctx context.Context) ([]irminmodels.Workspace, *irminmodels.IrminAPIResponse, error) {
	var workspaces []irminmodels.Workspace
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: "/v1/workspaces",
	}, &workspaces)
	if err != nil {
		return nil, nil, fmt.Errorf("list workspaces error: %w", err)
	}
	return workspaces, apiResp, nil
}

func (c *Client) ListWorkspaceSummaries(
	ctx context.Context,
) ([]irminmodels.WorkspaceSummary, *irminmodels.IrminAPIResponse, error) {
	var summaries []irminmodels.WorkspaceSummary
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: "/v1/workspaces/summary",
	}, &summaries)
	if err != nil {
		return nil, nil, fmt.Errorf("list workspace summaries error: %w", err)
	}
	return summaries, apiResp, nil
}

func (c *Client) GetWorkspace(
	ctx context.Context,
	slug string,
) (*irminmodels.Workspace, *irminmodels.IrminAPIResponse, error) {
	var workspace irminmodels.Workspace
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s", slug),
	}, &workspace)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch workspace error: %w", err)
	}
	return &workspace, apiResp, nil
}

func (c *Client) CreateWorkspace(ctx context.Context,
	req CreateWorkspaceRequest,
) (*irminmodels.Workspace, *irminmodels.IrminAPIResponse, error) {
	var workspace irminmodels.Workspace
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/v1/workspaces",
		ContentType: "application/json",
		Body:        req,
	}, &workspace)
	if err != nil {
		return nil, nil, fmt.Errorf("create workspace error: %w", err)
	}
	return &workspace, apiResp, nil
}

func (c *Client) UpdateWorkspace(ctx context.Context,
	workspaceSlug string,
	req UpdateWorkspaceRequest,
) (*irminmodels.Workspace, *irminmodels.IrminAPIResponse, error) {
	var workspace irminmodels.Workspace
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPatch,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s", workspaceSlug),
		ContentType: "application/json",
		Body:        req,
	}, &workspace)
	if err != nil {
		return nil, nil, fmt.Errorf("update workspace error: %w", err)
	}
	return &workspace, apiResp, nil
}

func (c *Client) DeleteWorkspace(ctx context.Context, slug string) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodDelete,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s", slug),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete workspace error: %w", err)
	}
	return apiResp, nil
}

func (c *Client) TransferWorkspace(ctx context.Context,
	workspaceSlug string,
	req TransferOwnershipRequest,
) (*irminmodels.Workspace, *irminmodels.IrminAPIResponse, error) {
	var workspace irminmodels.Workspace
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPatch,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s", workspaceSlug),
		ContentType: "application/json",
		Body:        req,
	}, &workspace)
	if err != nil {
		return nil, nil, fmt.Errorf("transfer workspace error: %w", err)
	}
	return &workspace, apiResp, nil
}

func (c *Client) LeaveWorkspace(ctx context.Context, slug string) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodPatch,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/leave", slug),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("leave workspace error: %w", err)
	}
	return apiResp, nil
}

func (c *Client) GetWorkspaceSchema(
	ctx context.Context,
	slug string,
) (*irminmodels.ObjectSchema, *irminmodels.IrminAPIResponse, error) {
	var workspaceSchema irminmodels.ObjectSchema
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/schema", slug),
	}, &workspaceSchema)
	if err != nil {
		return nil, nil, fmt.Errorf("get workspace schema error: %w", err)
	}
	return &workspaceSchema, apiResp, nil
}
