package irmincore

import (
	"context"
	"fmt"
	"net/http"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// FetchLogEvents retrieves general audit log events for the current workspace.
func (c *Client) FetchLogEvents(
	ctx context.Context,
	workspace, search string,
	page, perPage int,
) ([]irminmodels.LogEvent, *irminmodels.IrminAPIResponse, error) {
	var logEvents []irminmodels.LogEvent
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/logs?page=%d&per_page=%d&search=%s", workspace, page, perPage, search),
	}, &logEvents)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch log events error: %w", err)
	}
	return logEvents, apiResp, nil
}

// FetchLogEventsForUser retrieves general audit log events for a user.
func (c *Client) FetchLogEventsForUser(
	ctx context.Context,
	workspace, userID, search string,
	page, perPage int,
) ([]irminmodels.LogEvent, *irminmodels.IrminAPIResponse, error) {
	var logEvents []irminmodels.LogEvent
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method: http.MethodGet,
		Endpoint: fmt.Sprintf(
			"/v1/workspaces/%s/logs?user_id=%s&page=%d&per_page=%d&search=%s",
			workspace,
			userID,
			page,
			perPage,
			search,
		),
	}, &logEvents)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch log events error: %w", err)
	}
	return logEvents, apiResp, nil
}

// FetchLogEventsForRepository retrieves general audit log events for a repository.
func (c *Client) FetchLogEventsForRepository(
	ctx context.Context,
	workspace, repositorySlug, search string,
	page, perPage int,
) ([]irminmodels.LogEvent, *irminmodels.IrminAPIResponse, error) {
	var logEvents []irminmodels.LogEvent
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method: http.MethodGet,
		Endpoint: fmt.Sprintf(
			"/v1/workspaces/%s/logs?repository=%s&page=%d&per_page=%d&search=%s",
			workspace,
			repositorySlug,
			page,
			perPage,
			search,
		),
	}, &logEvents)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch log events error: %w", err)
	}
	return logEvents, apiResp, nil
}

// FetchLogEventsForConnection retrieves general audit log events for a connection.
func (c *Client) FetchLogEventsForConnection(
	ctx context.Context,
	workspace, connectionID, search string,
	page, perPage int,
) ([]irminmodels.LogEvent, *irminmodels.IrminAPIResponse, error) {
	var logEvents []irminmodels.LogEvent
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method: http.MethodGet,
		Endpoint: fmt.Sprintf(
			"/v1/workspaces/%s/logs?connection_id=%s&page=%d&per_page=%d&search=%s",
			workspace,
			connectionID,
			page,
			perPage,
			search,
		),
	}, &logEvents)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch log events error: %w", err)
	}
	return logEvents, apiResp, nil
}

// FetchLogEventsForWorkflow retrieves general audit log events for a workflow.
func (c *Client) FetchLogEventsForWorkflow(
	ctx context.Context,
	workspace, workflowID, search string,
	page, perPage int,
) ([]irminmodels.LogEvent, *irminmodels.IrminAPIResponse, error) {
	var logEvents []irminmodels.LogEvent
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method: http.MethodGet,
		Endpoint: fmt.Sprintf(
			"/v1/workspaces/%s/logs?workflow_id=%s&page=%d&per_page=%d&search=%s",
			workspace,
			workflowID,
			page,
			perPage,
			search,
		),
	}, &logEvents)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch log events error: %w", err)
	}
	return logEvents, apiResp, nil
}

// FetchLogEventsForStoredQuery retrieves general audit log events for a stored query.
func (c *Client) FetchLogEventsForStoredQuery(
	ctx context.Context,
	workspace, storedQueryID, search string,
	page, perPage int,
) ([]irminmodels.LogEvent, *irminmodels.IrminAPIResponse, error) {
	var logEvents []irminmodels.LogEvent
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method: http.MethodGet,
		Endpoint: fmt.Sprintf(
			"/v1/workspaces/%s/logs?stored_query_id=%s&page=%d&per_page=%d&search=%s",
			workspace,
			storedQueryID,
			page,
			perPage,
			search,
		),
	}, &logEvents)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch log events error: %w", err)
	}
	return logEvents, apiResp, nil
}

// FetchLogEventsForPolicy retrieves general audit log events for a policy.
func (c *Client) FetchLogEventsForPolicy(
	ctx context.Context,
	workspace, policyID, search string,
	page, perPage int,
) ([]irminmodels.LogEvent, *irminmodels.IrminAPIResponse, error) {
	var logEvents []irminmodels.LogEvent
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method: http.MethodGet,
		Endpoint: fmt.Sprintf(
			"/v1/workspaces/%s/logs?policy_id=%s&page=%d&per_page=%d&search=%s",
			workspace,
			policyID,
			page,
			perPage,
			search,
		),
	}, &logEvents)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch log events error: %w", err)
	}
	return logEvents, apiResp, nil
}

// FetchLogEventsForObject retrieves general audit log events for an object.
func (c *Client) FetchLogEventsForObject(
	ctx context.Context,
	workspace, objectID, search string,
	page, perPage int,
) ([]irminmodels.LogEvent, *irminmodels.IrminAPIResponse, error) {
	var logEvents []irminmodels.LogEvent
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method: http.MethodGet,
		Endpoint: fmt.Sprintf(
			"/v1/workspaces/%s/logs?repository_object_id=%s&page=%d&per_page=%d&search=%s",
			workspace,
			objectID,
			page,
			perPage,
			search,
		),
	}, &logEvents)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch log events error: %w", err)
	}
	return logEvents, apiResp, nil
}
