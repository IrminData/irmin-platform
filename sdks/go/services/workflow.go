package services

import (
	"fmt"
	"irmin-sdk/client"
	"irmin-sdk/models"
	"irmin-sdk/utils"
	"net/http"
	"net/url"
	"strings"
)

// WorkflowService handles workflow-related operations
type WorkflowService struct {
	client *client.Client
}

// NewWorkflowService creates a new WorkflowService
func NewWorkflowService(client *client.Client) *WorkflowService {
	return &WorkflowService{
		client: client,
	}
}

// FetchWorkflows retrieves a list of all workflows
func (s *WorkflowService) FetchWorkflows() ([]models.Workflow, *client.IrminAPIResponse, error) {
	var workflows []models.Workflow
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:   http.MethodGet,
		Endpoint: "/v1/workflows",
	}, &workflows)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch workflows error: %w", err)
	}
	return workflows, apiResp, nil
}

// FetchWorkflow retrieves a single workflow by its ID
func (s *WorkflowService) FetchWorkflow(workflowID string) (*models.Workflow, *client.IrminAPIResponse, error) {
	endpoint := fmt.Sprintf("/v1/workflows/%s", workflowID)
	var workflow models.Workflow
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &workflow)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch workflow error: %w", err)
	}
	return &workflow, apiResp, nil
}

// UpdateWorkflow updates an existing workflow
func (s *WorkflowService) UpdateWorkflow(
	workflowID,
	name,
	description,
	documentation string,
	workflowSchedule *models.WorkflowSchedule,
) (*models.Workflow, *client.IrminAPIResponse, error) {
	form := url.Values{}

	form.Set("_method", "PATCH")

	// Workflow properties
	form.Set("name", name)
	form.Set("description", description)
	form.Set("documentation", documentation)

	// Workflow schedule
	if workflowSchedule != nil {
		scheduleFields, err := utils.PrepareWorkflowScheduleData(*workflowSchedule)
		if err != nil {
			return nil, nil, fmt.Errorf("prepare workflow schedule data error: %w", err)
		}
		for key, value := range scheduleFields {
			form.Set(key, value)
		}
	}

	var workflow models.Workflow
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workflows/%s", workflowID),
		ContentType: "application/x-www-form-urlencoded",
		Body:        strings.NewReader(form.Encode()),
	}, &workflow)
	if err != nil {
		return nil, nil, fmt.Errorf("update workflow error: %w", err)
	}
	return &workflow, apiResp, nil
}

// DeleteWorkflow deletes a workflow by its ID
func (s *WorkflowService) DeleteWorkflow(workflowID string) (*client.IrminAPIResponse, error) {
	endpoint := fmt.Sprintf("/v1/workflows/%s", workflowID)
	body := map[string]string{"_method": "DELETE"}
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    endpoint,
		ContentType: "application/json",
		Body:        body,
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete workflow error: %w", err)
	}
	return apiResp, nil
}

// TriggerWorkflowRun triggers a workflow run manually
func (s *WorkflowService) TriggerWorkflowRun(workflowID string) (*client.IrminAPIResponse, error) {
	endpoint := fmt.Sprintf("/v1/workflows/%s/run", workflowID)
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("trigger workflow run error: %w", err)
	}
	return apiResp, nil
}

// CreateImportWorkflow creates a new import workflow
func (s *WorkflowService) CreateImportWorkflow(
	connection,
	repository,
	branch,
	path,
	name,
	description,
	documentation string,
	workflowSchedule *models.WorkflowSchedule,
) (*models.Workflow, *client.IrminAPIResponse, error) {
	form := url.Values{}

	// Import Workflow properties
	form.Set("connection", connection)
	form.Set("repository", repository)
	form.Set("branch", branch)
	form.Set("path", path)

	// Workflow properties
	form.Set("name", name)
	form.Set("description", description)
	form.Set("documentation", documentation)

	// Workflow schedule
	if workflowSchedule != nil {
		scheduleFields, err := utils.PrepareWorkflowScheduleData(*workflowSchedule)
		if err != nil {
			return nil, nil, fmt.Errorf("prepare workflow schedule data error: %w", err)
		}
		for key, value := range scheduleFields {
			form.Set(key, value)
		}
	}

	var workflow models.Workflow
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/v1/workflows/imports",
		ContentType: "application/x-www-form-urlencoded",
		Body:        strings.NewReader(form.Encode()),
	}, &workflow)
	if err != nil {
		return nil, nil, fmt.Errorf("create import workflow error: %w", err)
	}
	return &workflow, apiResp, nil
}

// CreateExportWorkflow creates a new export workflow
func (s *WorkflowService) CreateExportWorkflow(
	connection,
	repository,
	path,
	branch string,
	recursive bool,
	name,
	description,
	documentation string,
	workflowSchedule *models.WorkflowSchedule,
) (*models.Workflow, *client.IrminAPIResponse, error) {
	form := url.Values{}

	// Import Workflow properties
	form.Set("connection", connection)
	form.Set("repository", repository)
	form.Set("branch", branch)
	form.Set("path", path)
	if recursive {
		form.Set("recursive", "true")
	} else {
		form.Set("recursive", "false")
	}

	// Workflow properties
	form.Set("name", name)
	form.Set("description", description)
	form.Set("documentation", documentation)

	// Workflow schedule
	if workflowSchedule != nil {
		scheduleFields, err := utils.PrepareWorkflowScheduleData(*workflowSchedule)
		if err != nil {
			return nil, nil, fmt.Errorf("prepare workflow schedule data error: %w", err)
		}
		for key, value := range scheduleFields {
			form.Set(key, value)
		}
	}

	var workflow models.Workflow
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/v1/workflows/exports",
		ContentType: "application/x-www-form-urlencoded",
		Body:        strings.NewReader(form.Encode()),
	}, &workflow)
	if err != nil {
		return nil, nil, fmt.Errorf("create export workflow error: %w", err)
	}
	return &workflow, apiResp, nil
}

