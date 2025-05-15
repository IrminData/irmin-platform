package lib

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"irmin-api/db"
	"log"
	"time"
)

// ExecuteWorkflow executes a workflow and listens for status changes in the database.
func ExecuteWorkflow(
	ctx context.Context,
	d *db.Database,
	workflow *db.Workflow,
	run *db.WorkflowRun,
) (*db.WorkflowRun, error) {
	// Make sure we have a workflow and a run.
	if workflow == nil {
		return nil, errors.New("workflow is nil")
	}
	if run == nil {
		return nil, errors.New("run is nil")
	}

	// Create a cancellable context for the workflow execution
	workflowCtx, cancelWorkflow := context.WithCancel(ctx)
	defer cancelWorkflow()

	// Start listening for workflow run status changes
	statusChan := make(chan string, 1)
	go listenForStatusChanges(workflowCtx, d, run.ID, statusChan)

	// Set max runtime from schedule or default to 120 seconds
	maxRuntime := 120 // default value
	if workflow.Schedule != nil {
		if workflow.Schedule.MaxRuntime > 0 {
			maxRuntime = workflow.Schedule.MaxRuntime
		}
	}

	// Create a timeout context based on maxRuntime
	timeoutCtx, cancelTimeout := context.WithTimeout(workflowCtx, time.Duration(maxRuntime)*time.Second)
	defer cancelTimeout()

	// Create a channel to receive the result
	resultChan := make(chan *db.WorkflowRun)
	errChan := make(chan error)

	// Execute the workflow in a goroutine
	go func() {
		run, err := executeWorkflowWithContext(timeoutCtx, d, workflow, run)
		if err != nil {
			errChan <- err
			return
		}
		resultChan <- run
	}()

	// Wait for either completion, timeout, or cancellation
	select {
	case err := <-errChan:
		return nil, err
	case run := <-resultChan:
		return run, nil
	case status := <-statusChan:
		// Parse the notification
		var notificationPayload db.RunStatusNotificationPayload
		if err := json.Unmarshal([]byte(status), &notificationPayload); err != nil {
			return nil, fmt.Errorf("failed to parse status notification: %w", err)
		}

		// If the status is cancelled, update the run and return
		if notificationPayload.Status == string(db.WorkflowStatusCancelled) {
			finishedAt := time.Now()
			run.Status = db.WorkflowStatusCancelled
			run.FinishedAt = &finishedAt
			run.Logs = append(run.Logs, "Workflow execution cancelled by user")
			run, err := d.UpdateWorkflowRun(run)
			if err != nil {
				return nil, fmt.Errorf("failed to update workflow run after cancellation: %w", err)
			}
			return run, errors.New("workflow execution cancelled")
		}
		return nil, fmt.Errorf("unexpected workflow status change: %s", notificationPayload.Status)
	case <-timeoutCtx.Done():
		if timeoutCtx.Err() == context.DeadlineExceeded {
			// Update the workflow run status to error
			finishedAt := time.Now()
			run.Status = db.WorkflowStatusError
			run.FinishedAt = &finishedAt
			run.Logs = append(run.Logs, fmt.Sprintf("Workflow execution timed out after %d seconds", maxRuntime))
			run, err := d.UpdateWorkflowRun(run)
			if err != nil {
				return nil, fmt.Errorf("failed to update workflow run after timeout: %w", err)
			}
			return run, fmt.Errorf("workflow execution timed out after %d seconds", maxRuntime)
		}
		return nil, timeoutCtx.Err()
	}
}

