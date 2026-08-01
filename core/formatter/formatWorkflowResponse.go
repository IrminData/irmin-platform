package formatter

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	irminsqids "github.com/IrminData/irmin-platform/sdks/go/sqids"
)

// FormatWorkflowResponse creates a workflow response object from a workflow object.
func FormatWorkflowResponse(
	d *db.Database,
	workflow *db.Workflow,
	sqidManager *irminsqids.SQIDManager,
) (*irminmodels.Workflow, error) {
	// Run all formatting operations concurrently using async utilities
	ownerFuture := utils.Async(func() (*irminmodels.User, error) {
		return FormatUserResponse(&workflow.Owner, sqidManager)
	})

	workflowableFuture := utils.Async(func() (*irminmodels.Workflowable, error) {
		return FormatWorkflowableResponse(d, workflow, sqidManager)
	})

	scheduleFuture := utils.Async(func() (*irminmodels.Schedule, error) {
		if workflow.ScheduleID == nil {
			return &irminmodels.Schedule{}, nil
		}
		if workflow.Schedule != nil {
			return FormatScheduleResponse(workflow.Schedule, sqidManager)
		}
		// Fetch the schedule only if not already defined
		schedule, err := d.GetScheduleByID(*workflow.ScheduleID)
		if err != nil {
			return nil, fmt.Errorf("error retrieving schedule: %w", err)
		}
		return FormatScheduleResponse(schedule, sqidManager)
	})

	tagsFuture := utils.Async(func() ([]irminmodels.Tag, error) {
		return FormatTagsResponse(workflow.Tags, sqidManager)
	})

	// Await all results
	ownerResponse, err := ownerFuture.Await()
	if err != nil {
		return nil, err
	}

	workflowableResponse, err := workflowableFuture.Await()
	if err != nil {
		return nil, err
	}

	scheduleResponse, err := scheduleFuture.Await()
	if err != nil {
		return nil, err
	}

	tagsResponse, err := tagsFuture.Await()
	if err != nil {
		return nil, err
	}

	// Find the latest workflow run status.
	latestStatus := irminmodels.WorkflowStatusInitiating
	if workflow.Paused {
		latestStatus = irminmodels.WorkflowStatusPaused
	} else {
		latestWorkflowRun, _ := d.GetLatestWorkflowRunByWorkflowID(workflow.ID)
		// Check if workflow run actually exists (ID > 0) to avoid using empty struct
		if latestWorkflowRun != nil && latestWorkflowRun.ID > 0 {
			latestStatus = latestWorkflowRun.Status
		}
	}

	// Structure the workflow response.
	workflowSqid, err := sqidManager.Encode("workflows", uint64(workflow.ID))
	if err != nil {
		return nil, err
	}
	workflowResponse := irminmodels.Workflow{
		ID:            workflowSqid,
		Name:          workflow.Name,
		Description:   workflow.Description,
		Documentation: workflow.Documentation,
		Status:        latestStatus,
		Type:          workflow.Type,
		Owner:         *ownerResponse,
		Tags:          tagsResponse,
		Schedule:      scheduleResponse,
		Workflowable:  workflowableResponse,
	}

	return &workflowResponse, nil
}
