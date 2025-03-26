package irminCore

import (
	"fmt"
	"net/http"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

// WorkflowRunService handles workflow run-related operations
type WorkflowRunService struct {
	client *Client
}

// NewWorkflowRunService creates a new WorkflowRunService
func NewWorkflowRunService(client *Client) *WorkflowRunService {
	return &WorkflowRunService{
		client: client,
	}
}

func (s *RepositoryService) ListWorkflowRuns(workspace, workflowID string) ([]irminModels.WorkflowRun, *irminModels.IrminAPIResponse, error) {
	var runs []irminModels.WorkflowRun
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/workflows/%s/runs", workspace, workflowID),
	}, &runs)
	if err != nil {
		return nil, nil, fmt.Errorf("list workflow runs error: %w", err)
	}
	return runs, apiResp, nil
}

func (s *RepositoryService) GetWorkflowRun(workspace, workflowID, runID string) (*irminModels.WorkflowRun, *irminModels.IrminAPIResponse, error) {
	var run irminModels.WorkflowRun
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/workflows/%s/runs/%s", workspace, workflowID, runID),
	}, &run)
	if err != nil {
		return nil, nil, fmt.Errorf("list workflow runs error: %w", err)
	}
	return &run, apiResp, nil
}

func (s *RepositoryService) CancelWorkflowRun(workspace, workflowID, runID string) (*irminModels.WorkflowRun, *irminModels.IrminAPIResponse, error) {
	var run irminModels.WorkflowRun
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodDelete,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/workflows/%s/runs/%s", workspace, workflowID, runID),
	}, &run)
	if err != nil {
		return nil, nil, fmt.Errorf("cancel workflow run error: %w", err)
	}
	return &run, apiResp, nil
}

func (s *RepositoryService) TriggerWorkflowRun(workspace, workflowID string) (*irminModels.WorkflowRun, *irminModels.IrminAPIResponse, error) {
	var run irminModels.WorkflowRun
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodPost,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/workflows/%s/runs", workspace, workflowID),
	}, &run)
	if err != nil {
		return nil, nil, fmt.Errorf("create workflow run error: %w", err)
	}
	return &run, apiResp, nil
}
