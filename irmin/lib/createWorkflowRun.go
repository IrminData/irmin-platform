package lib

import (
	"encoding/json"
	"errors"
	"fmt"
	"irmin-api/db"
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"gorm.io/gorm"
)

// ErrWorkflowMinIntervalNotMet is returned when not enough time has passed since the last workflow run
var ErrWorkflowMinIntervalNotMet = errors.New("workflow min interval not met")

// ErrWorkflowPaused is returned when the workflow is paused.
var ErrWorkflowPaused = errors.New("workflow is paused")

// ErrUsageLimitExceeded is returned when the workspace has exceeded a usage limit (workflow runs, compute invocations, etc).
var ErrUsageLimitExceeded = errors.New("usage limit exceeded")

// UsageCheckFunc checks if a workflow run is allowed for the given workspace.
// Returns true if allowed, false if the limit is exceeded.
type UsageCheckFunc func(workspaceID uint) (bool, error)

// CreateWorkflowRun will check if enough time has passed since the last run.
// If so, it will create a new pending workflow run, update the schedule's previous run time,
// and return the new workflow run.
// Creating a new workflow run will cause the orchestrator to pick it up and execute it.
func CreateWorkflowRun(
	tx *gorm.DB,
	workflow *db.Workflow,
	user *db.User,
	trigger *db.WorkflowTrigger,
	checkUsage UsageCheckFunc,
	manual bool,
) (*db.WorkflowRun, error) {
	// Make sure we have a workflow.
	if workflow == nil {
		return nil, errors.New("workflow is nil")
	}

	// Make sure that the workflow is not paused (skip for manual triggers).
	if workflow.Paused && !manual {
		return nil, ErrWorkflowPaused
	}

	// Check usage limits if a check function is provided.
	if checkUsage != nil {
		allowed, checkErr := checkUsage(workflow.WorkspaceID)
		if checkErr != nil {
			return nil, fmt.Errorf("usage check failed: %w", checkErr)
		}
		if !allowed {
			return nil, ErrUsageLimitExceeded
		}
	}

	// Acquire advisory lock to prevent concurrent workflow run creation for this workflow
	lockKey := fmt.Sprintf("orchestrator:create_workflow_run:%d", workflow.ID)
	if lockErr := db.LockKeyTx(tx, lockKey); lockErr != nil {
		return nil, fmt.Errorf("failed to acquire lock for workflow run creation: %w", lockErr)
	}

	// Make sure that enough time has passed since the last run.
	if workflow.Schedule != nil {
		lastRun := workflow.Schedule.PreviousRun
		if lastRun != nil {
			timeSinceLastRun := time.Since(*lastRun)
			if timeSinceLastRun < time.Duration(workflow.Schedule.MinInterval)*time.Second {
				return nil, ErrWorkflowMinIntervalNotMet
			}
		}
	}

	// Save the workflow run to the database.
	startedAt := time.Now()
	run := &db.WorkflowRun{
		Status:     irminmodels.WorkflowStatusPending,
		StartedAt:  &startedAt,
		WorkflowID: workflow.ID,
	}
	if user != nil {
		run.TriggeredByUserID = &user.ID
	}
	if trigger != nil {
		run.TriggeredByID = &trigger.ID
	}
	if err := tx.Create(&run).Error; err != nil {
		return nil, err
	}
	// Preload all relations including nested trigger relations for proper logging
	if err := tx.Preload("TriggeredBy").
		Preload("TriggeredBy.Repository").
		Preload("TriggeredBy.Workflow").
		Preload("TriggeredByUser").
		Preload("Workflow").
		First(&run, run.ID).Error; err != nil {
		return nil, err
	}

	// Update the schedule's previous run time.
	if workflow.Schedule != nil {
		workflow.Schedule.PreviousRun = &startedAt
		tx.Save(workflow.Schedule)
	}

	return run, nil
}

// CreateWorkflowRunWithPayload creates a workflow run and attaches trigger event data as payload.
// The payload will be available to pipeline stages as trigger_event.json in previousStageResults.
// This is used for connection events and repository events with IncludeDiffAsPatch enabled.
func CreateWorkflowRunWithPayload(
	tx *gorm.DB,
	workflow *db.Workflow,
	user *db.User,
	trigger *db.WorkflowTrigger,
	payload any,
	checkUsage UsageCheckFunc,
	manual bool,
) (*db.WorkflowRun, error) {
	// Create the base workflow run using the existing function
	run, err := CreateWorkflowRun(tx, workflow, user, trigger, checkUsage, manual)
	if err != nil {
		return nil, err
	}

	// If a payload was provided, serialize and attach it
	if payload != nil {
		payloadBytes, marshalErr := json.Marshal(payload)
		if marshalErr != nil {
			return nil, fmt.Errorf("failed to marshal trigger payload: %w", marshalErr)
		}
		run.TriggerPayload = payloadBytes
		if saveErr := tx.Save(run).Error; saveErr != nil {
			return nil, fmt.Errorf("failed to save trigger payload: %w", saveErr)
		}
	}

	return run, nil
}
