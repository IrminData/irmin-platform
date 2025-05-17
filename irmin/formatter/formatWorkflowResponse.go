package formatter

import (
	"context"
	"irmin-api/db"
	"irmin-api/utils"
	"log"
	"slices"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// FormatWorkflowResponse creates a workflow response object from a workflow object.
func FormatWorkflowResponse(d *db.Database, workflow *db.Workflow) (*irminmodels.Workflow, error) {
	ctx := context.Background()

	// Fetch schedule and workflowable concurrently
	scheduleFuture := utils.AsyncWithContext(ctx, func() (*db.Schedule, error) {
		return d.GetScheduleByID(*workflow.ScheduleID)
	})

	var workflowableFuture utils.FutureResult[any]
	switch workflow.Type {
	case db.WorkflowableTypeImport:
		workflowableFuture = utils.AsyncWithContext(ctx, func() (any, error) {
			return d.GetImportWorkflowableByID(*workflow.ImportID)
		})
	case db.WorkflowableTypeExport:
		workflowableFuture = utils.AsyncWithContext(ctx, func() (any, error) {
			return d.GetExportWorkflowableByID(*workflow.ExportID)
		})
	case db.WorkflowableTypeAction:
		workflowableFuture = utils.AsyncWithContext(ctx, func() (any, error) {
			return d.GetActionWorkflowableByID(*workflow.ActionID)
		})
	case db.WorkflowableTypePipeline:
		workflowableFuture = utils.AsyncWithContext(ctx, func() (any, error) {
			return d.GetPipelineWorkflowableByID(*workflow.PipelineID)
		})
	}

	// Wait for both operations to complete
	schedule, err := scheduleFuture.Await()
	if err != nil {
		log.Printf("Error retrieving schedule: %v", err)
	}

	workflowable, err := workflowableFuture.Await()
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
	ownerResponse := irminmodels.User{
		ID:             ownerSqid,
		FirstName:      workflow.Owner.FirstName,
		LastName:       workflow.Owner.LastName,
		Email:          workflow.Owner.Email,
		Phone:          workflow.Owner.Phone,
		Company:        workflow.Owner.Company,
		ProfilePicture: workflow.Owner.ProfilePicture,
	}

	// Structure the workflowable response.
	workflowableResponse := irminmodels.Workflowable{
		Type: irminmodels.WorkflowableType(workflow.Type),
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
	case db.WorkflowableTypeAction:
		actionWorkflowable := workflowable.(*db.ActionWorkflowable)
		workflowableResponse.Executable = actionWorkflowable.Executable
		if actionWorkflowable.Repository != nil {
			workflowableResponse.Repository = actionWorkflowable.Repository.Slug
			workflowableResponse.Branch = *actionWorkflowable.Branch
			workflowableResponse.Path = *actionWorkflowable.Path
		}
		if actionWorkflowable.Inputs != nil {
			var inputsResponse []irminmodels.ActionInputData
			for _, input := range actionWorkflowable.Inputs {
				inputsResponse = append(inputsResponse, irminmodels.ActionInputData{
					Repository: input.Repository.Slug,
					Ref:        input.Ref,
					Path:       input.Path,
				})
			}
			workflowableResponse.Input = inputsResponse
		}
	case db.WorkflowableTypePipeline:
		pipelineWorkflowable := workflowable.(*db.PipelineWorkflowable)
		workflowableResponse.Live = pipelineWorkflowable.Live
		// Sort the stages by order sequence
		slices.SortFunc(pipelineWorkflowable.Stages, func(a, b db.PipelineStage) int {
			return a.OrderSequence - b.OrderSequence
		})
		// Format the stages
		var stagesResponse []irminmodels.PipelineStage
		for _, stage := range pipelineWorkflowable.Stages {
			switch stage.Type {
			case db.PipelineStageTypeAction:
				stageResponse := irminmodels.PipelineStage{
					Description: stage.Description,
					Write:       stage.Write,
					Read:        stage.Read,
					Type:        irminmodels.PipelineStageTypeAction,
					Executable:  stage.Executable,
				}
				stagesResponse = append(stagesResponse, stageResponse)
			case db.PipelineStageTypeConnection:
				connectionSqid, _ := utils.EncodeSqids("connections", uint64(*stage.ConnectionID))
				stageResponse := irminmodels.PipelineStage{
					Description:         stage.Description,
					Write:               stage.Write,
					Read:                stage.Read,
					Type:                irminmodels.PipelineStageTypeConnection,
					ConnectionWritePath: stage.ConnectionWritePath,
					ConnectionReadPath:  stage.ConnectionReadPath,
					ConnectionID:        &connectionSqid,
				}
				stagesResponse = append(stagesResponse, stageResponse)
			case db.PipelineStageTypeRepository:
				repositorySlug := stage.Repository.Slug
				stageResponse := irminmodels.PipelineStage{
					Description:      stage.Description,
					Write:            stage.Write,
					Read:             stage.Read,
					Type:             irminmodels.PipelineStageTypeRepository,
					RepositoryBranch: stage.RepositoryBranch,
					RepositoryPath:   stage.RepositoryPath,
					Repository:       &repositorySlug,
				}
				stagesResponse = append(stagesResponse, stageResponse)
			}
		}
		workflowableResponse.Stages = stagesResponse
	}

	// Structure the schedule response
	var scheduleResponse irminmodels.Schedule
	scheduleTriggersResponse := []irminmodels.ScheduleTrigger{} // Initialize empty array by default
	if schedule != nil && schedule.Triggers != nil {
		for _, trigger := range schedule.Triggers {
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
			var repositoryEvent irminmodels.RepositoryEvent
			if trigger.RepositoryEvent != nil {
				repositoryEvent = irminmodels.RepositoryEvent(*trigger.RepositoryEvent)
			}
			var workflowRunEvent irminmodels.WorkflowRunEvent
			if trigger.WorkflowRunEvent != nil {
				workflowRunEvent = irminmodels.WorkflowRunEvent(*trigger.WorkflowRunEvent)
			}
			scheduleTriggersResponse = append(scheduleTriggersResponse, irminmodels.ScheduleTrigger{
				Type:             irminmodels.WorkflowTriggerType(trigger.Type),
				RRule:            trigger.RRule,
				Cron:             trigger.Cron,
				RepositoryEvent:  &repositoryEvent,
				Repository:       repositorySlug,
				RepositoryRef:    trigger.RepositoryRef,
				WorkflowID:       workflowSqid,
				WorkflowRunEvent: &workflowRunEvent,
			})
		}
	}
	if schedule != nil {
		scheduleResponse = irminmodels.Schedule{
			Triggers:    scheduleTriggersResponse,
			MaxRetries:  schedule.MaxRetries,
			MaxRuntime:  schedule.MaxRuntime,
			MinInterval: schedule.MinInterval,
		}
	}

	// Find the latest workflow run status.
	latestStatus := irminmodels.WorkflowStatusInitiating
	if workflow.Paused {
		latestStatus = irminmodels.WorkflowStatusPaused
	} else {
		latestWorkflowRun, _ := d.GetLatestWorkflowRunByWorkflowID(workflow.ID)
		if latestWorkflowRun != nil {
			latestStatus = irminmodels.WorkflowStatus(latestWorkflowRun.Status)
		}
	}

	// Structure the workflow response.
	workflowSqid, err := utils.EncodeSqids("workflows", uint64(workflow.ID))
	if err != nil {
		log.Printf("Error encoding workflow sqid: %v", err)
		return nil, err
	}
	workflowResponse := irminmodels.Workflow{
		ID:            workflowSqid,
		Name:          workflow.Name,
		Description:   workflow.Description,
		Documentation: workflow.Documentation,
		Status:        latestStatus,
		Type:          irminmodels.WorkflowableType(workflow.Type),
		Owner:         ownerResponse,
		Schedule:      &scheduleResponse,
		Workflowable:  &workflowableResponse,
	}

	return &workflowResponse, nil
}
