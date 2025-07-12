package formatter

import (
	"irmin-api/db"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	irminsqids "github.com/IrminData/irmin-sdk-go/sqids"
)

// FormatScheduleResponse creates a schedule response object from a schedule object.
func FormatScheduleResponse(schedule *db.Schedule, sqidManager *irminsqids.SQIDManager) (*irminmodels.Schedule, error) {
	// Format the response
	var scheduleResponse irminmodels.Schedule
	var scheduleTriggersResponse []irminmodels.ScheduleTrigger
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
	if len(scheduleTriggersResponse) == 0 {
		scheduleTriggersResponse = make([]irminmodels.ScheduleTrigger, 0)
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