// listenForStatusChanges listens for workflow run status changes in PostgreSQL.
func listenForStatusChanges(ctx context.Context, d *db.Database, runID uint, statusChan chan<- string) {
	// Start listening for notifications
	cleanup, err := d.ListenForNotifications(ctx, "workflow_run_status")
	if err != nil {
		log.Printf("Failed to start listening for status changes: %v", err)
		return
	}
	defer cleanup()

	// Background goroutine to handle notifications
	for {
		select {
		case <-ctx.Done():
			return
		default:
			// Wait for notification with timeout
			ctxWithTimeout, cancel := context.WithTimeout(ctx, 90*time.Second)
			notification, err := d.WaitForNotification(ctxWithTimeout, "workflow_run_status")
			cancel()

			if err != nil {
				if errors.Is(err, context.DeadlineExceeded) {
					continue
				}
				if errors.Is(err, context.Canceled) {
					return
				}
				log.Printf("Error waiting for notification: %v", err)
				return
			}

			// Parse the notification
			var notificationPayload db.RunStatusNotificationPayload
			if err := json.Unmarshal([]byte(notification.Payload), &notificationPayload); err != nil {
				log.Printf("Failed to parse status notification: %v", err)
				continue
			}

			// Only process notifications for our run ID
			if notificationPayload.ID == runID {
				select {
				case statusChan <- notification.Payload:
				case <-ctx.Done():
					return
				default:
					// Channel is full, skip
					log.Printf("Status notification channel full, skipping notification")
				}
			}
		}
	}
}

// updateRunLogsAndReturn updates the run with collected logs and returns with cancellation error.
func updateRunLogsAndReturn(
	ctx context.Context,
	d *db.Database,
	run *db.WorkflowRun,
	logs []string,
) (*db.WorkflowRun, error) {
	run.Logs = logs
	run, err := d.UpdateWorkflowRun(run)
	if err != nil {
		return nil, fmt.Errorf("failed to update workflow run logs: %w", err)
	}
	return run, ctx.Err()
}

// executeWorkflowable executes a workflowable and handles cancellation.
func executeWorkflowable(
	ctx context.Context,
	d *db.Database,
	workflow *db.Workflow,
	workflowableType db.WorkflowableType,
	getWorkflowable func() (any, error),
	executeWorkflowable func(context.Context, *db.Database, *db.Workflow, any) ([]string, error),
) ([]string, error) {
	// Fetch the workflowable
	workflowable, err := getWorkflowable()
	if err != nil {
		log.Printf("Failed to get %s workflowable: %v", workflowableType, err)
		return []string{fmt.Sprintf("System error while getting %s workflowable", workflowableType)}, err
	}

	// Execute the workflowable
	executionLogs, err := executeWorkflowable(ctx, d, workflow, workflowable)
	if err != nil {
		if ctx.Err() != nil {
			// If cancelled, return logs with cancellation error
			return executionLogs, ctx.Err()
		}
		log.Printf("Failed to execute %s workflowable: %v", workflowableType, err)
		return append(executionLogs, fmt.Sprintf("System error while executing %s workflowable", workflowableType)), err
	}

	return executionLogs, nil
}

