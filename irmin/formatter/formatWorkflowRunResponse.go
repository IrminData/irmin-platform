package formatter

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

func FormatWorkflowRunResponse(
	workflowRun *db.WorkflowRun,
	sqidManager *utils.SQIDManager,
) (*irminmodels.WorkflowRun, error) {
	// Get the sqid of the workflow run
	workflowRunSqid, encodeWorkflowRunSqidErr := sqidManager.Encode("workflow-runs", uint64(workflowRun.ID))
	if encodeWorkflowRunSqidErr != nil {
		return nil, fmt.Errorf("error encoding workflow run sqid: %w", encodeWorkflowRunSqidErr)
	}

	// Format the workflow trigger response
	var triggeredByResponse *irminmodels.ScheduleTrigger
	if workflowRun.TriggeredBy != nil {
		var formatScheduleTriggerResponseErr error
		triggeredByResponse, formatScheduleTriggerResponseErr = FormatScheduleTriggerResponse(
			workflowRun.TriggeredBy,
			sqidManager,
		)
		if formatScheduleTriggerResponseErr != nil {
			return nil, fmt.Errorf("error formatting schedule trigger response: %w", formatScheduleTriggerResponseErr)
		}
	}

	// Format the user response
	var triggeredByUserResponse *irminmodels.User
	if workflowRun.TriggeredByUser != nil {
		userSqid, encodeUserSqidErr := sqidManager.Encode("users", uint64(workflowRun.TriggeredByUser.ID))
		if encodeUserSqidErr != nil {
			return nil, fmt.Errorf("error encoding user sqid: %w", encodeUserSqidErr)
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
	workflowSqid, encodeWorkflowSqidErr := sqidManager.Encode("workflows", uint64(workflowRun.WorkflowID))
	if encodeWorkflowSqidErr != nil {
		return nil, fmt.Errorf("error encoding workflow sqid: %w", encodeWorkflowSqidErr)
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
