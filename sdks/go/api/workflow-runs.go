package irmincore

import (
	"fmt"
	"net/http"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

func (c *Client) ListWorkflowRuns(
	workspace, workflowID string,
	page, perPage int,
) ([]irminmodels.WorkflowRun, *irminmodels.IrminAPIResponse, error) {
	var runs []irminmodels.WorkflowRun
	apiResp, err := c.FetchAPI(RequestOptions{
		Method: http.MethodGet,
		Endpoint: fmt.Sprintf(
			"/v1/workspaces/%s/workflows/%s/runs?page=%d&per_page=%d",
			workspace,
			workflowID,
			page,
			perPage,
		),
	}, &runs)
	if err != nil {
		return nil, nil, fmt.Errorf("list workflow runs error: %w", err)
	}
	return runs, apiResp, nil
}

func (c *Client) GetWorkflowRun(
	workspace, workflowID, runID string,
) (*irminmodels.WorkflowRun, *irminmodels.IrminAPIResponse, error) {
	var run irminmodels.WorkflowRun
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/workflows/%s/runs/%s", workspace, workflowID, runID),
	}, &run)
	if err != nil {
		return nil, nil, fmt.Errorf("list workflow runs error: %w", err)
	}
	return &run, apiResp, nil
}

func (c *Client) CancelWorkflowRun(
	workspace, workflowID, runID string,
) (*irminmodels.WorkflowRun, *irminmodels.IrminAPIResponse, error) {
	var run irminmodels.WorkflowRun
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodDelete,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/workflows/%s/runs/%s", workspace, workflowID, runID),
	}, &run)
	if err != nil {
		return nil, nil, fmt.Errorf("cancel workflow run error: %w", err)
	}
	return &run, apiResp, nil
}

func (c *Client) TriggerWorkflowRun(
	workspace, workflowID string,
) (*irminmodels.WorkflowRun, *irminmodels.IrminAPIResponse, error) {
	var run irminmodels.WorkflowRun
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodPost,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/workflows/%s/runs", workspace, workflowID),
	}, &run)
	if err != nil {
		return nil, nil, fmt.Errorf("create workflow run error: %w", err)
	}
	return &run, apiResp, nil
}

func (c *Client) ListAllWorkflowRuns(
	workspace string,
	page, perPage int,
) ([]irminmodels.WorkflowRun, *irminmodels.IrminAPIResponse, error) {
	var runs []irminmodels.WorkflowRun
	apiResp, err := c.FetchAPI(RequestOptions{
		Method: http.MethodGet,
		Endpoint: fmt.Sprintf(
			"/v1/workspaces/%s/workflows/runs?page=%d&per_page=%d",
			workspace,
			page,
			perPage,
		),
	}, &runs)
	if err != nil {
		return nil, nil, fmt.Errorf("list all workflow runs error: %w", err)
	}
	return runs, apiResp, nil
}