func executeWorkflowWithContext(
	ctx context.Context,
	d *db.Database,
	workflow *db.Workflow,
	run *db.WorkflowRun,
) (*db.WorkflowRun, error) {
	// Get the max attempts from the schedule, or set to 1 if it is not set.
	attempts := 0
	maxAttempts := 1
	if workflow.Schedule != nil && workflow.Schedule.MaxRetries > 0 {
		maxAttempts = workflow.Schedule.MaxRetries
	}

	// Initialize the logs and the failed flag.
	allAttemptsLogs := []string{}
	allAttemptsFailed := true

	// Loop through the attempts.
	for attempts < maxAttempts {
		// Check if context is done
		if ctx.Err() != nil {
			return updateRunLogsAndReturn(ctx, d, run, allAttemptsLogs)
		}

		// Define variables to collect during the workflow run.
		var logs []string
		var hasError bool

		// Process further based on the workflow type.
		switch workflow.Type {
		case db.WorkflowableTypeAction:
			logs, err := executeWorkflowable(
				ctx, d, workflow,
				db.WorkflowableTypeAction,
				func() (any, error) { return d.GetActionWorkflowableByID(*workflow.ActionID) },
				func(ctx context.Context, d *db.Database, w *db.Workflow, wf any) ([]string, error) {
					return ExecuteActionWorkflowable(ctx, d, w, wf.(*db.ActionWorkflowable))
				},
			)
			if err != nil {
				if ctx.Err() != nil {
					allAttemptsLogs = append(allAttemptsLogs, logs...)
					return updateRunLogsAndReturn(ctx, d, run, allAttemptsLogs)
				}
				hasError = true
			}
			allAttemptsLogs = append(allAttemptsLogs, logs...)

		case db.WorkflowableTypeExport:
			logs, err := executeWorkflowable(
				ctx, d, workflow,
				db.WorkflowableTypeExport,
				func() (any, error) { return d.GetExportWorkflowableByID(*workflow.ExportID) },
				func(ctx context.Context, d *db.Database, w *db.Workflow, wf any) ([]string, error) {
					return ExecuteExportWorkflowable(ctx, d, w, wf.(*db.ExportWorkflowable))
				},
			)
			if err != nil {
				if ctx.Err() != nil {
					allAttemptsLogs = append(allAttemptsLogs, logs...)
					return updateRunLogsAndReturn(ctx, d, run, allAttemptsLogs)
				}
				hasError = true
			}
			allAttemptsLogs = append(allAttemptsLogs, logs...)

		case db.WorkflowableTypeImport:
			logs, err := executeWorkflowable(
				ctx, d, workflow,
				db.WorkflowableTypeImport,
				func() (any, error) { return d.GetImportWorkflowableByID(*workflow.ImportID) },
				func(ctx context.Context, d *db.Database, w *db.Workflow, wf any) ([]string, error) {
					return ExecuteImportWorkflowable(ctx, d, w, wf.(*db.ImportWorkflowable))
				},
			)
			if err != nil {
				if ctx.Err() != nil {
					allAttemptsLogs = append(allAttemptsLogs, logs...)
					return updateRunLogsAndReturn(ctx, d, run, allAttemptsLogs)
				}
				hasError = true
			}
			allAttemptsLogs = append(allAttemptsLogs, logs...)

		case db.WorkflowableTypePipeline:
			logs, err := executeWorkflowable(
				ctx, d, workflow,
				db.WorkflowableTypePipeline,
				func() (any, error) { return d.GetPipelineWorkflowableByID(*workflow.PipelineID) },
				func(ctx context.Context, d *db.Database, w *db.Workflow, wf any) ([]string, error) {
					return ExecutePipelineWorkflowable(ctx, d, w, wf.(*db.PipelineWorkflowable))
				},
			)
			if err != nil {
				if ctx.Err() != nil {
					allAttemptsLogs = append(allAttemptsLogs, logs...)
					return updateRunLogsAndReturn(ctx, d, run, allAttemptsLogs)
				}
				hasError = true
			}
			allAttemptsLogs = append(allAttemptsLogs, logs...)

		default:
			logs = append(logs, fmt.Sprintf("Unknown workflow type: %s", workflow.Type))
			hasError = true
			allAttemptsLogs = append(allAttemptsLogs, logs...)
		}

		// If there was an error, append the attempt number, a separator, and a message to the all attempts logs,
		// and increment the attempt number.
		if hasError {
			attempts++
			allAttemptsLogs = append(
				allAttemptsLogs,
				fmt.Sprintf("Attempt %d failed", attempts),
				"--------------------------------",
				"Retrying...",
			)
		} else {
			// If there was no error, set the all attempts failed flag to false and break the loop.
			allAttemptsFailed = false
			break
		}
	}

	// Only update status if we haven't been cancelled
	if ctx.Err() == nil {
		// Update the workflow run once the previous process is finished.
		finishedAt := time.Now()
		run.Status = db.WorkflowStatusComplete
		if allAttemptsFailed {
			run.Status = db.WorkflowStatusError
		}
		run.FinishedAt = &finishedAt
		run.Logs = allAttemptsLogs
		var err error
		run, err = d.UpdateWorkflowRun(run)
		if err != nil {
			return nil, fmt.Errorf("failed to update workflow run: %w", err)
		}
	}

	return run, nil
}
