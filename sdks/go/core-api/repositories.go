package irmincore

import (
	"fmt"
	"net/http"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// CreateRepositoryRequest represents the JSON request body for creating a repository.
type CreateRepositoryRequest struct {
	Name                              string `json:"name"                                            validate:"required,min=1,max=100"`
	Description                       string `json:"description,omitempty"                           validate:"max=500"`
	Documentation                     string `json:"documentation,omitempty"                         validate:"validdocumentation"`
	DefaultBranch                     string `json:"default_branch,omitempty"                        validate:"validslug"`
	IsImmutable                       bool   `json:"is_immutable,omitempty"`
	GarbageDefaultRetentionDays       int    `json:"garbage_default_retention_days,omitempty"        validate:"min=1,max=3650"`
	GarbageDefaultBranchRetentionDays int    `json:"garbage_default_branch_retention_days,omitempty" validate:"min=1,max=3650"`
}

// UpdateRepositoryRequest represents the JSON request body for updating a repository.
type UpdateRepositoryRequest struct {
	Name                              string `json:"name,omitempty"                                  validate:"min=1,max=100"`
	Description                       string `json:"description,omitempty"                           validate:"max=500"`
	Documentation                     string `json:"documentation,omitempty"                         validate:"validdocumentation"`
	IsImmutable                       *bool  `json:"is_immutable,omitempty"`
	GarbageDefaultRetentionDays       int    `json:"garbage_default_retention_days,omitempty"        validate:"min=1,max=3650"`
	GarbageDefaultBranchRetentionDays int    `json:"garbage_default_branch_retention_days,omitempty" validate:"min=1,max=3650"`
}

// TransferRepositoryOwnershipRequest represents the JSON request body for transferring repository ownership.
type TransferRepositoryOwnershipRequest struct {
	NewOwnerID string `json:"new_owner_id" validate:"required,validsqid=users"`
}

func (c *Client) ListRepositories(workspace string) ([]irminmodels.Repository, *irminmodels.IrminAPIResponse, error) {
	var repositories []irminmodels.Repository
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/repositories", workspace),
	}, &repositories)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch repositories error: %w", err)
	}
	return repositories, apiResp, nil
}

func (c *Client) GetRepository(workspace, slug string) (*irminmodels.Repository, *irminmodels.IrminAPIResponse, error) {
	var repository irminmodels.Repository
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/repositories/%s", workspace, slug),
	}, &repository)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch repository error: %w", err)
	}
	return &repository, apiResp, nil
}

func (c *Client) CreateRepository(
	workspace string,
	req CreateRepositoryRequest,
) (*irminmodels.Repository, *irminmodels.IrminAPIResponse, error) {
	var repository irminmodels.Repository
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/repositories", workspace),
		ContentType: "application/json",
		Body:        req,
	}, &repository)
	if err != nil {
		return nil, nil, fmt.Errorf("create repository error: %w", err)
	}

	return &repository, apiResp, nil
}

func (c *Client) UpdateRepository(
	workspace, slug string,
	req UpdateRepositoryRequest,
) (*irminmodels.Repository, *irminmodels.IrminAPIResponse, error) {
	var repository irminmodels.Repository
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPatch,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/repositories/%s", workspace, slug),
		ContentType: "application/json",
		Body:        req,
	}, &repository)
	if err != nil {
		return nil, nil, fmt.Errorf("update repository error: %w", err)
	}

	return &repository, apiResp, nil
}

func (c *Client) TransferRepository(
	workspace, slug string,
	req TransferRepositoryOwnershipRequest,
) (*irminmodels.Repository, *irminmodels.IrminAPIResponse, error) {
	var repository irminmodels.Repository
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPatch,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/repositories/%s/transfer-ownership", workspace, slug),
		ContentType: "application/json",
		Body:        req,
	}, &repository)
	if err != nil {
		return nil, nil, fmt.Errorf("repository ownership transfer error: %w", err)
	}

	return &repository, apiResp, nil
}

func (c *Client) DeleteRepository(workspace, slug string) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodDelete,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/repositories/%s", workspace, slug),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete repository error: %w", err)
	}

	return apiResp, nil
}
