package orchestrator

import (
	"context"
	"fmt"
	"irmin-api/db"
)

type WorkerEventTopic string

const (
	WorkerEventTopicWorkflowRun WorkerEventTopic = "workflow_run"
)

type WorkerEvent struct {
	Topic WorkerEventTopic

	// Workflow run event
	WorkflowRunEventType db.WorkflowRunEventType
	WorkflowRunID        uint
	WorkflowID           uint
}

// ExecuteDispatchedEvent executes a dispatched event.
func (o *Orchestrator) ExecuteDispatchedEvent(ctx context.Context, event *DispatchEvent) error {
	o.logger.InfoContext(ctx, "executing dispatched event", "event", event)

	if event.EventType == DispatchEventTypeWorkflowRun {
		return o.executeWorkflowRunEvent(ctx, event)
	}
	return nil
}

// executeWorkflowRunEvent executes a workflow run event with advisory locking.
func (o *Orchestrator) executeWorkflowRunEvent(ctx context.Context, event *DispatchEvent) error {
	// Get the workflow run from the database
	workflowRun, err := o.db.GetWorkflowRunByID(*event.WorkflowRunID)
	if err != nil {
		return err
	}

	// Get the workflow from the database
	workflow, err := o.db.GetWorkflowByID(*event.WorkflowID)
	if err != nil {
		return err
	}

	// Try to acquire a session-scoped advisory lock to prevent duplicate execution
	lockKey := fmt.Sprintf("orchestrator:execute_workflow_run_event:%d", workflowRun.ID)
	locked, lockErr := db.TryLockKey(o.db.DB, lockKey)
	if lockErr != nil {
		o.logger.ErrorContext(ctx, "error acquiring lock for workflow run", "error", lockErr)
		return lockErr
	}
	if !locked {
		// Another worker is already executing this workflow run
		o.logger.InfoContext(
			ctx,
			"workflow run already being executed by another worker, skipping",
			"workflow_run_id",
			workflowRun.ID,
		)
		return nil
	}

	// Ensure the lock is released when done
	defer func() {
		if unlockErr := db.UnlockKey(o.db.DB, lockKey); unlockErr != nil {
			o.logger.ErrorContext(ctx, "error releasing lock for workflow run", "error", unlockErr)
		}
	}()

	// Notify the orchestrator that the workflow run is starting
	o.AddWorkerEvent(&WorkerEvent{
		Topic:                WorkerEventTopicWorkflowRun,
		WorkflowRunEventType: db.PreWorkflowRun,
		WorkflowRunID:        workflowRun.ID,
		WorkflowID:           workflow.ID,
	})

	// Execute the workflow
	_, err = o.ExecuteWorkflow(ctx, workflow, workflowRun)
	if err != nil {
		o.logger.ErrorContext(ctx, "error executing workflow", "error", err)
		return err
	}

	// Notify the orchestrator that the workflow run has finished
	o.AddWorkerEvent(&WorkerEvent{
		Topic:                WorkerEventTopicWorkflowRun,
		WorkflowRunEventType: db.PostWorkflowRun,
		WorkflowRunID:        workflowRun.ID,
		WorkflowID:           workflow.ID,
	})

	return nil
}
