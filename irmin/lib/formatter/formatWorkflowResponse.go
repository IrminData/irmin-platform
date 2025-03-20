package formatter

import (
	"irmin-api/db"
	"irmin-api/utils"
	"log"
)

// FormatWorkflowResponse creates a workflow response object from a workflow object.
func FormatWorkflowResponse(workflow db.Workflow) (*db.WorkflowResponse, error) {
	// Find the workflowable
	var workflowable interface{}
	var err error
	switch workflow.Type {
	case db.WorkflowableTypeImport:
		workflowable, err = db.GetImportWorkflowableByID(*workflow.ImportID)
	case db.WorkflowableTypeExport:
		workflowable, err = db.GetExportWorkflowableByID(*workflow.ExportID)
	case db.WorkflowableTypeAction:
		workflowable, err = db.GetActionWorkflowableByID(*workflow.ActionID)
	case db.WorkflowableTypePipeline:
		workflowable, err = db.GetPipelineWorkflowableByID(*workflow.PipelineID)
	}
	if err != nil {
		log.Printf("Error retrieving workflowable: %v", err)
		return nil, err
	}

	// Structure the owner response.
	ownerSqid, err := utils.EncodeSqids("users", uint64(workflow.OwnerID))
	if err != nil {
		log.Printf("Error encoding owner sqid: %v", err)
		return nil, err
	}
	ownerResponse := db.UserResponse{
		ID:             ownerSqid,
		FirstName:      workflow.Owner.FirstName,
		LastName:       workflow.Owner.LastName,
		Email:          workflow.Owner.Email,
		Phone:          workflow.Owner.Phone,
		Company:        workflow.Owner.Company,
		ProfilePicture: workflow.Owner.ProfilePicture,
	}

	// Structure the workflowable response.
	workflowableResponse := db.WorkflowableResponse{
		Type: workflow.Type,
	}
	switch workflow.Type {
	case db.WorkflowableTypeImport:
		importWorkflowable := workflowable.(*db.ImportWorkflowable)
		connectionSqid, _ := utils.EncodeSqids("connections", uint64(importWorkflowable.ConnectionID))
		workflowableResponse.ConnectionID = connectionSqid
		workflowableResponse.ConnectionPath = importWorkflowable.ConnectionPath
		workflowableResponse.Repository = importWorkflowable.Repository.Slug
		workflowableResponse.Branch = importWorkflowable.Branch
		workflowableResponse.Path = importWorkflowable.Path
	case db.WorkflowableTypeExport:
		exportWorkflowable := workflowable.(*db.ExportWorkflowable)
		connectionSqid, _ := utils.EncodeSqids("connections", uint64(exportWorkflowable.ConnectionID))
		workflowableResponse.ConnectionID = connectionSqid
		workflowableResponse.ConnectionPath = exportWorkflowable.ConnectionPath
		workflowableResponse.Repository = exportWorkflowable.Repository.Slug
		workflowableResponse.Branch = exportWorkflowable.Branch
		workflowableResponse.Path = exportWorkflowable.Path
		workflowableResponse.Recursive = exportWorkflowable.Recursive
	case db.WorkflowableTypeAction:
		actionWorkflowable := workflowable.(*db.ActionWorkflowable)
		workflowableResponse.Executable = actionWorkflowable.Executable
		if actionWorkflowable.Repository != nil {
			workflowableResponse.Repository = actionWorkflowable.Repository.Slug
			workflowableResponse.Branch = *actionWorkflowable.Branch
			workflowableResponse.Path = *actionWorkflowable.Path
		}
	case db.WorkflowableTypePipeline:
		pipelineWorkflowable := workflowable.(*db.PipelineWorkflowable)
		workflowableResponse.Live = pipelineWorkflowable.Live
		var stagesResponse []db.PipelineStageResponse
		for _, stage := range pipelineWorkflowable.Stages {
			connectionSqid, _ := utils.EncodeSqids("connections", uint64(*stage.ConnectionID))
			repositorySlug := stage.Repository.Slug
			stageResponse := db.PipelineStageResponse{
				Description:         stage.Description,
				Write:               stage.Write,
				Read:                stage.Read,
				Type:                stage.Type,
				Executable:          stage.Executable,
				ConnectionWritePath: stage.ConnectionWritePath,
				ConnectionReadPath:  stage.ConnectionReadPath,
				RepositoryBranch:    stage.RepositoryBranch,
				RepositoryPath:      stage.RepositoryPath,
				ConnectionID:        &connectionSqid,
				Repository:          &repositorySlug,
			}
			stagesResponse = append(stagesResponse, stageResponse)
		}
		workflowableResponse.Stages = stagesResponse
	}

	// Structure the schedule response
	var scheduleResponse db.ScheduleResponse
	if workflow.Schedule != nil && workflow.Schedule.Triggers != nil {
		var scheduleTriggersResponse []db.WorkflowTriggerResponse
		for _, trigger := range workflow.Schedule.Triggers {
			var repositorySlug *string
			if trigger.Repository != nil {
				repositorySlug = &trigger.Repository.Slug
			}
			var workflowSqid *string
			if trigger.Workflow != nil {
				sqid, err := utils.EncodeSqids("workflows", uint64(*trigger.WorkflowID))
				if err != nil {
					log.Printf("Error encoding workflow sqid: %v", err)
					return nil, err
				}
				workflowSqid = &sqid
			}
			scheduleTriggersResponse = append(scheduleTriggersResponse, db.WorkflowTriggerResponse{
				Type:             trigger.Type,
				RRule:            trigger.RRule,
				Cron:             trigger.Cron,
				RepositoryEvent:  trigger.RepositoryEvent,
				Repository:       repositorySlug,
				RepositoryRef:    trigger.RepositoryRef,
				WorkflowID:       workflowSqid,
				WorkflowRunEvent: trigger.WorkflowRunEvent,
			})
		}
		scheduleResponse = db.ScheduleResponse{
			Triggers:    scheduleTriggersResponse,
			MaxRetries:  workflow.Schedule.MaxRetries,
			MaxRuntime:  workflow.Schedule.MaxRuntime,
			MinInterval: workflow.Schedule.MinInterval,
		}
	}

	// Find the latest workflow run status.
	latestStatus := db.WorkflowStatusInitiating
	latestWorkflowRun, _ := db.GetLatestWorkflowRunByWorkflowID(workflow.ID)
	if latestWorkflowRun != nil {
		latestStatus = latestWorkflowRun.Status
	}

	// Structure the workflow response.
	workflowSqid, err := utils.EncodeSqids("workflows", uint64(workflow.ID))
	if err != nil {
		log.Printf("Error encoding workflow sqid: %v", err)
		return nil, err
	}
	workflowResponse := db.WorkflowResponse{
		ID:            workflowSqid,
		Name:          workflow.Name,
		Description:   workflow.Description,
		Documentation: workflow.Documentation,
		Status:        latestStatus,
		Type:          workflow.Type,
		Owner:         ownerResponse,
		Schedule:      &scheduleResponse,
		Workflowable:  &workflowableResponse,
	}

	return &workflowResponse, nil
}
