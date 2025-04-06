package lib

import (
	"fmt"
	"irmin-api/db"
	"time"
)

func ExecuteWorkflow(workflow db.Workflow, user *db.User, trigger *db.WorkflowTrigger) (*db.WorkflowRun, error) {
	// Save the workflow run to the database.
	startedAt := time.Now()
	run, err := db.CreateWorkflowRun(&db.WorkflowRun{
		Status:            db.WorkflowStatusPending,
		StartedAt:         &startedAt,
		WorkflowID:        workflow.ID,
		TriggeredByUserID: &user.ID,
		TriggeredByID:     &trigger.ID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create workflow run: %w", err)
	}

	// Define variables to collect during the workflow run.
	var logs []string
	var hasError bool

	// Process further based on the workflow type.
	switch workflow.Type {
	case db.WorkflowableTypeAction:
	case db.WorkflowableTypeExport:
	case db.WorkflowableTypeImport:
	case db.WorkflowableTypePipeline:
	default:
		logs = append(logs, fmt.Sprintf("Unknown workflow type: %s", workflow.Type))
		hasError = true
	}

	// Update the workflow run once the previous process is finished.
	finishedAt := time.Now()
	nextStatus := db.WorkflowStatusComplete
	if hasError {
		nextStatus = db.WorkflowStatusError
	}
	run, err = db.UpdateWorkflowRun(run.ID, map[string]any{
		"status":      nextStatus,
		"finished_at": &finishedAt,
		"logs":        logs,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to update workflow run: %w", err)
	}

	return run, nil
}
