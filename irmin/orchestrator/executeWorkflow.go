package orchestrator

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"irmin-api/db"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
)

// ExecuteWorkflow executes a workflow and listens for status changes in the database.
func (o *Orchestrator) ExecuteWorkflow(
	ctx context.Context,
	workflow *db.Workflow,
	run *db.WorkflowRun,
) (*db.WorkflowRun, error) {
	if workflow == nil || run == nil {
		return nil, errors.New("workflow or run is nil")
	}

	workflowCtx, cancelWorkflow := context.WithCancel(ctx)
	defer cancelWorkflow()

	statusChan := make(chan string, 1)
	go func() {
		if err := o.listenForStatusChanges(workflowCtx, o.db, run.ID, statusChan); err != nil {
			o.logger.Error("failed to listen for status changes", "error", err)
		}
	}()

	maxRuntime := o.getMaxRuntime(workflow)
	timeoutCtx, cancelTimeout := context.WithTimeout(workflowCtx, time.Duration(maxRuntime)*time.Second)
	defer cancelTimeout()

	resultChan := make(chan *db.WorkflowRun)
	errChan := make(chan error)

	go func() {
		resultRun, err := o.executeWorkflowWithContext(timeoutCtx, workflow, run)
		if err != nil {
			errChan <- err
			return
		}
		resultChan <- resultRun
	}()

	select {
	case err := <-errChan:
		return nil, err
	case result := <-resultChan:
		return result, nil
	case status := <-statusChan:
		return o.handleWorkflowStatus(run, status)
	case <-timeoutCtx.Done():
		if timeoutCtx.Err() == context.DeadlineExceeded {
			return o.handleWorkflowTimeout(run, maxRuntime)
		}
		return nil, timeoutCtx.Err()
	}
}

// handleWorkflowStatus handles the workflow status notification and updates the run accordingly.
func (o *Orchestrator) handleWorkflowStatus(
	run *db.WorkflowRun,
	status string,
) (*db.WorkflowRun, error) {
	var notificationPayload db.RunStatusNotificationPayload
	if err := json.Unmarshal([]byte(status), &notificationPayload); err != nil {
		return nil, fmt.Errorf("failed to parse status notification: %w", err)
	}

	if notificationPayload.Status == string(db.WorkflowStatusCancelled) {
		finishedAt := time.Now()
		run.Status = db.WorkflowStatusCancelled
		run.FinishedAt = &finishedAt
		run.Logs = append(run.Logs, "Workflow execution cancelled by user")
		if err := o.db.Save(&run).Error; err != nil {
			return nil, fmt.Errorf("failed to update workflow run after cancellation: %w", err)
		}
		return run, errors.New("workflow execution cancelled")
	}
	return nil, fmt.Errorf("unexpected workflow status change: %s", notificationPayload.Status)
}

// handleWorkflowTimeout handles the workflow timeout and updates the run accordingly.
func (o *Orchestrator) handleWorkflowTimeout(
	run *db.WorkflowRun,
	maxRuntime int,
) (*db.WorkflowRun, error) {
	finishedAt := time.Now()
	run.Status = db.WorkflowStatusError
	run.FinishedAt = &finishedAt
	run.Logs = append(run.Logs, fmt.Sprintf("Workflow execution timed out after %d seconds", maxRuntime))
	if err := o.db.Save(&run).Error; err != nil {
		return nil, fmt.Errorf("failed to update workflow run after timeout: %w", err)
	}
	return run, fmt.Errorf("workflow execution timed out after %d seconds", maxRuntime)
}

// getMaxRuntime returns the maximum runtime for a workflow.
func (o *Orchestrator) getMaxRuntime(workflow *db.Workflow) int {
	if workflow.Schedule != nil && workflow.Schedule.MaxRuntime > 0 {
		return workflow.Schedule.MaxRuntime
	}
	return DefaultMaxWorkflowRuntime
}

