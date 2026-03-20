package orchestrator

import (
	"context"
	"errors"
	"fmt"
	"irmin-api/db"
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// buildWorkflowStartLog creates a WorkflowStartLog with trigger information from the workflow run.
func buildWorkflowStartLog(workflow *db.Workflow, run *db.WorkflowRun) WorkflowStartLog {
	log := WorkflowStartLog{
		BaseLogEntry: BaseLogEntry{
			Message: fmt.Sprintf("Starting workflow: %s", workflow.Name),
		},
		WorkflowID:   workflow.ID,
		WorkflowName: workflow.Name,
		WorkflowType: string(workflow.Type),
		RunID:        run.ID,
		TriggerType:  "unknown",
	}

	// Determine trigger type and details
	switch {
	case run.TriggeredByUser != nil:
		log.TriggerType = "manual"
		log.TriggeredBy = run.TriggeredByUser.Email
	case run.TriggeredBy != nil:
		populateTriggerDetails(&log, run.TriggeredBy)
	}

	return log
}

// populateTriggerDetails fills in trigger-specific fields in the WorkflowStartLog.
func populateTriggerDetails(log *WorkflowStartLog, trigger *db.WorkflowTrigger) {
	log.TriggerType = string(trigger.Type)
	log.TriggerID = &trigger.ID

	switch trigger.Type {
	case db.TimeTriggerType:
		if trigger.Cron != nil {
			log.Cron = *trigger.Cron
		}
		if trigger.RRule != nil {
			log.RRule = *trigger.RRule
		}
	case db.RepositoryTriggerType:
		populateRepositoryTrigger(log, trigger)
	case db.WorkflowRunTriggerType:
		populateWorkflowRunTrigger(log, trigger)
	case db.ConnectionEventTriggerType:
		populateConnectionEventTrigger(log, trigger)
	}
}

// populateRepositoryTrigger fills repository event trigger details.
func populateRepositoryTrigger(log *WorkflowStartLog, trigger *db.WorkflowTrigger) {
	if trigger.RepositoryEvent != nil {
		log.RepositoryEvent = string(*trigger.RepositoryEvent)
	}
	if trigger.Repository != nil {
		log.RepositorySlug = trigger.Repository.Slug
	}
	if trigger.RepositoryRef != nil {
		log.RepositoryRef = *trigger.RepositoryRef
	}
}

// populateWorkflowRunTrigger fills workflow run event trigger details.
func populateWorkflowRunTrigger(log *WorkflowStartLog, trigger *db.WorkflowTrigger) {
	if trigger.WorkflowRunEvent != nil {
		log.WorkflowRunEvent = string(*trigger.WorkflowRunEvent)
	}
	if trigger.Workflow != nil {
		log.LinkedWorkflowID = &trigger.Workflow.ID
		log.LinkedWorkflowName = trigger.Workflow.Name
	}
}

// populateConnectionEventTrigger fills connection event trigger details.
func populateConnectionEventTrigger(log *WorkflowStartLog, trigger *db.WorkflowTrigger) {
	if trigger.ConnectionEventType != nil {
		log.ConnectionEventType = string(*trigger.ConnectionEventType)
	}
	if trigger.Connection != nil {
		log.ConnectionID = &trigger.Connection.ID
		log.ConnectionName = trigger.Connection.Name
	}
}

// ExecuteWorkflow executes a workflow and listens for status changes in the database.
func (o *Orchestrator) ExecuteWorkflow(
	ctx context.Context,
	workflow *db.Workflow,
	run *db.WorkflowRun,
) (*db.WorkflowRun, error) {
	if workflow == nil || run == nil {
		return nil, errors.New("workflow or run is nil")
	}

	o.logger.InfoContext(ctx, "ExecuteWorkflow called",
		"workflow_id", workflow.ID,
		"workflow_run_id", run.ID)

	// Set a timeout for the workflow
	maxRuntime := o.getMaxRuntime(workflow)
	timeoutCtx, cancelTimeout := context.WithTimeout(ctx, time.Duration(maxRuntime)*time.Second)
	defer cancelTimeout()

	o.logger.InfoContext(ctx, "starting workflow execution with timeout",
		"workflow_run_id", run.ID,
		"timeout_seconds", maxRuntime)

	// Execute the workflow directly (no separate goroutine needed since we're already in a goroutine)
	resultRun, err := o.executeWorkflowWithContext(timeoutCtx, workflow, run)

	o.logger.InfoContext(ctx, "executeWorkflowWithContext returned",
		"workflow_run_id", run.ID,
		"error", err)

	// Check if context was cancelled or timed out
	if err != nil && (errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded)) {
		// Context was cancelled - handle based on the type of cancellation
		if timeoutCtx.Err() == context.DeadlineExceeded {
			// Timeout
			o.logger.InfoContext(ctx, "workflow execution timed out",
				"workflow_run_id", run.ID,
				"timeout_seconds", maxRuntime)
			return o.handleWorkflowTimeout(run, maxRuntime)
		}
		// User cancelled
		o.logger.InfoContext(ctx, "workflow execution cancelled by user",
			"workflow_run_id", run.ID)
		return o.handleWorkflowCancellation(run)
	}

	return resultRun, err
}

