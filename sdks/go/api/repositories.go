package irmincore

import (
	"context"
	"fmt"
	"net/http"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// CreateRepositoryRequest represents the JSON request body for creating a repository.
type CreateRepositoryRequest struct {
	Name                              string `json:"name"                                            validate:"required,max=100"   example:"Customer Analytics"`
	Description                       string `json:"description,omitempty"                           validate:"max=500"            example:"Customer data analysis and reporting"`
	Documentation                     string `json:"documentation,omitempty"                         validate:"validdocumentation" example:"# Customer Analytics Repository"`
	DefaultBranch                     string `json:"default_branch,omitempty"                        validate:"validslug"          example:"main"`
	IsImmutable                       bool   `json:"is_immutable,omitempty"                                                        example:"false"`
	GarbageDefaultRetentionDays       *int   `json:"garbage_default_retention_days,omitempty"                                      example:"30"`
	GarbageDefaultBranchRetentionDays *int   `json:"garbage_default_branch_retention_days,omitempty"                               example:"30"`
}

// UpdateRepositoryRequest represents the JSON request body for updating a repository.
type UpdateRepositoryRequest struct {
	Name                              string `json:"name,omitempty"                                  validate:"max=100"            example:"Customer Analytics"`
	Description                       string `json:"description,omitempty"                           validate:"max=500"            example:"Customer data analysis and reporting"`
	Documentation                     string `json:"documentation,omitempty"                         validate:"validdocumentation" example:"# Customer Analytics Repository"`
	IsImmutable                       *bool  `json:"is_immutable,omitempty"                                                        example:"false"`
	GarbageDefaultRetentionDays       *int   `json:"garbage_default_retention_days,omitempty"                                      example:"30"`
	GarbageDefaultBranchRetentionDays *int   `json:"garbage_default_branch_retention_days,omitempty"                               example:"30"`
}

// TransferRepositoryOwnershipRequest represents the JSON request body for transferring repository ownership.
type TransferRepositoryOwnershipRequest struct {
	NewOwnerID string `json:"new_owner_id" validate:"required,validsqid=users" example:"usr_2k8n9q1m7p3x4z"`
}

func (c *Client) ListRepositories(
	ctx context.Context,
	workspace string,
) ([]irminmodels.Repository, *irminmodels.IrminAPIResponse, error) {
	var repositories []irminmodels.Repository
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/repositories", workspace),
	}, &repositories)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch repositories error: %w", err)
	}
	return repositories, apiResp, nil
}

func (c *Client) GetRepository(
	ctx context.Context,
	workspace, slug string,
) (*irminmodels.Repository, *irminmodels.IrminAPIResponse, error) {
	var repository irminmodels.Repository
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/repositories/%s", workspace, slug),
	}, &repository)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch repository error: %w", err)
	}
	return &repository, apiResp, nil
}

func (c *Client) CreateRepository(
	ctx context.Context,
	workspace string,
	req CreateRepositoryRequest,
) (*irminmodels.Repository, *irminmodels.IrminAPIResponse, error) {
	var repository irminmodels.Repository
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
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
	ctx context.Context,
	workspace, slug string,
	req UpdateRepositoryRequest,
) (*irminmodels.Repository, *irminmodels.IrminAPIResponse, error) {
	var repository irminmodels.Repository
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
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
	ctx context.Context,
	workspace, slug string,
	req TransferRepositoryOwnershipRequest,
) (*irminmodels.Repository, *irminmodels.IrminAPIResponse, error) {
	var repository irminmodels.Repository
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
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

func (c *Client) DeleteRepository(ctx context.Context, workspace, slug string) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodDelete,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/repositories/%s", workspace, slug),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete repository error: %w", err)
	}

	return apiResp, nil
}