// handleNotification processes a single notification and sends it to the status channel if relevant.
func (o *Orchestrator) handleNotification(
	ctx context.Context,
	notification *pgconn.Notification,
	runID uint,
	statusChan chan<- string,
) error {
	var notificationPayload db.RunStatusNotificationPayload
	if err := json.Unmarshal([]byte(notification.Payload), &notificationPayload); err != nil {
		o.logger.ErrorContext(ctx, "failed to parse notification payload", "error", err)
		// Skip invalid notifications
		return nil
	}

	if notificationPayload.ID == runID {
		select {
		case statusChan <- notification.Payload:
		case <-ctx.Done():
			return ctx.Err()
		default:
			// Channel is full, skip
		}
	}
	return nil
}

// listenForStatusChanges listens for workflow run status changes in PostgreSQL.
func (o *Orchestrator) listenForStatusChanges(
	ctx context.Context,
	d *db.Database,
	runID uint,
	statusChan chan<- string,
) error {
	cleanup, err := d.ListenForNotifications(ctx, "workflow_run_status")
	if err != nil {
		return fmt.Errorf("failed to start listening for status changes: %w", err)
	}
	defer func() {
		if cleanupErr := cleanup(); cleanupErr != nil {
			o.logger.ErrorContext(ctx, "failed to cleanup notification listener", "error", cleanupErr)
		}
	}()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
			ctxWithTimeout, cancel := context.WithTimeout(ctx, ListenForStatusChangesTimeout)
			notification, waitForNotificationErr := d.WaitForNotification(ctxWithTimeout, "workflow_run_status")
			cancel()

			if waitForNotificationErr != nil {
				if errors.Is(waitForNotificationErr, context.DeadlineExceeded) {
					continue
				}
				if errors.Is(waitForNotificationErr, context.Canceled) {
					return ctx.Err()
				}
				return fmt.Errorf("error waiting for notification: %w", waitForNotificationErr)
			}

			if handleNotificationErr := o.handleNotification(ctx, notification, runID, statusChan); handleNotificationErr != nil {
				return handleNotificationErr
			}
		}
	}
}

// executeWorkflowableByType executes a workflowable based on its type.
func (o *Orchestrator) executeWorkflowableByType(
	ctx context.Context,
	workflow *db.Workflow,
	wf any,
) ([]string, error) {
	switch workflow.Type {
	case db.WorkflowableTypeAction:
		actionWorkflowable, ok := wf.(*db.ActionWorkflowable)
		if !ok {
			return []string{
					"Invalid workflowable type: expected ActionWorkflowable",
				}, fmt.Errorf(
					"invalid workflowable type: expected ActionWorkflowable, got %T",
					wf,
				)
		}
		return o.executeActionWorkflowable(ctx, workflow, actionWorkflowable)

	case db.WorkflowableTypeExport:
		exportWorkflowable, ok := wf.(*db.ExportWorkflowable)
		if !ok {
			return []string{
					"Invalid workflowable type: expected ExportWorkflowable",
				}, fmt.Errorf(
					"invalid workflowable type: expected ExportWorkflowable, got %T",
					wf,
				)
		}
		return o.executeExportWorkflowable(ctx, workflow, exportWorkflowable)

	case db.WorkflowableTypeImport:
		importWorkflowable, ok := wf.(*db.ImportWorkflowable)
		if !ok {
			return []string{
					"Invalid workflowable type: expected ImportWorkflowable",
				}, fmt.Errorf(
					"invalid workflowable type: expected ImportWorkflowable, got %T",
					wf,
				)
		}
		return o.executeImportWorkflowable(ctx, workflow, importWorkflowable)

	case db.WorkflowableTypePipeline:
		pipelineWorkflowable, ok := wf.(*db.PipelineWorkflowable)
		if !ok {
			return []string{
					"Invalid workflowable type: expected PipelineWorkflowable",
				}, fmt.Errorf(
					"invalid workflowable type: expected PipelineWorkflowable, got %T",
					wf,
				)
		}
		return o.executePipelineWorkflowable(ctx, workflow, pipelineWorkflowable)

	default:
		return []string{fmt.Sprintf("Unknown workflow type: %s", workflow.Type)},
			fmt.Errorf("unknown workflow type: %s", workflow.Type)
	}
}

