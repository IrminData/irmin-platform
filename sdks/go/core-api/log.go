package irminCore

import (
	"fmt"
	"net/http"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

// FetchLogEvents retrieves general audit log events for the current workspace
func (c *Client) FetchLogEvents(workspace string, page, perPage int) ([]irminModels.LogEvent, *irminModels.IrminAPIResponse, error) {
	var logEvents []irminModels.LogEvent
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/logs?page=%d&per_page=%d", workspace, page, perPage),
	}, &logEvents)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch log events error: %w", err)
	}
	return logEvents, apiResp, nil
}

// FetchLogEventsForUser retrieves general audit log events for a user
func (c *Client) FetchLogEventsForUser(workspace, user_id string, page, perPage int) ([]irminModels.LogEvent, *irminModels.IrminAPIResponse, error) {
	var logEvents []irminModels.LogEvent
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/logs?user_id=%s&page=%d&per_page=%d", workspace, user_id, page, perPage),
	}, &logEvents)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch log events error: %w", err)
	}
	return logEvents, apiResp, nil
}

// FetchLogEventsForRepository retrieves general audit log events for a repository
func (c *Client) FetchLogEventsForRepository(workspace, repository_id string, page, perPage int) ([]irminModels.LogEvent, *irminModels.IrminAPIResponse, error) {
	var logEvents []irminModels.LogEvent
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/logs?repository_id=%s&page=%d&per_page=%d", workspace, repository_id, page, perPage),
	}, &logEvents)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch log events error: %w", err)
	}
	return logEvents, apiResp, nil
}

// FetchLogEventsForConnection retrieves general audit log events for a connection
func (c *Client) FetchLogEventsForConnection(workspace, connection_id string, page, perPage int) ([]irminModels.LogEvent, *irminModels.IrminAPIResponse, error) {
	var logEvents []irminModels.LogEvent
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/logs?connection_id=%s&page=%d&per_page=%d", workspace, connection_id, page, perPage),
	}, &logEvents)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch log events error: %w", err)
	}
	return logEvents, apiResp, nil
}

// FetchLogEventsForWorkflow retrieves general audit log events for a workflow
func (c *Client) FetchLogEventsForWorkflow(workspace, workflow_id string, page, perPage int) ([]irminModels.LogEvent, *irminModels.IrminAPIResponse, error) {
	var logEvents []irminModels.LogEvent
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/logs?workflow_id=%s&page=%d&per_page=%d", workspace, workflow_id, page, perPage),
	}, &logEvents)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch log events error: %w", err)
	}
	return logEvents, apiResp, nil
}
