package irmincore

import (
	"context"
	"fmt"
	"net/http"
	"net/url"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
)

func (c *Client) ListWorkflowRuns(
	ctx context.Context,
	workspace, workflowID string,
	page, perPage int,
) ([]irminmodels.WorkflowRun, *irminmodels.IrminAPIResponse, error) {
	var runs []irminmodels.WorkflowRun
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
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
	ctx context.Context,
	workspace, workflowID, runID string,
) (*irminmodels.WorkflowRun, *irminmodels.IrminAPIResponse, error) {
	var run irminmodels.WorkflowRun
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/workflows/%s/runs/%s", workspace, workflowID, runID),
	}, &run)
	if err != nil {
		return nil, nil, fmt.Errorf("list workflow runs error: %w", err)
	}
	return &run, apiResp, nil
}

func (c *Client) CancelWorkflowRun(
	ctx context.Context,
	workspace, workflowID, runID string,
) (*irminmodels.WorkflowRun, *irminmodels.IrminAPIResponse, error) {
	var run irminmodels.WorkflowRun
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodDelete,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/workflows/%s/runs/%s", workspace, workflowID, runID),
	}, &run)
	if err != nil {
		return nil, nil, fmt.Errorf("cancel workflow run error: %w", err)
	}
	return &run, apiResp, nil
}

func (c *Client) TriggerWorkflowRun(
	ctx context.Context,
	workspace, workflowID string,
) (*irminmodels.WorkflowRun, *irminmodels.IrminAPIResponse, error) {
	var run irminmodels.WorkflowRun
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodPost,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/workflows/%s/runs", workspace, workflowID),
	}, &run)
	if err != nil {
		return nil, nil, fmt.Errorf("create workflow run error: %w", err)
	}
	return &run, apiResp, nil
}

func (c *Client) ListAllWorkflowRuns(
	ctx context.Context,
	workspace string,
	page, perPage int,
) ([]irminmodels.WorkflowRun, *irminmodels.IrminAPIResponse, error) {
	var runs []irminmodels.WorkflowRun
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
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

// ListWorkflowRunsWithCursor retrieves workflow runs using cursor-based pagination.
// Cursor pagination is more efficient than page-based pagination for deep pages (O(1) vs O(n)).
// Pass an empty string for cursor to get the first page.
// The next cursor is returned in the response pagination metadata (Next field).
func (c *Client) ListWorkflowRunsWithCursor(
	ctx context.Context,
	workspace, workflowID string,
	cursor string,
	limit int,
) ([]irminmodels.WorkflowRun, *irminmodels.IrminAPIResponse, error) {
	var runs []irminmodels.WorkflowRun
	endpoint := fmt.Sprintf(
		"/v1/workspaces/%s/workflows/%s/runs?per_page=%d",
		workspace,
		workflowID,
		limit,
	)
	if cursor != "" {
		endpoint += fmt.Sprintf("&cursor=%s", url.QueryEscape(cursor))
	}
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &runs)
	if err != nil {
		return nil, nil, fmt.Errorf("list workflow runs with cursor error: %w", err)
	}
	return runs, apiResp, nil
}

// ListAllWorkflowRunsWithCursor retrieves all workflow runs using cursor-based pagination.
// Pass an empty string for cursor to get the first page.
func (c *Client) ListAllWorkflowRunsWithCursor(
	ctx context.Context,
	workspace string,
	cursor string,
	limit int,
) ([]irminmodels.WorkflowRun, *irminmodels.IrminAPIResponse, error) {
	var runs []irminmodels.WorkflowRun
	endpoint := fmt.Sprintf(
		"/v1/workspaces/%s/workflows/runs?per_page=%d",
		workspace,
		limit,
	)
	if cursor != "" {
		endpoint += fmt.Sprintf("&cursor=%s", url.QueryEscape(cursor))
	}
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &runs)
	if err != nil {
		return nil, nil, fmt.Errorf("list all workflow runs with cursor error: %w", err)
	}
	return runs, apiResp, nil
}
