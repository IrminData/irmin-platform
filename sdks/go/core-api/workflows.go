package irmincore

import (
	"fmt"
	"net/http"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// UpdateWorkflowRequest represents the JSON request body for updating basic workflow info.
type UpdateWorkflowRequest struct {
	Name          string `json:"name,omitempty"          validate:"min=1,max=100"`
	Description   string `json:"description,omitempty"   validate:"max=500"`
	Documentation string `json:"documentation,omitempty" validate:"validdocumentation"`
}

// TransferWorkflowOwnershipRequest represents the JSON request body for transferring workflow ownership.
type TransferWorkflowOwnershipRequest struct {
	NewOwnerID string `json:"new_owner_id" validate:"required,validsqid=users"`
}

// WorkflowRequest represents the JSON request body for creating a workflow.
type WorkflowRequest struct {
	Type          irminmodels.WorkflowableType `json:"type"                    validate:"required,oneof=import action export pipeline"`
	Name          string                       `json:"name"                    validate:"required,min=1,max=100"`
	Description   string                       `json:"description,omitempty"   validate:"max=500"`
	Documentation string                       `json:"documentation,omitempty" validate:"validdocumentation"`

	// Workflowable configuration
	Workflowable irminmodels.Workflowable `json:"workflowable,omitempty"`

	// Schedule configuration
	Schedule irminmodels.Schedule `json:"schedule,omitempty"`
}

func (c *Client) ListWorkflows(workspace string) ([]irminmodels.Workflow, *irminmodels.IrminAPIResponse, error) {
	var workflows []irminmodels.Workflow
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/workflows", workspace),
	}, &workflows)
	if err != nil {
		return nil, nil, fmt.Errorf("list workflows error: %w", err)
	}
	return workflows, apiResp, nil
}

func (c *Client) ListWorkflowsOfType(
	workspace, workflowType string,
) ([]irminmodels.Workflow, *irminmodels.IrminAPIResponse, error) {
	var workflows []irminmodels.Workflow
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/workflows?type=%s", workspace, workflowType),
	}, &workflows)
	if err != nil {
		return nil, nil, fmt.Errorf("list workflows error: %w", err)
	}
	return workflows, apiResp, nil
}

func (c *Client) GetWorkflow(
	workspace, workflowID string,
) (*irminmodels.Workflow, *irminmodels.IrminAPIResponse, error) {
	var workflow irminmodels.Workflow
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/workflows/%s", workspace, workflowID),
	}, &workflow)
	if err != nil {
		return nil, nil, fmt.Errorf("get workflow error: %w", err)
	}
	return &workflow, apiResp, nil
}

func (c *Client) CreateWorkflow(
	workspace string,
	req WorkflowRequest,
) (*irminmodels.Workflow, *irminmodels.IrminAPIResponse, error) {
	var workflow irminmodels.Workflow
	apiResp, err := c.FetchAPI(RequestOptions{
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
	workspace, workflowID string,
	req UpdateWorkflowRequest,
) (*irminmodels.Workflow, *irminmodels.IrminAPIResponse, error) {
	var workflow irminmodels.Workflow
	apiResp, err := c.FetchAPI(RequestOptions{
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
	workspace, workflowID string,
	workflowable irminmodels.Workflowable,
) (*irminmodels.Workflow, *irminmodels.IrminAPIResponse, error) {
	var workflow irminmodels.Workflow
	apiResp, err := c.FetchAPI(RequestOptions{
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
	workspace, workflowID string,
	schedule irminmodels.Schedule,
) (*irminmodels.Workflow, *irminmodels.IrminAPIResponse, error) {
	var workflow irminmodels.Workflow
	apiResp, err := c.FetchAPI(RequestOptions{
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
	workspace, workflowID string,
) (*irminmodels.Workflow, *irminmodels.IrminAPIResponse, error) {
	var workflow irminmodels.Workflow
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodPost,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/workflows/%s/pause", workspace, workflowID),
	}, &workflow)
	if err != nil {
		return nil, nil, fmt.Errorf("pause workflow error: %w", err)
	}
	return &workflow, apiResp, nil
}

func (c *Client) StartWorkflow(
	workspace, workflowID string,
) (*irminmodels.Workflow, *irminmodels.IrminAPIResponse, error) {
	var workflow irminmodels.Workflow
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodPost,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/workflows/%s/start", workspace, workflowID),
	}, &workflow)
	if err != nil {
		return nil, nil, fmt.Errorf("start workflow error: %w", err)
	}
	return &workflow, apiResp, nil
}

func (c *Client) DeleteWorkflow(workspace, workflowID string) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodDelete,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/workflows/%s", workspace, workflowID),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete workflow error: %w", err)
	}
	return apiResp, nil
}

func (c *Client) TransferWorkflow(
	workspace, workflowID, newOwnerID string,
) (*irminmodels.Workflow, *irminmodels.IrminAPIResponse, error) {
	var workflow irminmodels.Workflow
	apiResp, err := c.FetchAPI(RequestOptions{
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
