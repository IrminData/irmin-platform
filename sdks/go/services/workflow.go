package services

import (
	"fmt"
	"irmin-sdk/client"
	"irmin-sdk/models"
	"irmin-sdk/utils"
	"net/http"
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
	form := map[string]string{
		"_method": "PATCH",
		// Workflow properties
		"name":          name,
		"description":   description,
		"documentation": documentation,
	}

	// Workflow schedule
	if workflowSchedule != nil {
		scheduleFields, err := utils.PrepareWorkflowScheduleData(*workflowSchedule)
		if err != nil {
			return nil, nil, fmt.Errorf("prepare workflow schedule data error: %w", err)
		}
		for key, value := range scheduleFields {
			form[key] = value
		}
	}

	var workflow models.Workflow
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workflows/%s", workflowID),
		ContentType: "application/x-www-form-urlencoded",
		FormFields:  form,
	}, &workflow)
	if err != nil {
		return nil, nil, fmt.Errorf("update workflow error: %w", err)
	}
	return &workflow, apiResp, nil
}

// DeleteWorkflow deletes a workflow by its ID
func (s *WorkflowService) DeleteWorkflow(workflowID string) (*client.IrminAPIResponse, error) {
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workflows/%s", workflowID),
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"_method": "DELETE",
		},
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete workflow error: %w", err)
	}
	return apiResp, nil
}

// TriggerWorkflowRun triggers a workflow run manually
func (s *WorkflowService) TriggerWorkflowRun(workflowID string) (*client.IrminAPIResponse, error) {
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workflows/%s/run", workflowID),
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
	form := map[string]string{
		// Import Workflow properties
		"connection": connection,
		"repository": repository,
		"branch":     branch,
		"path":       path,
		// Workflow properties
		"name":          name,
		"description":   description,
		"documentation": documentation,
	}

	// Workflow schedule
	if workflowSchedule != nil {
		scheduleFields, err := utils.PrepareWorkflowScheduleData(*workflowSchedule)
		if err != nil {
			return nil, nil, fmt.Errorf("prepare workflow schedule data error: %w", err)
		}
		for key, value := range scheduleFields {
			form[key] = value
		}
	}

	var workflow models.Workflow
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/v1/workflows/imports",
		ContentType: "application/x-www-form-urlencoded",
		FormFields:  form,
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
	form := map[string]string{
		// Import Workflow properties
		"connection": connection,
		"repository": repository,
		"branch":     branch,
		"path":       path,
		"recursive":  fmt.Sprintf("%t", recursive),
		// Workflow properties
		"name":          name,
		"description":   description,
		"documentation": documentation,
	}

	// Workflow schedule
	if workflowSchedule != nil {
		scheduleFields, err := utils.PrepareWorkflowScheduleData(*workflowSchedule)
		if err != nil {
			return nil, nil, fmt.Errorf("prepare workflow schedule data error: %w", err)
		}
		for key, value := range scheduleFields {
			form[key] = value
		}
	}

	var workflow models.Workflow
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/v1/workflows/exports",
		ContentType: "application/x-www-form-urlencoded",
		FormFields:  form,
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
	form := map[string]string{
		// Action Workflow properties
		"executable": executable,
		"repository": repository,
		"branch":     branch,
		"path":       path,
		// Workflow properties
		"name":          name,
		"description":   description,
		"documentation": documentation,
	}

	// Workflow schedule
	if schedule != nil {
		scheduleFields, err := utils.PrepareWorkflowScheduleData(*schedule)
		if err != nil {
			return nil, nil, fmt.Errorf("prepare workflow schedule data error: %w", err)
		}
		for key, value := range scheduleFields {
			form[key] = value
		}
	}

	var workflow models.Workflow
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/v1/workflows/actions",
		ContentType: "application/x-www-form-urlencoded",
		FormFields:  form,
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
	form := map[string]string{
		"live": fmt.Sprintf("%t", live),
		// Workflow properties
		"name":          name,
		"description":   description,
		"documentation": documentation,
	}

	// Pipeline Workflow properties
	for i, stage := range stages {
		form[fmt.Sprintf("stages[%d][type]", i)] = stage.GetType()
		switch stage.GetType() {
		case "action":
			actionStage := stage.(*models.PipelineStageAction)
			form[fmt.Sprintf("stages[%d][description]", i)] = actionStage.Description
			form[fmt.Sprintf("stages[%d][write]", i)] = fmt.Sprintf("%t", actionStage.Write)
			form[fmt.Sprintf("stages[%d][read]", i)] = fmt.Sprintf("%t", actionStage.Read)
			form[fmt.Sprintf("stages[%d][executable]", i)] = actionStage.Executable
		case "connection":
			connectionStage := stage.(*models.PipelineStageConnection)
			form[fmt.Sprintf("stages[%d][description]", i)] = connectionStage.Description
			form[fmt.Sprintf("stages[%d][write]", i)] = fmt.Sprintf("%t", connectionStage.Write)
			form[fmt.Sprintf("stages[%d][read]", i)] = fmt.Sprintf("%t", connectionStage.Read)
			form[fmt.Sprintf("stages[%d][connection]", i)] = connectionStage.Connection.ID
			form[fmt.Sprintf("stages[%d][connection_write_path]", i)] = connectionStage.ConnectionWritePath
			form[fmt.Sprintf("stages[%d][connection_read_path]", i)] = connectionStage.ConnectionReadPath
		case "repository":
			repositoryStage := stage.(*models.PipelineStageRepository)
			form[fmt.Sprintf("stages[%d][description]", i)] = repositoryStage.Description
			form[fmt.Sprintf("stages[%d][write]", i)] = fmt.Sprintf("%t", repositoryStage.Write)
			form[fmt.Sprintf("stages[%d][read]", i)] = fmt.Sprintf("%t", repositoryStage.Read)
			form[fmt.Sprintf("stages[%d][repository]", i)] = repositoryStage.Repository.Slug
			form[fmt.Sprintf("stages[%d][branch]", i)] = repositoryStage.Branch
			form[fmt.Sprintf("stages[%d][path]", i)] = repositoryStage.Path
		default:
			return nil, nil, fmt.Errorf("unknown pipeline stage type: %s", stage.GetType())
		}
	}

	// Workflow schedule
	if schedule != nil {
		scheduleFields, err := utils.PrepareWorkflowScheduleData(*schedule)
		if err != nil {
			return nil, nil, fmt.Errorf("prepare workflow schedule data error: %w", err)
		}
		for key, value := range scheduleFields {
			form[key] = value
		}
	}

	var workflow models.Workflow
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/v1/workflows/pipelines",
		ContentType: "application/x-www-form-urlencoded",
		FormFields:  form,
	}, &workflow)
	if err != nil {
		return nil, nil, fmt.Errorf("create pipeline workflow error: %w", err)
	}
	return &workflow, apiResp, nil
}
