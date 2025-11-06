package orchestrator

import (
	"context"
	"fmt"
	"irmin-api/db"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
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

	// TODO
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

	// Check if the run is in the correct status for execution
	if workflowRun.Status != irminmodels.WorkflowStatusInitiating {
		return nil
	}

	// Get the workflow from the database
	workflow, err := o.db.GetWorkflowByID(*event.WorkflowID)
	if err != nil {
		return err
	}

	// Acquire a connection from the pool to check for duplicate execution
	// This is critical because PostgreSQL advisory locks are session-scoped
	lockConn, err := o.db.GetPgxConn(ctx)
	if err != nil {
		o.logger.ErrorContext(ctx, "error acquiring connection for lock", "error", err)
		return err
	}

	// Try to acquire a session-scoped advisory lock to prevent duplicate execution
	lockKey := fmt.Sprintf("orchestrator:execute_workflow_run_event:%d", workflowRun.ID)
	locked, lockErr := db.TryLockKeyConn(ctx, lockConn, lockKey)
	if lockErr != nil {
		lockConn.Release()
		o.logger.ErrorContext(ctx, "error acquiring lock for workflow run", "error", lockErr)
		return lockErr
	}
	if !locked {
		// Another worker is already executing this workflow run
		lockConn.Release()
		return nil
	}

	// Release lock immediately - we only needed it to prevent race condition
	// The workflow run status in the database will track execution state
	if unlockErr := db.UnlockKeyConn(ctx, lockConn, lockKey); unlockErr != nil {
		lockConn.Release()
		o.logger.ErrorContext(ctx, "error releasing lock for workflow run", "error", unlockErr)
		return unlockErr
	}
	lockConn.Release()

	// Claim the run by updating its status to running (if still initiating)
	// This ensures only one worker executes it
	claimResult := o.db.WithContext(ctx).Model(&db.WorkflowRun{}).
		Where("id = ? AND status = ?", workflowRun.ID, irminmodels.WorkflowStatusInitiating).
		Update("status", irminmodels.WorkflowStatusRunning)
	if claimResult.Error != nil {
		return fmt.Errorf("failed to claim workflow run: %w", claimResult.Error)
	}
	if claimResult.RowsAffected == 0 {
		// Another worker already claimed it
		return nil
	}

	// Reload the workflow run to get the updated status
	workflowRun, err = o.db.GetWorkflowRunByID(*event.WorkflowRunID)
	if err != nil {
		return err
	}

	// Execute the workflow in a separate goroutine to avoid blocking the orchestrator
	// We create a new context from background because the parent context will be cancelled
	// immediately after this function returns, which would kill the goroutine
	go func() {
		// Create a cancellable context that won't be cancelled when the parent returns
		workflowCtx, cancelWorkflow := context.WithCancel(context.Background())
		defer cancelWorkflow()

		// Register this workflow run so it can be cancelled externally
		o.RegisterActiveRun(workflowRun.ID, cancelWorkflow)
		defer o.UnregisterActiveRun(workflowRun.ID)

		// Log what is being executed
		o.logger.InfoContext(workflowCtx, "starting workflow execution, about to notify orchestrator",
			"workflow_id", workflow.ID,
			"workflow_run_id", workflowRun.ID)

		// Notify the orchestrator that the workflow run is starting
		o.AddWorkerEvent(&WorkerEvent{
			Topic:                WorkerEventTopicWorkflowRun,
			WorkflowRunEventType: db.PreWorkflowRun,
			WorkflowRunID:        workflowRun.ID,
			WorkflowID:           workflow.ID,
		})

		o.logger.InfoContext(workflowCtx, "starting workflow execution, about to execute workflow",
			"workflow_id", workflow.ID,
			"workflow_run_id", workflowRun.ID)

		// Execute the workflow
		_, executeErr := o.ExecuteWorkflow(workflowCtx, workflow, workflowRun)
		if executeErr != nil {
			o.logger.ErrorContext(workflowCtx, "error executing workflow", "error", executeErr)
		}

		o.logger.InfoContext(workflowCtx, "finished workflow execution",
			"workflow_id", workflow.ID,
			"workflow_run_id", workflowRun.ID)

		// Notify the orchestrator that the workflow run has finished
		o.AddWorkerEvent(&WorkerEvent{
			Topic:                WorkerEventTopicWorkflowRun,
			WorkflowRunEventType: db.PostWorkflowRun,
			WorkflowRunID:        workflowRun.ID,
			WorkflowID:           workflow.ID,
		})
	}()

	return nil
}
