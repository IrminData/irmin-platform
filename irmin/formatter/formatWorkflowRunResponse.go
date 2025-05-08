package formatter

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

func FormatWorkflowRunResponse(workflowRun *db.WorkflowRun) (*irminmodels.WorkflowRun, error) {
	// Get the sqid of the workflow run
	workflowRunSqid, err := utils.EncodeSqids("workflow-runs", uint64(workflowRun.ID))
	if err != nil {
		return nil, fmt.Errorf("error encoding workflow run sqid: %w", err)
	}

	// Format the workflow trigger response
	var triggeredByResponse *irminmodels.ScheduleTrigger
	if workflowRun.TriggeredBy != nil {
		var repositorySlug *string
		if workflowRun.TriggeredBy.Repository != nil {
			repositorySlug = &workflowRun.TriggeredBy.Repository.Slug
		}
		var workflowSqid *string
		if workflowRun.TriggeredBy.Workflow != nil {
			sqid, err := utils.EncodeSqids("workflows", uint64(*workflowRun.TriggeredBy.WorkflowID))
			if err != nil {
				return nil, fmt.Errorf("error encoding workflow sqid: %w", err)
			}
			workflowSqid = &sqid
		}
		var repositoryEvent irminmodels.RepositoryEvent
		if workflowRun.TriggeredBy.RepositoryEvent != nil {
			repositoryEvent = irminmodels.RepositoryEvent(*workflowRun.TriggeredBy.RepositoryEvent)
		}
		var workflowRunEvent irminmodels.WorkflowRunEvent
		if workflowRun.TriggeredBy.WorkflowRunEvent != nil {
			workflowRunEvent = irminmodels.WorkflowRunEvent(*workflowRun.TriggeredBy.WorkflowRunEvent)
		}
		triggeredByResponse = &irminmodels.ScheduleTrigger{
			Type:             irminmodels.WorkflowTriggerType(workflowRun.TriggeredBy.Type),
			RRule:            workflowRun.TriggeredBy.RRule,
			Cron:             workflowRun.TriggeredBy.Cron,
			RepositoryEvent:  &repositoryEvent,
			Repository:       repositorySlug,
			RepositoryRef:    workflowRun.TriggeredBy.RepositoryRef,
			WorkflowID:       workflowSqid,
			WorkflowRunEvent: &workflowRunEvent,
		}
	}

	// Format the user response
	var triggeredByUserResponse *irminmodels.User
	if workflowRun.TriggeredByUser != nil {
		userSqid, err := utils.EncodeSqids("users", uint64(workflowRun.TriggeredByUser.ID))
		if err != nil {
			return nil, fmt.Errorf("error encoding user sqid: %w", err)
		}
		triggeredByUserResponse = &irminmodels.User{
			ID:             userSqid,
			FirstName:      workflowRun.TriggeredByUser.FirstName,
			LastName:       workflowRun.TriggeredByUser.LastName,
			Email:          workflowRun.TriggeredByUser.Email,
			Phone:          workflowRun.TriggeredByUser.Phone,
			Company:        workflowRun.TriggeredByUser.Company,
			ProfilePicture: workflowRun.TriggeredByUser.ProfilePicture,
		}
	}

	// Get the sqid of the workflow
	workflowSqid, err := utils.EncodeSqids("workflows", uint64(workflowRun.WorkflowID))
	if err != nil {
		return nil, fmt.Errorf("error encoding workflow sqid: %w", err)
	}

	// Return the formatted workflow run response
	return &irminmodels.WorkflowRun{
		ID:              workflowRunSqid,
		CreatedAt:       workflowRun.CreatedAt,
		UpdatedAt:       workflowRun.UpdatedAt,
		StartedAt:       workflowRun.StartedAt,
		FinishedAt:      workflowRun.FinishedAt,
		Status:          irminmodels.WorkflowStatus(workflowRun.Status),
		Logs:            workflowRun.Logs,
		TriggeredBy:     triggeredByResponse,
		TriggeredByUser: triggeredByUserResponse,
		WorkflowID:      workflowSqid,
	}, nil
}
