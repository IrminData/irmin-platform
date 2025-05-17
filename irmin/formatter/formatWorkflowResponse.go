package formatter

import (
	"irmin-api/db"
	"irmin-api/utils"
	"log"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// FormatWorkflowResponse creates a workflow response object from a workflow object.
func FormatWorkflowResponse(d *db.Database, workflow *db.Workflow) (*irminmodels.Workflow, error) {
	// Run all formatting operations concurrently
	type formatResult struct {
		owner        *irminmodels.User
		workflowable *irminmodels.Workflowable
		schedule     *irminmodels.Schedule
		err          error
	}

	ch := make(chan formatResult)

	// Launch goroutines for each formatting operation
	go func() {
		owner, err := FormatUserResponse(&workflow.Owner)
		ch <- formatResult{owner: owner, err: err}
	}()

	go func() {
		workflowable, err := FormatWorkflowableResponse(d, workflow)
		ch <- formatResult{workflowable: workflowable, err: err}
	}()

	go func() {
		schedule, err := FormatScheduleResponse(d, workflow.Schedule)
		ch <- formatResult{schedule: schedule, err: err}
	}()

	// Collect results
	var ownerResponse *irminmodels.User
	var workflowableResponse *irminmodels.Workflowable
	var scheduleResponse *irminmodels.Schedule

	for range 3 {
		result := <-ch
		if result.err != nil {
			return nil, result.err
		}
		if result.owner != nil {
			ownerResponse = result.owner
		}
		if result.workflowable != nil {
			workflowableResponse = result.workflowable
		}
		if result.schedule != nil {
			scheduleResponse = result.schedule
		}
	}

	// Find the latest workflow run status.
	latestStatus := irminmodels.WorkflowStatusInitiating
	if workflow.Paused {
		latestStatus = irminmodels.WorkflowStatusPaused
	} else {
		latestWorkflowRun, _ := d.GetLatestWorkflowRunByWorkflowID(workflow.ID)
		if latestWorkflowRun != nil {
			latestStatus = irminmodels.WorkflowStatus(latestWorkflowRun.Status)
		}
	}

	// Structure the workflow response.
	workflowSqid, err := utils.EncodeSqids("workflows", uint64(workflow.ID))
	if err != nil {
		log.Printf("Error encoding workflow sqid: %v", err)
		return nil, err
	}
	workflowResponse := irminmodels.Workflow{
		ID:            workflowSqid,
		Name:          workflow.Name,
		Description:   workflow.Description,
		Documentation: workflow.Documentation,
		Status:        latestStatus,
		Type:          irminmodels.WorkflowableType(workflow.Type),
		Owner:         *ownerResponse,
		Schedule:      scheduleResponse,
		Workflowable:  workflowableResponse,
	}

	return &workflowResponse, nil
}
