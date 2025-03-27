package irminCore

import (
	"fmt"
	"net/http"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

func (c *Client) ListWorkflowRuns(workspace, workflowID string) ([]irminModels.WorkflowRun, *irminModels.IrminAPIResponse, error) {
	var runs []irminModels.WorkflowRun
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/workflows/%s/runs", workspace, workflowID),
	}, &runs)
	if err != nil {
		return nil, nil, fmt.Errorf("list workflow runs error: %w", err)
	}
	return runs, apiResp, nil
}

func (c *Client) GetWorkflowRun(workspace, workflowID, runID string) (*irminModels.WorkflowRun, *irminModels.IrminAPIResponse, error) {
	var run irminModels.WorkflowRun
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/workflows/%s/runs/%s", workspace, workflowID, runID),
	}, &run)
	if err != nil {
		return nil, nil, fmt.Errorf("list workflow runs error: %w", err)
	}
	return &run, apiResp, nil
}

func (c *Client) CancelWorkflowRun(workspace, workflowID, runID string) (*irminModels.WorkflowRun, *irminModels.IrminAPIResponse, error) {
	var run irminModels.WorkflowRun
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodDelete,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/workflows/%s/runs/%s", workspace, workflowID, runID),
	}, &run)
	if err != nil {
		return nil, nil, fmt.Errorf("cancel workflow run error: %w", err)
	}
	return &run, apiResp, nil
}

func (c *Client) TriggerWorkflowRun(workspace, workflowID string) (*irminModels.WorkflowRun, *irminModels.IrminAPIResponse, error) {
	var run irminModels.WorkflowRun
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodPost,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/workflows/%s/runs", workspace, workflowID),
	}, &run)
	if err != nil {
		return nil, nil, fmt.Errorf("create workflow run error: %w", err)
	}
	return &run, apiResp, nil
}
