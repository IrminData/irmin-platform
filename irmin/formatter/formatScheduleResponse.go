package formatter

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/utils"
	"log"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// FormatWorkflowResponse creates a workflow response object from a workflow object.
func FormatScheduleResponse(d *db.Database, schedule *db.Schedule) (*irminmodels.Schedule, error) {
	// Fetch the schedule
	schedule, err := d.GetScheduleByID(schedule.ID)
	if err != nil {
		return nil, fmt.Errorf("error retrieving schedule: %w", err)
	}

	// Format the response
	var scheduleResponse irminmodels.Schedule
	scheduleTriggersResponse := []irminmodels.ScheduleTrigger{} // Initialize empty array by default
	if schedule != nil && schedule.Triggers != nil {
		for _, trigger := range schedule.Triggers {
			var repositorySlug *string
			if trigger.Repository != nil {
				repositorySlug = &trigger.Repository.Slug
			}
			var workflowSqid *string
			if trigger.Workflow != nil {
				sqid, err := utils.EncodeSqids("workflows", uint64(*trigger.WorkflowID))
				if err != nil {
					log.Printf("Error encoding workflow sqid: %v", err)
					return nil, err
				}
				workflowSqid = &sqid
			}
			var repositoryEvent irminmodels.RepositoryEvent
			if trigger.RepositoryEvent != nil {
				repositoryEvent = irminmodels.RepositoryEvent(*trigger.RepositoryEvent)
			}
			var workflowRunEvent irminmodels.WorkflowRunEvent
			if trigger.WorkflowRunEvent != nil {
				workflowRunEvent = irminmodels.WorkflowRunEvent(*trigger.WorkflowRunEvent)
			}
			// Format the schedule trigger
			switch trigger.Type {
			case db.WorkflowRunTriggerType:
				scheduleTriggersResponse = append(scheduleTriggersResponse, irminmodels.ScheduleTrigger{
					Type:             irminmodels.WorkflowRunTriggerType,
					WorkflowID:       workflowSqid,
					WorkflowRunEvent: &workflowRunEvent,
				})
			case db.TimeTriggerType:
				newTrigger := irminmodels.ScheduleTrigger{
					Type: irminmodels.TimeTriggerType,
				}
				if trigger.RRule != nil && *trigger.RRule != "" {
					newTrigger.RRule = trigger.RRule
				}
				if trigger.Cron != nil && *trigger.Cron != "" {
					newTrigger.Cron = trigger.Cron
				}
				scheduleTriggersResponse = append(scheduleTriggersResponse, newTrigger)
			case db.RepositoryTriggerType:
				scheduleTriggersResponse = append(scheduleTriggersResponse, irminmodels.ScheduleTrigger{
					Type:            irminmodels.RepositoryTriggerType,
					RepositoryEvent: &repositoryEvent,
					Repository:      repositorySlug,
					RepositoryRef:   trigger.RepositoryRef,
				})
			}
		}
	}
	if schedule != nil {
		scheduleResponse = irminmodels.Schedule{
			Triggers:    scheduleTriggersResponse,
			MaxRetries:  schedule.MaxRetries,
			MaxRuntime:  schedule.MaxRuntime,
			MinInterval: schedule.MinInterval,
		}
	}
	return &scheduleResponse, nil
}
