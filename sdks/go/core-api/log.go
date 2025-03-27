package irminCore

import (
	"fmt"
	"net/http"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

// FetchLogEvents retrieves general audit log events for the current workspace
func (c *Client) FetchLogEvents(workspace string) ([]irminModels.LogEvent, *irminModels.IrminAPIResponse, error) {
	var logEvents []irminModels.LogEvent
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/logs", workspace),
	}, &logEvents)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch log events error: %w", err)
	}
	return logEvents, apiResp, nil
}
