package irminCore

import (
	"fmt"
	"net/http"

	"maps"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
	irminUtils "github.com/IrminData/irmin-sdk-go/utils"
)

// WorkflowService handles workflow-related operations
type WorkflowService struct {
	client *Client
}

// NewWorkflowService creates a new WorkflowService
func NewWorkflowService(client *Client) *WorkflowService {
	return &WorkflowService{
		client: client,
	}
}

func (s *WorkflowService) ListWorkflows(workspace string) ([]irminModels.Workflow, *irminModels.IrminAPIResponse, error) {
	var workflows []irminModels.Workflow
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/workflows", workspace),
	}, &workflows)
	if err != nil {
		return nil, nil, fmt.Errorf("list workflows error: %w", err)
	}
	return workflows, apiResp, nil
}

func (s *WorkflowService) ListWorkflowsOfType(workspace, workflowType string) ([]irminModels.Workflow, *irminModels.IrminAPIResponse, error) {
	var workflows []irminModels.Workflow
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/workflows?type=%s", workspace, workflowType),
	}, &workflows)
	if err != nil {
		return nil, nil, fmt.Errorf("list workflows error: %w", err)
	}
	return workflows, apiResp, nil
}

func (s *WorkflowService) GetWorkflow(workspace, workflowID string) (*irminModels.Workflow, *irminModels.IrminAPIResponse, error) {
	var workflow irminModels.Workflow
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/workflows/%s", workspace, workflowID),
	}, &workflow)
	if err != nil {
		return nil, nil, fmt.Errorf("get workflow error: %w", err)
	}
	return &workflow, apiResp, nil
}

func (s *WorkflowService) CreateWorkflow(workspace, name, description, documentation string, workflowable irminModels.Workflowable, schedule irminModels.Schedule) (*irminModels.Workflow, *irminModels.IrminAPIResponse, error) {
	fields := map[string]string{
		"name":          name,
		"description":   description,
		"documentation": documentation,
	}
	// Add schedule data
	scheduleFields, err := irminUtils.PrepareWorkflowScheduleData(schedule)
	if err != nil {
		return nil, nil, fmt.Errorf("prepare schedule data error: %w", err)
	}
	maps.Copy(fields, scheduleFields)

	// Add workflowable data
	worklowableFields, err := irminUtils.PrepareWorkflowableData(workflowable)
	if err != nil {
		return nil, nil, fmt.Errorf("prepare workflowable data error: %w", err)
	}
	maps.Copy(fields, worklowableFields)

	// Create the workflow
	var workflow irminModels.Workflow
	apiResp, err := s.client.FetchAPI(RequestOptions{
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

func (s *WorkflowService) UpdateWorkflow(workspace, workflowID, name, description, documentation string) (*irminModels.Workflow, *irminModels.IrminAPIResponse, error) {
	var workflow irminModels.Workflow
	apiResp, err := s.client.FetchAPI(RequestOptions{
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

func (s *WorkflowService) UpdateWorkflowWorkflowable(workspace, workflowID string, workflowable irminModels.Workflowable) (*irminModels.Workflow, *irminModels.IrminAPIResponse, error) {
	workflowableFields, err := irminUtils.PrepareWorkflowableData(workflowable)
	if err != nil {
		return nil, nil, fmt.Errorf("prepare workflowable data error: %w", err)
	}
	var workflow irminModels.Workflow
	apiResp, err := s.client.FetchAPI(RequestOptions{
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

func (s *WorkflowService) UpdateWorkflowSchedule(workspace, workflowID string, schedule irminModels.Schedule) (*irminModels.Workflow, *irminModels.IrminAPIResponse, error) {
	scheduleFields, err := irminUtils.PrepareWorkflowScheduleData(schedule)
	if err != nil {
		return nil, nil, fmt.Errorf("prepare workflow schedule data error: %w", err)
	}
	var workflow irminModels.Workflow
	apiResp, err := s.client.FetchAPI(RequestOptions{
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

func (s *WorkflowService) DeleteWorkflow(workspace, workflowID string) (*irminModels.IrminAPIResponse, error) {
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodDelete,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/workflows/%s", workspace, workflowID),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete workflow error: %w", err)
	}
	return apiResp, nil
}

func (s *WorkflowService) TransferWorkflow(workspace, workflowID, newOwnerID string) (*irminModels.Workflow, *irminModels.IrminAPIResponse, error) {
	var workflow irminModels.Workflow
	apiResp, err := s.client.FetchAPI(RequestOptions{
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
