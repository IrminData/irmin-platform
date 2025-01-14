package services

import (
	"fmt"
	"net/http"

	"github.com/IrminData/irmin-sdk-go/client"
	"github.com/IrminData/irmin-sdk-go/models"
)

// LogService handles log-related API calls
type LogService struct {
	client *client.Client
}

// NewLogService creates a new LogService
func NewLogService(client *client.Client) *LogService {
	return &LogService{
		client: client,
	}
}

// FetchLogEvents retrieves general audit log events for the current workspace
func (s *LogService) FetchLogEvents() ([]models.LogEvent, *client.IrminAPIResponse, error) {
	endpoint := "/v1/logs"
	var logEvents []models.LogEvent

	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &logEvents)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch log events error: %w", err)
	}
	return logEvents, apiResp, nil
}

// FetchWorkflowLogEvents retrieves log events for a specific workflow
func (s *LogService) FetchWorkflowLogEvents(workflowID string) ([]models.LogEvent, *client.IrminAPIResponse, error) {
	endpoint := fmt.Sprintf("/v1/workflows/%s/logs", workflowID)
	var workflowLogs []models.LogEvent

	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &workflowLogs)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch workflow log events error: %w", err)
	}
	return workflowLogs, apiResp, nil
}

// FetchWorkflowRunLogs retrieves logs for a specific workflow run
func (s *LogService) FetchWorkflowRunLogs(workflowID, workflowRunID string) (*models.WorkflowRunLogs, *client.IrminAPIResponse, error) {
	endpoint := fmt.Sprintf("/v1/workflows/%s/runs/%s/logs", workflowID, workflowRunID)
	var workflowRunLogs models.WorkflowRunLogs

	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &workflowRunLogs)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch workflow run logs error: %w", err)
	}
	return &workflowRunLogs, apiResp, nil
}

// FetchRepositoryLogs retrieves log events for a specific repository
func (s *LogService) FetchRepositoryLogs(repository string) ([]models.LogEvent, *client.IrminAPIResponse, error) {
	endpoint := fmt.Sprintf("/v1/repositories/%s/logs", repository)
	var repositoryLogs []models.LogEvent

	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &repositoryLogs)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch repository log events error: %w", err)
	}
	return repositoryLogs, apiResp, nil
}

// FetchConnectionLogs retrieves log events for a specific connection
func (s *LogService) FetchConnectionLogs(connectionID string) ([]models.LogEvent, *client.IrminAPIResponse, error) {
	endpoint := fmt.Sprintf("/v1/connections/%s/logs", connectionID)
	var connectionLogs []models.LogEvent

	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &connectionLogs)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch connection log events error: %w", err)
	}
	return connectionLogs, apiResp, nil
}