// CreateActionWorkflow creates a new action workflow
func (s *WorkflowService) CreateActionWorkflow(
	executable,
	repository,
	branch,
	path,
	name,
	description,
	documentation string,
	schedule *models.WorkflowSchedule,
) (*models.Workflow, *client.IrminAPIResponse, error) {
	form := url.Values{}

	// Action Workflow properties
	form.Set("executable", executable)
	form.Set("repository", repository)
	form.Set("branch", branch)
	form.Set("path", path)

	// Workflow properties
	form.Set("name", name)
	form.Set("description", description)
	form.Set("documentation", documentation)

	// Workflow schedule
	if schedule != nil {
		scheduleFields, err := utils.PrepareWorkflowScheduleData(*schedule)
		if err != nil {
			return nil, nil, fmt.Errorf("prepare workflow schedule data error: %w", err)
		}
		for key, value := range scheduleFields {
			form.Set(key, value)
		}
	}

	var workflow models.Workflow
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/v1/workflows/actions",
		ContentType: "application/x-www-form-urlencoded",
		Body:        strings.NewReader(form.Encode()),
	}, &workflow)
	if err != nil {
		return nil, nil, fmt.Errorf("create action workflow error: %w", err)
	}
	return &workflow, apiResp, nil
}

// CreatePipelineWorkflow creates a new pipeline workflow
func (s *WorkflowService) CreatePipelineWorkflow(
	stages []models.PipelineStage,
	live bool,
	name,
	description,
	documentation string,
	schedule *models.WorkflowSchedule,
) (*models.Workflow, *client.IrminAPIResponse, error) {
	form := url.Values{}

	// Pipeline Workflow properties
	if live {
		form.Set("live", "true")
	} else {
		form.Set("live", "false")
	}
	for i, stage := range stages {
		form.Set(fmt.Sprintf("stages[%d][type]", i), stage.GetType())
		switch stage.GetType() {
		case "action":
			actionStage := stage.(*models.PipelineStageAction)
			form.Set(fmt.Sprintf("stages[%d][description]", i), actionStage.Description)
			form.Set(fmt.Sprintf("stages[%d][write]", i), fmt.Sprintf("%t", actionStage.Write))
			form.Set(fmt.Sprintf("stages[%d][read]", i), fmt.Sprintf("%t", actionStage.Read))
			form.Set(fmt.Sprintf("stages[%d][executable]", i), actionStage.Executable)
		case "connection":
			connectionStage := stage.(*models.PipelineStageConnection)
			form.Set(fmt.Sprintf("stages[%d][description]", i), connectionStage.Description)
			form.Set(fmt.Sprintf("stages[%d][write]", i), fmt.Sprintf("%t", connectionStage.Write))
			form.Set(fmt.Sprintf("stages[%d][read]", i), fmt.Sprintf("%t", connectionStage.Read))
			form.Set(fmt.Sprintf("stages[%d][connection]", i), connectionStage.Connection.ID)
			form.Set(fmt.Sprintf("stages[%d][connection_write_path]", i), connectionStage.ConnectionWritePath)
			form.Set(fmt.Sprintf("stages[%d][connection_read_path]", i), connectionStage.ConnectionReadPath)
		case "repository":
			repositoryStage := stage.(*models.PipelineStageRepository)
			form.Set(fmt.Sprintf("stages[%d][description]", i), repositoryStage.Description)
			form.Set(fmt.Sprintf("stages[%d][write]", i), fmt.Sprintf("%t", repositoryStage.Write))
			form.Set(fmt.Sprintf("stages[%d][read]", i), fmt.Sprintf("%t", repositoryStage.Read))
			form.Set(fmt.Sprintf("stages[%d][repository]", i), repositoryStage.Repository.Slug)
			form.Set(fmt.Sprintf("stages[%d][branch]", i), repositoryStage.Branch)
			form.Set(fmt.Sprintf("stages[%d][path]", i), repositoryStage.Path)
		default:
			return nil, nil, fmt.Errorf("unknown pipeline stage type: %s", stage.GetType())
		}
	}

	// Workflow properties
	form.Set("name", name)
	form.Set("description", description)
	form.Set("documentation", documentation)

	// Workflow schedule
	if schedule != nil {
		scheduleFields, err := utils.PrepareWorkflowScheduleData(*schedule)
		if err != nil {
			return nil, nil, fmt.Errorf("prepare workflow schedule data error: %w", err)
		}
		for key, value := range scheduleFields {
			form.Set(key, value)
		}
	}

	var workflow models.Workflow
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/v1/workflows/pipelines",
		ContentType: "application/x-www-form-urlencoded",
		Body:        strings.NewReader(form.Encode()),
	}, &workflow)
	if err != nil {
		return nil, nil, fmt.Errorf("create pipeline workflow error: %w", err)
	}
	return &workflow, apiResp, nil
}
