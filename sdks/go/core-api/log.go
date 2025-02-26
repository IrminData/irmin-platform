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
func (s *LogService) FetchLogEvents() ([]irminModels.LogEvent, *irminModels.IrminAPIResponse, error) {
	endpoint := "/v1/logs"
	var logEvents []irminModels.LogEvent

	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &logEvents)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch log events error: %w", err)
	}
	return logEvents, apiResp, nil
}

// FetchWorkflowLogEvents retrieves log events for a specific workflow
func (s *LogService) FetchWorkflowLogEvents(workflowID string) ([]irminModels.LogEvent, *irminModels.IrminAPIResponse, error) {
	endpoint := fmt.Sprintf("/v1/workflows/%s/logs", workflowID)
	var workflowLogs []irminModels.LogEvent

	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &workflowLogs)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch workflow log events error: %w", err)
	}
	return workflowLogs, apiResp, nil
}

// FetchWorkflowRunLogs retrieves logs for a specific workflow run
func (s *LogService) FetchWorkflowRunLogs(workflowID, workflowRunID string) (*irminModels.WorkflowRunLogs, *irminModels.IrminAPIResponse, error) {
	endpoint := fmt.Sprintf("/v1/workflows/%s/runs/%s/logs", workflowID, workflowRunID)
	var workflowRunLogs irminModels.WorkflowRunLogs

	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &workflowRunLogs)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch workflow run logs error: %w", err)
	}
	return &workflowRunLogs, apiResp, nil
}

// FetchRepositoryLogs retrieves log events for a specific repository
func (s *LogService) FetchRepositoryLogs(repository string) ([]irminModels.LogEvent, *irminModels.IrminAPIResponse, error) {
	endpoint := fmt.Sprintf("/v1/repositories/%s/logs", repository)
	var repositoryLogs []irminModels.LogEvent

	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &repositoryLogs)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch repository log events error: %w", err)
	}
	return repositoryLogs, apiResp, nil
}

// FetchConnectionLogs retrieves log events for a specific connection
func (s *LogService) FetchConnectionLogs(connectionID string) ([]irminModels.LogEvent, *irminModels.IrminAPIResponse, error) {
	endpoint := fmt.Sprintf("/v1/connections/%s/logs", connectionID)
	var connectionLogs []irminModels.LogEvent

	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &connectionLogs)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch connection log events error: %w", err)
	}
	return connectionLogs, apiResp, nil
}
