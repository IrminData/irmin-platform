package formatter

import (
	"irmin-api/db"

	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// FormatScheduleResponse creates a schedule response object from a schedule object.
func FormatScheduleResponse(schedule *db.Schedule, sqidManager *utils.SQIDManager) (*irminmodels.Schedule, error) {
	// Format the response
	var scheduleResponse irminmodels.Schedule
	scheduleTriggersResponse := []irminmodels.ScheduleTrigger{}
	if schedule != nil && schedule.Triggers != nil {
		for _, trigger := range schedule.Triggers {
			formattedTrigger, err := FormatScheduleTriggerResponse(&trigger, sqidManager)
			if err != nil {
				return nil, err
			}
			if formattedTrigger != nil {
				scheduleTriggersResponse = append(scheduleTriggersResponse, *formattedTrigger)
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