// handleWorkflowTimeout handles the workflow timeout and updates the run accordingly.
func (o *Orchestrator) handleWorkflowTimeout(
	run *db.WorkflowRun,
	maxRuntime int,
) (*db.WorkflowRun, error) {
	finishedAt := time.Now()
	run.Status = irminmodels.WorkflowStatusError
	run.FinishedAt = &finishedAt
	run.Logs = append(run.Logs, fmt.Sprintf("Workflow execution timed out after %d seconds", maxRuntime))
	if err := o.db.Save(&run).Error; err != nil {
		return nil, fmt.Errorf("failed to update workflow run after timeout: %w", err)
	}

	// Invalidate cache so clients get fresh status
	o.InvalidateWorkflowRunCache(run)

	return run, fmt.Errorf("workflow execution timed out after %d seconds", maxRuntime)
}

// handleWorkflowCancellation handles workflow cancellation and updates the run accordingly.
func (o *Orchestrator) handleWorkflowCancellation(run *db.WorkflowRun) (*db.WorkflowRun, error) {
	// The database status might already be set to cancelled by the API
	// We just need to ensure finished_at is set and add execution logs
	if run.FinishedAt == nil {
		finishedAt := time.Now()
		run.FinishedAt = &finishedAt
	}

	run.Status = irminmodels.WorkflowStatusCancelled
	run.Logs = append(run.Logs, "Workflow execution cancelled")

	if err := o.db.Save(&run).Error; err != nil {
		return nil, fmt.Errorf("failed to update workflow run after cancellation: %w", err)
	}

	// Invalidate cache so clients get fresh status
	o.InvalidateWorkflowRunCache(run)

	o.logger.Info("workflow run cancelled and cleaned up", "run_id", run.ID)
	return run, errors.New("workflow execution cancelled")
}

// getMaxRuntime returns the maximum runtime for a workflow.
func (o *Orchestrator) getMaxRuntime(workflow *db.Workflow) int {
	if workflow.Schedule != nil && workflow.Schedule.MaxRuntime > 0 {
		return workflow.Schedule.MaxRuntime
	}
	return DefaultMaxWorkflowRuntime
}

// executeWorkflowableByType executes a workflowable based on its type.
func (o *Orchestrator) executeWorkflowableByType(
	ctx context.Context,
	workflow *db.Workflow,
	run *db.WorkflowRun,
	wf any,
) ([]string, error) {
	switch workflow.Type {
	case irminmodels.WorkflowableTypeAction:
		actionWorkflowable, ok := wf.(*db.ActionWorkflowable)
		if !ok {
			return []string{
					"Invalid workflowable type: expected ActionWorkflowable",
				}, fmt.Errorf(
					"invalid workflowable type: expected ActionWorkflowable, got %T",
					wf,
				)
		}
		return o.executeActionWorkflowable(ctx, workflow, run, actionWorkflowable)

	case irminmodels.WorkflowableTypeExport:
		exportWorkflowable, ok := wf.(*db.ExportWorkflowable)
		if !ok {
			return []string{
					"Invalid workflowable type: expected ExportWorkflowable",
				}, fmt.Errorf(
					"invalid workflowable type: expected ExportWorkflowable, got %T",
					wf,
				)
		}
		return o.executeExportWorkflowable(ctx, workflow, run, exportWorkflowable)

	case irminmodels.WorkflowableTypeImport:
		importWorkflowable, ok := wf.(*db.ImportWorkflowable)
		if !ok {
			return []string{
					"Invalid workflowable type: expected ImportWorkflowable",
				}, fmt.Errorf(
					"invalid workflowable type: expected ImportWorkflowable, got %T",
					wf,
				)
		}
		return o.executeImportWorkflowable(ctx, workflow, run, importWorkflowable)

	case irminmodels.WorkflowableTypePipeline:
		pipelineWorkflowable, ok := wf.(*db.PipelineWorkflowable)
		if !ok {
			return []string{
					"Invalid workflowable type: expected PipelineWorkflowable",
				}, fmt.Errorf(
					"invalid workflowable type: expected PipelineWorkflowable, got %T",
					wf,
				)
		}
		return o.executePipelineWorkflowable(ctx, workflow, run, pipelineWorkflowable)

	default:
		return []string{fmt.Sprintf("Unknown workflow type: %s", workflow.Type)},
			fmt.Errorf("unknown workflow type: %s", workflow.Type)
	}
}

