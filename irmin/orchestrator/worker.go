package orchestrator

import (
	"context"
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
		// Get the workflow run from the database
		workflowRun, err := o.db.GetWorkflowRunByID(*event.WorkflowRunID)
		if err != nil {
			return err
		}

		// Get the workflow from the database
		workflow, err := o.db.GetWorkflowByID(workflowRun.WorkflowID)
		if err != nil {
			return err
		}

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
			return err
		}

		// Notify the orchestrator that the workflow run has finished
		o.AddWorkerEvent(&WorkerEvent{
			Topic:                WorkerEventTopicWorkflowRun,
			WorkflowRunEventType: db.PostWorkflowRun,
			WorkflowRunID:        workflowRun.ID,
			WorkflowID:           workflow.ID,
		})
	}
	return nil
}