// getWorkflowableByType retrieves a workflowable based on the workflow type.
func (o *Orchestrator) getWorkflowableByType(workflow *db.Workflow) (any, error) {
	switch workflow.Type {
	case db.WorkflowableTypeAction:
		return o.db.GetActionWorkflowableByID(*workflow.ActionID)
	case db.WorkflowableTypeExport:
		return o.db.GetExportWorkflowableByID(*workflow.ExportID)
	case db.WorkflowableTypeImport:
		return o.db.GetImportWorkflowableByID(*workflow.ImportID)
	case db.WorkflowableTypePipeline:
		return o.db.GetPipelineWorkflowableByID(*workflow.PipelineID)
	default:
		return nil, fmt.Errorf("unknown workflow type: %s", workflow.Type)
	}
}

// executeWorkflowWithContext executes a workflow with retry logic.
func (o *Orchestrator) executeWorkflowWithContext(
	ctx context.Context,
	workflow *db.Workflow,
	run *db.WorkflowRun,
) (*db.WorkflowRun, error) {
	maxAttempts := o.getMaxAttempts(workflow)
	allAttemptsLogs := []string{}
	allAttemptsFailed := true

	for attempts := range maxAttempts {
		if ctx.Err() != nil {
			return o.updateRunLogsAndReturn(run, allAttemptsLogs)
		}

		wf, err := o.getWorkflowableByType(workflow)
		if err != nil {
			allAttemptsLogs = append(allAttemptsLogs, fmt.Sprintf("Failed to get workflowable: %v", err))
			continue
		}

		logs, err := o.executeWorkflowableByType(ctx, workflow, wf)
		allAttemptsLogs = append(allAttemptsLogs, logs...)

		if err != nil {
			if ctx.Err() != nil {
				return o.updateRunLogsAndReturn(run, allAttemptsLogs)
			}
			if attempts < maxAttempts-1 {
				allAttemptsLogs = append(
					allAttemptsLogs,
					fmt.Sprintf("Attempt %d failed", attempts+1),
					"--------------------------------",
					"Retrying...",
				)
				continue
			}
		} else {
			allAttemptsFailed = false
			break
		}
	}

	if ctx.Err() == nil {
		return o.updateWorkflowRunStatus(run, allAttemptsLogs, allAttemptsFailed)
	}

	return run, nil
}

// getMaxAttempts returns the maximum number of attempts for a workflow.
func (o *Orchestrator) getMaxAttempts(workflow *db.Workflow) int {
	if workflow.Schedule != nil && workflow.Schedule.MaxRetries > 0 {
		return workflow.Schedule.MaxRetries + 1 // +1 for initial attempt
	}
	return 1
}

// updateWorkflowRunStatus updates the workflow run status and logs.
func (o *Orchestrator) updateWorkflowRunStatus(
	run *db.WorkflowRun,
	logs []string,
	allAttemptsFailed bool,
) (*db.WorkflowRun, error) {
	finishedAt := time.Now()
	run.Status = db.WorkflowStatusComplete
	if allAttemptsFailed {
		run.Status = db.WorkflowStatusError
	}
	run.FinishedAt = &finishedAt
	run.Logs = logs
	if err := o.db.Save(&run).Error; err != nil {
		return nil, fmt.Errorf("failed to update workflow run: %w", err)
	}
	return run, nil
}

// updateRunLogsAndReturn updates the run with collected logs and returns with cancellation error.
func (o *Orchestrator) updateRunLogsAndReturn(
	run *db.WorkflowRun,
	logs []string,
) (*db.WorkflowRun, error) {
	run.Logs = logs
	if err := o.db.Save(&run).Error; err != nil {
		return nil, fmt.Errorf("failed to update workflow run logs: %w", err)
	}
	return run, context.Canceled
}
