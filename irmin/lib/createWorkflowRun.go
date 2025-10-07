package lib

import (
	"errors"
	"fmt"
	"irmin-api/db"
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"gorm.io/gorm"
)

// CreateWorkflowRun will check if enough time has passed since the last run.
// If so, it will create a new pending workflow run, update the schedule's previous run time,
// and return the new workflow run.
// Creating a new workflow run will cause the orchestrator to pick it up and execute it.
func CreateWorkflowRun(
	tx *gorm.DB,
	workflow *db.Workflow,
	user *db.User,
	trigger *db.WorkflowTrigger,
) (*db.WorkflowRun, error) {
	// Make sure we have a workflow.
	if workflow == nil {
		return nil, errors.New("workflow is nil")
	}

	// Make sure that the workflow is not paused.
	if workflow.Paused {
		return nil, errors.New("workflow is paused")
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
				return nil, errors.New("not enough time has passed since the last run")
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
	if err := tx.Preload("TriggeredBy").Preload("TriggeredByUser").Preload("Workflow").First(&run, run.ID).Error; err != nil {
		return nil, err
	}

	// Update the schedule's previous run time.
	if workflow.Schedule != nil {
		workflow.Schedule.PreviousRun = &startedAt
		tx.Save(workflow.Schedule)
	}

	return run, nil
}