// getWorkflowableByType retrieves a workflowable based on the workflow type.
func (o *Orchestrator) getWorkflowableByType(workflow *db.Workflow) (any, error) {
	switch workflow.Type {
	case irminmodels.WorkflowableTypeAction:
		if workflow.ActionID == nil {
			return nil, errors.New("workflow action ID is nil")
		}
		return o.db.GetActionWorkflowableByID(*workflow.ActionID)
	case irminmodels.WorkflowableTypeExport:
		if workflow.ExportID == nil {
			return nil, errors.New("workflow export ID is nil")
		}
		return o.db.GetExportWorkflowableByID(*workflow.ExportID)
	case irminmodels.WorkflowableTypeImport:
		if workflow.ImportID == nil {
			return nil, errors.New("workflow import ID is nil")
		}
		return o.db.GetImportWorkflowableByID(*workflow.ImportID)
	case irminmodels.WorkflowableTypePipeline:
		if workflow.PipelineID == nil {
			return nil, errors.New("workflow pipeline ID is nil")
		}
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
	o.logger.InfoContext(ctx, "executeWorkflowWithContext called",
		"workflow_id", workflow.ID,
		"workflow_run_id", run.ID)

	// Add workflow start log with trigger information
	lb := NewWorkflowLogBuilder()
	startLog := buildWorkflowStartLog(workflow, run)

	maxAttempts := o.getMaxAttempts(workflow)
	allAttemptsLogs := []string{lb.WorkflowStart(startLog)}
	allAttemptsFailed := true

	o.logger.InfoContext(ctx, "starting workflow execution loop",
		"workflow_run_id", run.ID,
		"max_attempts", maxAttempts)

	for attempts := range maxAttempts {
		o.logger.InfoContext(ctx, "workflow execution attempt",
			"workflow_run_id", run.ID,
			"attempt", attempts+1,
			"max_attempts", maxAttempts)

		if ctx.Err() != nil {
			o.logger.InfoContext(ctx, "context cancelled before attempt",
				"workflow_run_id", run.ID,
				"attempt", attempts+1)
			return o.updateRunLogsAndReturn(run, allAttemptsLogs, ctx.Err())
		}

		o.logger.InfoContext(ctx, "getting workflowable by type",
			"workflow_run_id", run.ID,
			"workflow_type", workflow.Type)

		wf, err := o.getWorkflowableByType(workflow)
		if err != nil {
			errorMsg := fmt.Sprintf("Failed to get workflowable: %v", err)
			o.logger.ErrorContext(ctx, errorMsg, "workflow_id", workflow.ID, "workflow_type", workflow.Type)
			allAttemptsLogs = append(allAttemptsLogs, errorMsg)
			// If we can't get the workflowable, there's no point retrying
			allAttemptsFailed = true
			break
		}

		logs, err := o.executeWorkflowableByType(ctx, workflow, run, wf)
		allAttemptsLogs = append(allAttemptsLogs, logs...)

		if err != nil {
			if ctx.Err() != nil {
				return o.updateRunLogsAndReturn(run, allAttemptsLogs, ctx.Err())
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

	// Context was cancelled or timed out - return with the actual context error
	return o.updateRunLogsAndReturn(run, allAttemptsLogs, ctx.Err())
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
	run.Status = irminmodels.WorkflowStatusComplete
	if allAttemptsFailed {
		run.Status = irminmodels.WorkflowStatusError
	}
	run.FinishedAt = &finishedAt

	// Calculate duration if StartedAt is available
	var durationMs int64
	if run.StartedAt != nil {
		durationMs = finishedAt.Sub(*run.StartedAt).Milliseconds()
	}

	// Add workflow end log
	lb := NewWorkflowLogBuilder()
	endLog := lb.WorkflowEnd(WorkflowEndLog{
		BaseLogEntry: BaseLogEntry{
			Message: fmt.Sprintf("Workflow completed with status: %s", run.Status),
		},
		WorkflowID: run.WorkflowID,
		RunID:      run.ID,
		Status:     string(run.Status),
		DurationMs: durationMs,
	})
	logs = append(logs, endLog)

	run.Logs = logs
	if err := o.db.Save(&run).Error; err != nil {
		return nil, fmt.Errorf("failed to update workflow run: %w", err)
	}

	// Invalidate cache so clients get fresh status and logs
	o.InvalidateWorkflowRunCache(run)

	// Notify billing usage tracker of workflow run completion
	if o.OnWorkflowRunComplete != nil {
		var wf db.Workflow
		if lookupErr := o.db.First(&wf, run.WorkflowID).Error; lookupErr == nil {
			o.OnWorkflowRunComplete(wf.WorkspaceID)
		}
	}

	return run, nil
}

// updateRunLogsAndReturn updates the run with collected logs and returns with the context error.
func (o *Orchestrator) updateRunLogsAndReturn(
	run *db.WorkflowRun,
	logs []string,
	contextErr error,
) (*db.WorkflowRun, error) {
	run.Logs = logs
	if err := o.db.Save(&run).Error; err != nil {
		return nil, fmt.Errorf("failed to update workflow run logs: %w", err)
	}
	return run, contextErr
}
