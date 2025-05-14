package lib

import (
	"context"
	"fmt"
	"irmin-api/db"
	"log"
	"strings"
	"time"
)

func ExecuteWorkflow(
	ctx context.Context,
	workflow db.Workflow,
	user *db.User,
	trigger *db.WorkflowTrigger,
) (*db.WorkflowRun, error) {
	// Save the workflow run to the database.
	startedAt := time.Now()
	run := &db.WorkflowRun{
		Status:     db.WorkflowStatusPending,
		StartedAt:  &startedAt,
		WorkflowID: workflow.ID,
	}
	if user != nil {
		run.TriggeredByUserID = &user.ID
	}
	if trigger != nil {
		run.TriggeredByID = &trigger.ID
	}
	run, err := db.CreateWorkflowRun(run)
	if err != nil {
		return nil, fmt.Errorf("failed to create workflow run: %w", err)
	}

	// Define variables to collect during the workflow run.
	var logs []string
	var hasError bool

	// Process further based on the workflow type.
	switch workflow.Type {
	case db.WorkflowableTypeAction:
		// Fetch the action workflowable from the database.
		actionWorkflowable, err := db.GetActionWorkflowableByID(*workflow.ActionID)
		if err != nil {
			log.Printf("Failed to get action workflowable: %v", err)
			hasError = true
		} else {
			// Execute the action workflowable.
			executionLogs, err := ExecuteActionWorkflowable(ctx, &workflow, actionWorkflowable, run)
			if err != nil {
				log.Printf("Failed to execute action workflowable: %v", err)
				hasError = true
			}
			logs = append(logs, executionLogs...)
		}
	case db.WorkflowableTypeExport:
		// Fetch the export workflowable from the database.
		exportWorkflowable, err := db.GetExportWorkflowableByID(*workflow.ExportID)
		if err != nil {
			log.Printf("Failed to get export workflowable: %v", err)
			hasError = true
		} else {
			// Execute the export workflowable.
			executionLogs, err := ExecuteExportWorkflowable(&workflow, exportWorkflowable, run)
			if err != nil {
				log.Printf("Failed to execute export workflowable: %v", err)
				hasError = true
			}
			logs = append(logs, executionLogs...)
		}
	case db.WorkflowableTypeImport:
		// Fetch the import workflowable from the database.
		importWorkflowable, err := db.GetImportWorkflowableByID(*workflow.ImportID)
		if err != nil {
			log.Printf("Failed to get import workflowable: %v", err)
			hasError = true
		} else {
			// Execute the import workflowable.
			executionLogs, err := ExecuteImportWorkflowable(&workflow, importWorkflowable, run)
			if err != nil {
				log.Printf("Failed to execute import workflowable: %v", err)
				hasError = true
			}
			logs = append(logs, executionLogs...)
		}
	case db.WorkflowableTypePipeline:
		// Fetch the pipeline workflowable from the database.
		pipelineWorkflowable, err := db.GetPipelineWorkflowableByID(*workflow.PipelineID)
		if err != nil {
			log.Printf("Failed to get pipeline workflowable: %v", err)
			hasError = true
		} else {
			// Execute the pipeline workflowable.
			executionLogs, err := ExecutePipelineWorkflowable(ctx, &workflow, pipelineWorkflowable, run)
			if err != nil {
				log.Printf("Failed to execute pipeline workflowable: %v", err)
				hasError = true
			}
			logs = append(logs, executionLogs...)
		}
	default:
		logs = append(logs, fmt.Sprintf("Unknown workflow type: %s", workflow.Type))
		hasError = true
	}

	// Check if there were any errors during the workflow run from the logs.
	for _, logEntry := range logs {
		if logEntry != "" && strings.Contains(strings.ToLower(logEntry), "error") {
			hasError = true
			break
		}
	}

	// Update the workflow run once the previous process is finished.
	finishedAt := time.Now()
	run.Status = db.WorkflowStatusComplete
	if hasError {
		run.Status = db.WorkflowStatusError
	}
	run.FinishedAt = &finishedAt
	run.Logs = logs
	run, err = db.UpdateWorkflowRun(run)
	if err != nil {
		return nil, fmt.Errorf("failed to update workflow run: %w", err)
	}

	return run, nil
}
