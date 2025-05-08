package irmincore

import (
	"fmt"
	"net/http"

	"maps"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	irminutils "github.com/IrminData/irmin-sdk-go/utils"
)

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
	workspace, name, description, documentation string,
	workflowable irminmodels.Workflowable,
	schedule irminmodels.Schedule,
) (*irminmodels.Workflow, *irminmodels.IrminAPIResponse, error) {
	fields := map[string]string{
		"name":          name,
		"description":   description,
		"documentation": documentation,
	}
	// Add schedule data
	scheduleFields, err := irminutils.PrepareWorkflowScheduleData(schedule)
	if err != nil {
		return nil, nil, fmt.Errorf("prepare schedule data error: %w", err)
	}
	maps.Copy(fields, scheduleFields)

	// Add workflowable data
	worklowableFields, err := irminutils.PrepareWorkflowableData(workflowable)
	if err != nil {
		return nil, nil, fmt.Errorf("prepare workflowable data error: %w", err)
	}
	maps.Copy(fields, worklowableFields)

	// Create the workflow
	var workflow irminmodels.Workflow
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/workflows", workspace),
		ContentType: "application/x-www-form-urlencoded",
		FormFields:  fields,
	}, &workflow)
	if err != nil {
		return nil, nil, fmt.Errorf("create workflow error: %w", err)
	}
	return &workflow, apiResp, nil
}

func (c *Client) UpdateWorkflow(
	workspace, workflowID, name, description, documentation string,
) (*irminmodels.Workflow, *irminmodels.IrminAPIResponse, error) {
	var workflow irminmodels.Workflow
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPatch,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/workflows/%s", workspace, workflowID),
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"name":          name,
			"description":   description,
			"documentation": documentation,
		},
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
	workflowableFields, err := irminutils.PrepareWorkflowableData(workflowable)
	if err != nil {
		return nil, nil, fmt.Errorf("prepare workflowable data error: %w", err)
	}
	var workflow irminmodels.Workflow
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPatch,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/workflows/%s/workflowable", workspace, workflowID),
		ContentType: "application/x-www-form-urlencoded",
		FormFields:  workflowableFields,
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
	scheduleFields, err := irminutils.PrepareWorkflowScheduleData(schedule)
	if err != nil {
		return nil, nil, fmt.Errorf("prepare workflow schedule data error: %w", err)
	}
	var workflow irminmodels.Workflow
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPatch,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/workflows/%s/schedule", workspace, workflowID),
		ContentType: "application/x-www-form-urlencoded",
		FormFields:  scheduleFields,
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
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"new_owner_id": newOwnerID,
		},
	}, &workflow)
	if err != nil {
		return nil, nil, fmt.Errorf("workflow ownership transfer error: %w", err)
	}
	return &workflow, apiResp, nil
}
