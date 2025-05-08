package irmincore

import (
	"fmt"
	"net/http"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// FetchLogEvents retrieves general audit log events for the current workspace.
func (c *Client) FetchLogEvents(
	workspace, search string,
	page, perPage int,
) ([]irminmodels.LogEvent, *irminmodels.IrminAPIResponse, error) {
	var logEvents []irminmodels.LogEvent
	apiResp, err := c.FetchAPI(RequestOptions{
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
	workspace, userID, search string,
	page, perPage int,
) ([]irminmodels.LogEvent, *irminmodels.IrminAPIResponse, error) {
	var logEvents []irminmodels.LogEvent
	apiResp, err := c.FetchAPI(RequestOptions{
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
	workspace, repositorySlug, search string,
	page, perPage int,
) ([]irminmodels.LogEvent, *irminmodels.IrminAPIResponse, error) {
	var logEvents []irminmodels.LogEvent
	apiResp, err := c.FetchAPI(RequestOptions{
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
	workspace, connectionID, search string,
	page, perPage int,
) ([]irminmodels.LogEvent, *irminmodels.IrminAPIResponse, error) {
	var logEvents []irminmodels.LogEvent
	apiResp, err := c.FetchAPI(RequestOptions{
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
	workspace, workflowID, search string,
	page, perPage int,
) ([]irminmodels.LogEvent, *irminmodels.IrminAPIResponse, error) {
	var logEvents []irminmodels.LogEvent
	apiResp, err := c.FetchAPI(RequestOptions{
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
