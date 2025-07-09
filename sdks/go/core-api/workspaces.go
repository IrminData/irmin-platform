package irmincore

import (
	"fmt"
	"net/http"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// CreateWorkspaceRequest represents the JSON request body for creating a workspace.
type CreateWorkspaceRequest struct {
	Name        string `json:"name"                  validate:"required,min=1,max=100"`
	Description string `json:"description,omitempty" validate:"max=500"`
}

// UpdateWorkspaceRequest represents the JSON request body for updating a workspace.
type UpdateWorkspaceRequest struct {
	Name        string `json:"name,omitempty"        validate:"min=1,max=100"`
	Description string `json:"description,omitempty" validate:"max=500"`
}

// TransferOwnershipRequest represents the JSON request body for transferring workspace ownership.
type TransferOwnershipRequest struct {
	NewOwnerID string `json:"new_owner_id" validate:"required,validsqid=users"`
}

func (c *Client) ListWorkspaces() ([]irminmodels.Workspace, *irminmodels.IrminAPIResponse, error) {
	var workspaces []irminmodels.Workspace
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: "/v1/workspaces",
	}, &workspaces)
	if err != nil {
		return nil, nil, fmt.Errorf("list workspaces error: %w", err)
	}
	return workspaces, apiResp, nil
}

func (c *Client) GetWorkspace(slug string) (*irminmodels.Workspace, *irminmodels.IrminAPIResponse, error) {
	var workspace irminmodels.Workspace
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s", slug),
	}, &workspace)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch workspace error: %w", err)
	}
	return &workspace, apiResp, nil
}

func (c *Client) CreateWorkspace(
	req CreateWorkspaceRequest,
) (*irminmodels.Workspace, *irminmodels.IrminAPIResponse, error) {
	var workspace irminmodels.Workspace
	apiResp, err := c.FetchAPI(RequestOptions{
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

func (c *Client) UpdateWorkspace(
	workspaceSlug string,
	req UpdateWorkspaceRequest,
) (*irminmodels.Workspace, *irminmodels.IrminAPIResponse, error) {
	var workspace irminmodels.Workspace
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPut,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s", workspaceSlug),
		ContentType: "application/json",
		Body:        req,
	}, &workspace)
	if err != nil {
		return nil, nil, fmt.Errorf("update workspace error: %w", err)
	}
	return &workspace, apiResp, nil
}

func (c *Client) DeleteWorkspace(slug string) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodDelete,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s", slug),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete workspace error: %w", err)
	}
	return apiResp, nil
}

func (c *Client) TransferWorkspace(
	workspaceSlug string,
	req TransferOwnershipRequest,
) (*irminmodels.Workspace, *irminmodels.IrminAPIResponse, error) {
	var workspace irminmodels.Workspace
	apiResp, err := c.FetchAPI(RequestOptions{
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

func (c *Client) LeaveWorkspace(slug string) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodPatch,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/leave", slug),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("leave workspace error: %w", err)
	}
	return apiResp, nil
}

func (c *Client) GetWorkspaceSchema(slug string) (*irminmodels.ObjectSchema, *irminmodels.IrminAPIResponse, error) {
	var workspaceSchema irminmodels.ObjectSchema
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/schema", slug),
	}, &workspaceSchema)
	if err != nil {
		return nil, nil, fmt.Errorf("get workspace schema error: %w", err)
	}
	return &workspaceSchema, apiResp, nil
}
