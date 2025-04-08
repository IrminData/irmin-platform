package lib

import (
	"context"
	"fmt"
	"irmin-api/db"
	"log"
	"time"
)

func ExecuteWorkflow(ctx context.Context, workflow db.Workflow, user *db.User, trigger *db.WorkflowTrigger) (*db.WorkflowRun, error) {
	// Save the workflow run to the database.
	startedAt := time.Now()
	run, err := db.CreateWorkflowRun(&db.WorkflowRun{
		Status:            db.WorkflowStatusRunning,
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
		// Execute the action workflowable.
		executionLogs, err := ExecuteActionWorkflowable(ctx, &workflow, workflow.Action, run)
		if err != nil {
			log.Printf("Failed to execute action workflowable: %v", err)
			hasError = true
		}
		logs = append(logs, executionLogs...)
	case db.WorkflowableTypeExport:
		// Execute the export workflowable.
		executionLogs, err := ExecuteExportWorkflowable(ctx, &workflow, workflow.Export, run)
		if err != nil {
			log.Printf("Failed to execute export workflowable: %v", err)
			hasError = true
		}
		logs = append(logs, executionLogs...)
	case db.WorkflowableTypeImport:
		// Execute the import workflowable.
		executionLogs, err := ExecuteImportWorkflowable(ctx, &workflow, workflow.Import, run)
		if err != nil {
			log.Printf("Failed to execute import workflowable: %v", err)
			hasError = true
		}
		logs = append(logs, executionLogs...)
	case db.WorkflowableTypePipeline:
		// Execute the pipeline workflowable.
		executionLogs, err := ExecutePipelineWorkflowable(ctx, &workflow, workflow.Pipeline, run)
		if err != nil {
			log.Printf("Failed to execute pipeline workflowable: %v", err)
			hasError = true
		}
		logs = append(logs, executionLogs...)
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
