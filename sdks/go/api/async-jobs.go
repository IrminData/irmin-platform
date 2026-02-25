package irmincore

import (
	"context"
	"fmt"
	"net/http"
	"net/url"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// ListAsyncJobs fetches a paginated list of async jobs for a workspace.
func (c *Client) ListAsyncJobs(
	ctx context.Context,
	workspace string,
	page, perPage int,
) ([]irminmodels.AsyncJob, *irminmodels.IrminAPIResponse, error) {
	endpoint := fmt.Sprintf(
		"/v1/workspaces/%s/async-jobs?page=%d&per_page=%d",
		url.PathEscape(workspace), page, perPage,
	)

	var jobs []irminmodels.AsyncJob
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &jobs)
	if err != nil {
		return nil, nil, fmt.Errorf("list async jobs error: %w", err)
	}
	return jobs, apiResp, nil
}

// GetAsyncJob fetches a specific async job by ID.
func (c *Client) GetAsyncJob(
	ctx context.Context,
	workspace, jobID string,
) (*irminmodels.AsyncJob, *irminmodels.IrminAPIResponse, error) {
	var job irminmodels.AsyncJob
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/async-jobs/%s", url.PathEscape(workspace), url.PathEscape(jobID)),
	}, &job)
	if err != nil {
		return nil, nil, fmt.Errorf("get async job error: %w", err)
	}
	return &job, apiResp, nil
}

// GetAsyncJobDownloadURL returns the download endpoint URL for a completed async job.
// The endpoint returns a 302 redirect to a presigned S3 URL.
// Use DownloadAsyncJobResult to fetch the file content directly.
// Use this method when you need to construct a download link for external use.
func (c *Client) GetAsyncJobDownloadURL(workspace, jobID string) string {
	return fmt.Sprintf(
		"%s/v1/workspaces/%s/async-jobs/%s/download",
		c.BaseURL, url.PathEscape(workspace), url.PathEscape(jobID),
	)
}

// DownloadAsyncJobResult downloads the result of a completed async job.
// The API returns a 302 redirect to a presigned S3 URL, which the HTTP client
// follows automatically. Returns the raw file bytes.
// The download URL is temporary — check AsyncJob.ResultExpiry before calling.
func (c *Client) DownloadAsyncJobResult(
	ctx context.Context,
	workspace, jobID string,
) ([]byte, error) {
	data, err := c.FetchBinary(ctx, RequestOptions{
		Method: http.MethodGet,
		Endpoint: fmt.Sprintf(
			"/v1/workspaces/%s/async-jobs/%s/download",
			url.PathEscape(workspace), url.PathEscape(jobID),
		),
	})
	if err != nil {
		return nil, fmt.Errorf("download async job result error: %w", err)
	}
	return data, nil
}
