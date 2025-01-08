package utils

import (
	"fmt"
	"irmin-sdk/models"
	"strconv"
)

// PrepareWorkflowScheduleData prepares a map of fields for a workflow schedule.
// Returns an array of fields to be used in a form submission
func PrepareWorkflowScheduleData(schedule models.WorkflowSchedule) (map[string]string, error) {
	fields := make(map[string]string)

	for index, trigger := range schedule.Triggers {
		fieldPrefix := "trigger[" + strconv.Itoa(index) + "]."

		// Type assertion to access concrete fields
		switch t := trigger.(type) {
		case *models.TimeTrigger:
			// Write time trigger fields
			fields[fieldPrefix+"type"] = "time"
			fields[fieldPrefix+"rrule"] = t.RRule
		case *models.RepositoryTrigger:
			// Write repository trigger fields
			fields[fieldPrefix+"type"] = "repository-event"
			fields[fieldPrefix+"event"] = string(t.Event)
			if t.Repository != nil {
				fields[fieldPrefix+"repository"] = *t.Repository
			}
			if t.Ref != nil {
				fields[fieldPrefix+"ref"] = *t.Ref
			}
		case *models.WorkflowRunTrigger:
			// Write workflow run trigger fields
			fields[fieldPrefix+"type"] = "workflow-run-event"
			fields[fieldPrefix+"event"] = string(t.Event)
			if t.Workflow != nil {
				fields[fieldPrefix+"workflow"] = *t.Workflow
			}
		default:
			return nil, fmt.Errorf("unknown trigger type at index %d", index)
		}
	}

	// Write optional schedule fields
	if schedule.MaxRetries != nil {
		fields["max_retries"] = strconv.Itoa(*schedule.MaxRetries)
	}
	if schedule.MaxRuntime != nil {
		fields["max_runtime"] = strconv.Itoa(*schedule.MaxRuntime)
	}
	if schedule.MinInterval != nil {
		fields["min_interval"] = strconv.Itoa(*schedule.MinInterval)
	}

	return fields, nil
}
