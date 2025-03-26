package irminCore

import (
	"fmt"
	"net/http"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

// LogService handles log-related API calls
type LogService struct {
	client *Client
}

// NewLogService creates a new LogService
func NewLogService(client *Client) *LogService {
	return &LogService{
		client: client,
	}
}

// FetchLogEvents retrieves general audit log events for the current workspace
func (s *LogService) FetchLogEvents(workspace string) ([]irminModels.LogEvent, *irminModels.IrminAPIResponse, error) {
	var logEvents []irminModels.LogEvent
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/logs", workspace),
	}, &logEvents)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch log events error: %w", err)
	}
	return logEvents, apiResp, nil
}
