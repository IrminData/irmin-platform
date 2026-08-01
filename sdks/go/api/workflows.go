package irmincore

import (
	"context"
	"fmt"
	"net/http"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
)

// UpdateWorkflowRequest represents the JSON request body for updating basic workflow info.
type UpdateWorkflowRequest struct {
	Name          *string `json:"name,omitempty"          validate:"omitnil,max=100"            example:"Customer Analytics"`
	Description   *string `json:"description,omitempty"   validate:"omitnil,max=500"            example:"Customer data analysis and reporting"`
	Documentation *string `json:"documentation,omitempty" validate:"omitnil,validdocumentation" example:"# Customer Analytics Workflow"`
}

// TransferWorkflowOwnershipRequest represents the JSON request body for transferring workflow ownership.
type TransferWorkflowOwnershipRequest struct {
	NewOwnerID string `json:"new_owner_id" validate:"required,validsqid=users" example:"usr_2k8n9q1m7p3x4z"`
}

// WorkflowRequest represents the JSON request body for creating a workflow.
type WorkflowRequest struct {
	Type          irminmodels.WorkflowableType `json:"type"                    validate:"required,oneof=import action export pipeline" example:"import"`
	Name          string                       `json:"name"                    validate:"required,max=100"                             example:"Customer Analytics"`
	Description   string                       `json:"description,omitempty"   validate:"omitempty,max=500"                            example:"Customer data analysis and reporting"`
	Documentation string                       `json:"documentation,omitempty" validate:"validdocumentation"                           example:"# Customer Analytics Workflow"`

	// Workflowable configuration
	Workflowable irminmodels.Workflowable `json:"workflowable"`

	// Schedule configuration
	Schedule irminmodels.Schedule `json:"schedule"`

	// Tags
	Tags []string `json:"tags,omitempty" validate:"omitempty,dive,validsqid=tags" example:"tag_7k3m9x2n5q8p"`
}

func (c *Client) ListWorkflows(
	ctx context.Context,
	workspace string,
) ([]irminmodels.Workflow, *irminmodels.IrminAPIResponse, error) {
	var workflows []irminmodels.Workflow
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/workflows", workspace),
	}, &workflows)
	if err != nil {
		return nil, nil, fmt.Errorf("list workflows error: %w", err)
	}
	return workflows, apiResp, nil
}

func (c *Client) ListWorkflowsOfType(
	ctx context.Context,
	workspace, workflowType string,
) ([]irminmodels.Workflow, *irminmodels.IrminAPIResponse, error) {
	var workflows []irminmodels.Workflow
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/workflows?type=%s", workspace, workflowType),
	}, &workflows)
	if err != nil {
		return nil, nil, fmt.Errorf("list workflows error: %w", err)
	}
	return workflows, apiResp, nil
}

func (c *Client) GetWorkflow(
	ctx context.Context,
	workspace, workflowID string,
) (*irminmodels.Workflow, *irminmodels.IrminAPIResponse, error) {
	var workflow irminmodels.Workflow
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/workflows/%s", workspace, workflowID),
	}, &workflow)
	if err != nil {
		return nil, nil, fmt.Errorf("get workflow error: %w", err)
	}
	return &workflow, apiResp, nil
}

func (c *Client) CreateWorkflow(
	ctx context.Context,
	workspace string,
	req WorkflowRequest,
) (*irminmodels.Workflow, *irminmodels.IrminAPIResponse, error) {
	var workflow irminmodels.Workflow
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/workflows", workspace),
		ContentType: "application/json",
		Body:        req,
	}, &workflow)
	if err != nil {
		return nil, nil, fmt.Errorf("create workflow error: %w", err)
	}
	return &workflow, apiResp, nil
}

func (c *Client) UpdateWorkflow(
	ctx context.Context,
	workspace, workflowID string,
	req UpdateWorkflowRequest,
) (*irminmodels.Workflow, *irminmodels.IrminAPIResponse, error) {
	var workflow irminmodels.Workflow
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPatch,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/workflows/%s", workspace, workflowID),
		ContentType: "application/json",
		Body:        req,
	}, &workflow)
	if err != nil {
		return nil, nil, fmt.Errorf("update workflow error: %w", err)
	}
	return &workflow, apiResp, nil
}

func (c *Client) UpdateWorkflowWorkflowable(
	ctx context.Context,
	workspace, workflowID string,
	workflowable irminmodels.Workflowable,
) (*irminmodels.Workflow, *irminmodels.IrminAPIResponse, error) {
	var workflow irminmodels.Workflow
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPatch,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/workflows/%s/workflowable", workspace, workflowID),
		ContentType: "application/json",
		Body:        workflowable,
	}, &workflow)
	if err != nil {
		return nil, nil, fmt.Errorf("update workflow workflowable error: %w", err)
	}
	return &workflow, apiResp, nil
}

func (c *Client) UpdateWorkflowSchedule(
	ctx context.Context,
	workspace, workflowID string,
	schedule irminmodels.Schedule,
) (*irminmodels.Workflow, *irminmodels.IrminAPIResponse, error) {
	var workflow irminmodels.Workflow
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPatch,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/workflows/%s/schedule", workspace, workflowID),
		ContentType: "application/json",
		Body:        schedule,
	}, &workflow)
	if err != nil {
		return nil, nil, fmt.Errorf("update workflow schedule error: %w", err)
	}
	return &workflow, apiResp, nil
}

func (c *Client) PauseWorkflow(
	ctx context.Context,
	workspace, workflowID string,
) (*irminmodels.Workflow, *irminmodels.IrminAPIResponse, error) {
	var workflow irminmodels.Workflow
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodPost,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/workflows/%s/pause", workspace, workflowID),
	}, &workflow)
	if err != nil {
		return nil, nil, fmt.Errorf("pause workflow error: %w", err)
	}
	return &workflow, apiResp, nil
}

func (c *Client) StartWorkflow(
	ctx context.Context,
	workspace, workflowID string,
) (*irminmodels.Workflow, *irminmodels.IrminAPIResponse, error) {
	var workflow irminmodels.Workflow
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodPost,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/workflows/%s/start", workspace, workflowID),
	}, &workflow)
	if err != nil {
		return nil, nil, fmt.Errorf("start workflow error: %w", err)
	}
	return &workflow, apiResp, nil
}

func (c *Client) DeleteWorkflow(
	ctx context.Context,
	workspace, workflowID string,
) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodDelete,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/workflows/%s", workspace, workflowID),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete workflow error: %w", err)
	}
	return apiResp, nil
}

func (c *Client) TransferWorkflow(
	ctx context.Context,
	workspace, workflowID, newOwnerID string,
) (*irminmodels.Workflow, *irminmodels.IrminAPIResponse, error) {
	var workflow irminmodels.Workflow
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/workflows/%s/transfer-ownership", workspace, workflowID),
		ContentType: "application/json",
		Body:        TransferWorkflowOwnershipRequest{NewOwnerID: newOwnerID},
	}, &workflow)
	if err != nil {
		return nil, nil, fmt.Errorf("workflow ownership transfer error: %w", err)
	}
	return &workflow, apiResp, nil
}
