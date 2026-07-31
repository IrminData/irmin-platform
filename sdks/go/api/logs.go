package irmincore

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"strconv"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
)

// LogEventFilters contains optional filters for log event queries.
type LogEventFilters struct {
	UserID             string
	RepositorySlug     string
	ConnectionID       string
	WorkflowID         string
	StoredQueryID      string
	PolicyID           string
	RepositoryObjectID string
	Search             string
}

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

// FetchLogEventsWithCursor retrieves log events using cursor-based pagination.
// Cursor pagination is more efficient than page-based pagination for deep pages (O(1) vs O(n)).
// Pass an empty string for cursor to get the first page.
// The next cursor is returned in the response pagination metadata (Next field).
func (c *Client) FetchLogEventsWithCursor(
	ctx context.Context,
	workspace string,
	filters LogEventFilters,
	cursor string,
	limit int,
) ([]irminmodels.LogEvent, *irminmodels.IrminAPIResponse, error) {
	var logEvents []irminmodels.LogEvent

	params := url.Values{}
	params.Set("per_page", strconv.Itoa(limit))

	if cursor != "" {
		params.Set("cursor", cursor)
	}
	if filters.UserID != "" {
		params.Set("user_id", filters.UserID)
	}
	if filters.RepositorySlug != "" {
		params.Set("repository", filters.RepositorySlug)
	}
	if filters.ConnectionID != "" {
		params.Set("connection_id", filters.ConnectionID)
	}
	if filters.WorkflowID != "" {
		params.Set("workflow_id", filters.WorkflowID)
	}
	if filters.StoredQueryID != "" {
		params.Set("stored_query_id", filters.StoredQueryID)
	}
	if filters.PolicyID != "" {
		params.Set("policy_id", filters.PolicyID)
	}
	if filters.RepositoryObjectID != "" {
		params.Set("repository_object_id", filters.RepositoryObjectID)
	}
	if filters.Search != "" {
		params.Set("search", filters.Search)
	}

	endpoint := fmt.Sprintf("/v1/workspaces/%s/logs?%s", workspace, params.Encode())

	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &logEvents)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch log events with cursor error: %w", err)
	}
	return logEvents, apiResp, nil
}
