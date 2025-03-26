package irminUtils

import (
	"fmt"
	"strconv"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

// PrepareWorkflowScheduleData prepares a map of fields for a workflow schedule.
// Returns an array of fields to be used in a form submission
func PrepareWorkflowScheduleData(schedule irminModels.Schedule) (map[string]string, error) {
	fields := make(map[string]string)

	for index, trigger := range schedule.Triggers {
		fieldPrefix := "trigger[" + strconv.Itoa(index) + "]."

		// Type assertion to access concrete fields
		switch trigger.Type {
		case irminModels.TimeTriggerType:
			// Write time trigger fields
			fields[fieldPrefix+"type"] = "time"
			fields[fieldPrefix+"rrule"] = *trigger.RRule
			fields[fieldPrefix+"cron"] = *trigger.Cron
		case irminModels.RepositoryTriggerType:
			// Write repository trigger fields
			fields[fieldPrefix+"type"] = "repository-event"
			fields[fieldPrefix+"event"] = string(*trigger.RepositoryEvent)
			fields[fieldPrefix+"repository"] = *trigger.Repository
			fields[fieldPrefix+"branch"] = *trigger.RepositoryRef
		case irminModels.WorkflowRunTriggerType:
			// Write workflow run trigger fields
			fields[fieldPrefix+"type"] = "workflow-run-event"
			fields[fieldPrefix+"event"] = string(*trigger.WorkflowRunEvent)
			fields[fieldPrefix+"workflow"] = *trigger.WorkflowID
		default:
			return nil, fmt.Errorf("unknown trigger type at index %d", index)
		}
	}

	// Write optional schedule fields
	if schedule.MaxRetries > 0 {
		fields["max_retries"] = strconv.Itoa(schedule.MaxRetries)
	}
	if schedule.MaxRuntime > 0 {
		fields["max_runtime"] = strconv.Itoa(schedule.MaxRuntime)
	}
	if schedule.MinInterval > 0 {
		fields["min_interval"] = strconv.Itoa(schedule.MinInterval)
	}

	return fields, nil
}
