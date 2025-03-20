package lib

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/utils"
)

func FormatWorkflowRunResponse(workflowRun *db.WorkflowRun) (*db.WorkflowRunResponse, error) {
	// Get the sqid of the workflow run
	workflowRunSqid, err := utils.EncodeSqids("workflow-runs", uint64(workflowRun.ID))
	if err != nil {
		return nil, fmt.Errorf("error encoding workflow run sqid: %w", err)
	}

	// Format the workflow trigger response
	var triggeredByResponse *db.WorkflowTriggerResponse
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
		triggeredByResponse = &db.WorkflowTriggerResponse{
			Type:             workflowRun.TriggeredBy.Type,
			RRule:            workflowRun.TriggeredBy.RRule,
			Cron:             workflowRun.TriggeredBy.Cron,
			RepositoryEvent:  workflowRun.TriggeredBy.RepositoryEvent,
			Repository:       repositorySlug,
			RepositoryRef:    workflowRun.TriggeredBy.RepositoryRef,
			WorkflowID:       workflowSqid,
			WorkflowRunEvent: workflowRun.TriggeredBy.WorkflowRunEvent,
		}
	}

	// Format the user response
	var triggeredByUserResponse *db.UserResponse
	if workflowRun.TriggeredByUser != nil {
		userSqid, err := utils.EncodeSqids("users", uint64(workflowRun.TriggeredByUser.ID))
		if err != nil {
			return nil, fmt.Errorf("error encoding user sqid: %w", err)
		}
		triggeredByUserResponse = &db.UserResponse{
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
	return &db.WorkflowRunResponse{
		ID:              workflowRunSqid,
		CreatedAt:       workflowRun.CreatedAt,
		Status:          workflowRun.Status,
		TriggeredBy:     triggeredByResponse,
		TriggeredByUser: triggeredByUserResponse,
		WorkflowID:      workflowSqid,
	}, nil
}
