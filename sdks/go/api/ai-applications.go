package irmincore

import (
	"context"
	"fmt"
	"net/http"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// CreateAIApplicationRequest represents the JSON request body for creating an AI application.
type CreateAIApplicationRequest struct {
	Name           string                                `json:"name"            validate:"required,max=100"              example:"Customer Analytics App"`
	Description    string                                `json:"description"     validate:"max=500"                       example:"AI application for customer data analysis"`
	Documentation  string                                `json:"documentation"   validate:"validdocumentation"            example:"# Customer Analytics"`
	AllowedOrigins []string                              `json:"allowed_origins" validate:"dive,max=255"                  example:"https://app.example.com,http://localhost:3000"`
	DataSources    []irminmodels.AIApplicationDataSource `json:"data_sources"    validate:"dive"`
	Tags           []string                              `json:"tags,omitempty"  validate:"omitempty,dive,validsqid=tags" example:"tag_7k3m9x2n5q8p"`
}

// UpdateAIApplicationRequest represents the JSON request body for updating an AI application.
type UpdateAIApplicationRequest struct {
	Name           *string                               `json:"name,omitempty"            validate:"omitempty,max=100"             example:"Customer Analytics App"`
	Description    *string                               `json:"description,omitempty"     validate:"omitempty,max=500"             example:"AI application for customer data analysis"`
	Documentation  *string                               `json:"documentation,omitempty"   validate:"validdocumentation"            example:"# Customer Analytics"`
	AllowedOrigins []string                              `json:"allowed_origins,omitempty" validate:"omitempty,dive,max=255"`
	DataSources    []irminmodels.AIApplicationDataSource `json:"data_sources,omitempty"    validate:"omitempty,dive"`
	Tags           []string                              `json:"tags,omitempty"            validate:"omitempty,dive,validsqid=tags"`
}

// TransferAIApplicationOwnershipRequest represents the JSON request body for transferring AI application ownership.
type TransferAIApplicationOwnershipRequest struct {
	NewOwnerID string `json:"new_owner_id" validate:"required,validsqid=users" example:"usr_2k8n9q1m7p3x4z"`
}

// ListAIApplications retrieves all AI applications in a workspace.
func (c *Client) ListAIApplications(
	ctx context.Context,
	workspace string,
) ([]irminmodels.AIApplication, *irminmodels.IrminAPIResponse, error) {
	var aiApplications []irminmodels.AIApplication
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/ai-applications", workspace),
	}, &aiApplications)
	if err != nil {
		return nil, nil, fmt.Errorf("list AI applications error: %w", err)
	}
	return aiApplications, apiResp, nil
}

// GetAIApplication retrieves a specific AI application by ID.
func (c *Client) GetAIApplication(
	ctx context.Context,
	workspace, aiApplicationID string,
) (*irminmodels.AIApplication, *irminmodels.IrminAPIResponse, error) {
	var aiApplication irminmodels.AIApplication
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/ai-applications/%s", workspace, aiApplicationID),
	}, &aiApplication)
	if err != nil {
		return nil, nil, fmt.Errorf("get AI application error: %w", err)
	}
	return &aiApplication, apiResp, nil
}

// CreateAIApplication creates a new AI application.
func (c *Client) CreateAIApplication(
	ctx context.Context,
	workspace string,
	req CreateAIApplicationRequest,
) (*irminmodels.AIApplication, *irminmodels.IrminAPIResponse, error) {
	var aiApplication irminmodels.AIApplication
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/ai-applications", workspace),
		ContentType: "application/json",
		Body:        req,
	}, &aiApplication)
	if err != nil {
		return nil, nil, fmt.Errorf("create AI application error: %w", err)
	}
	return &aiApplication, apiResp, nil
}

// UpdateAIApplication updates an existing AI application.
func (c *Client) UpdateAIApplication(
	ctx context.Context,
	workspace, aiApplicationID string,
	req UpdateAIApplicationRequest,
) (*irminmodels.AIApplication, *irminmodels.IrminAPIResponse, error) {
	var aiApplication irminmodels.AIApplication
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPatch,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/ai-applications/%s", workspace, aiApplicationID),
		ContentType: "application/json",
		Body:        req,
	}, &aiApplication)
	if err != nil {
		return nil, nil, fmt.Errorf("update AI application error: %w", err)
	}
	return &aiApplication, apiResp, nil
}

// DeleteAIApplication deletes an AI application.
func (c *Client) DeleteAIApplication(
	ctx context.Context,
	workspace, aiApplicationID string,
) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodDelete,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/ai-applications/%s", workspace, aiApplicationID),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete AI application error: %w", err)
	}
	return apiResp, nil
}

// TransferAIApplication transfers ownership of an AI application to another user.
func (c *Client) TransferAIApplication(
	ctx context.Context,
	workspace, aiApplicationID, newOwnerID string,
) (*irminmodels.AIApplication, *irminmodels.IrminAPIResponse, error) {
	var aiApplication irminmodels.AIApplication
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/ai-applications/%s/transfer-ownership", workspace, aiApplicationID),
		ContentType: "application/json",
		Body:        TransferAIApplicationOwnershipRequest{NewOwnerID: newOwnerID},
	}, &aiApplication)
	if err != nil {
		return nil, nil, fmt.Errorf("AI application ownership transfer error: %w", err)
	}
	return &aiApplication, apiResp, nil
}
