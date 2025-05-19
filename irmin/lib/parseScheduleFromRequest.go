package lib

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/lakefs"
	"irmin-api/utils"
	"strconv"

	"github.com/gofiber/fiber/v3"
)

// parseOptionalFields parses optional schedule fields from the form data.
func parseOptionalFields(fields map[string]string) (db.Schedule, error) {
	schedule := db.Schedule{}

	// Parse max retries
	if maxRetriesStr, ok := fields["max_retries"]; ok && maxRetriesStr != "" {
		maxRetries, err := strconv.Atoi(maxRetriesStr)
		if err != nil {
			return schedule, err
		}
		schedule.MaxRetries = maxRetries
	} else {
		schedule.MaxRetries = 3
	}

	// Parse max runtime
	if maxRuntimeStr, ok := fields["max_runtime"]; ok && maxRuntimeStr != "" {
		maxRuntime, err := strconv.Atoi(maxRuntimeStr)
		if err != nil {
			return schedule, err
		}
		schedule.MaxRuntime = maxRuntime
	} else {
		schedule.MaxRuntime = 120
	}

	// Parse min interval
	if minIntervalStr, ok := fields["min_interval"]; ok && minIntervalStr != "" {
		minInterval, err := strconv.Atoi(minIntervalStr)
		if err != nil {
			return schedule, err
		}
		schedule.MinInterval = minInterval
	} else {
		schedule.MinInterval = 120
	}

	return schedule, nil
}

// parseTrigger parses a single trigger from the form data.
func parseTrigger(
	trigger map[string]string,
	d *db.Database,
	workspace db.Workspace,
	sqidManager *utils.SQIDManager,
) (*db.WorkflowTrigger, error) {
	switch trigger["type"] {
	case "time":
		rrule := trigger["rrule"]
		cron := trigger["cron"]
		return &db.WorkflowTrigger{
			Type:  db.TimeTriggerType,
			RRule: &rrule,
			Cron:  &cron,
		}, nil

	case "repository-event":
		repositorySlug := trigger["repository"]
		repository, err := d.GetRepositoryBySlugAndWorkspaceID(repositorySlug, workspace.ID)
		if err != nil {
			return nil, err
		}
		event := lakefs.WebhookEventType(trigger["event"])
		ref := trigger["ref"]
		return &db.WorkflowTrigger{
			Type:            db.RepositoryTriggerType,
			RepositoryEvent: &event,
			RepositoryID:    &repository.ID,
			RepositoryRef:   &ref,
		}, nil

	case "workflow-run-event":
		workflowSqid := trigger["workflow"]
		workflowID, err := sqidManager.Decode("workflows", workflowSqid)
		if err != nil {
			return nil, err
		}
		workflow, err := d.GetWorkflowByID(uint(workflowID))
		if err != nil {
			return nil, err
		}
		event := db.WorkflowRunEventType(trigger["event"])
		return &db.WorkflowTrigger{
			Type:             db.WorkflowRunTriggerType,
			WorkflowRunEvent: &event,
			WorkflowID:       &workflow.ID,
		}, nil

	default:
		return nil, fmt.Errorf("invalid trigger type: %s", trigger["type"])
	}
}

// ParseScheduleFromRequest creates a schedule object from the request body, while validating the requested
// schedule is valid and setting default values for optional fields that are not provided.
func ParseScheduleFromRequest(
	c fiber.Ctx,
	d *db.Database,
	workspace db.Workspace,
	sqidManager *utils.SQIDManager,
) (*db.Schedule, error) {
	// Parse the request body
	fields, err := utils.ParseFormFields(c, nil, []string{"max_retries", "max_runtime", "min_interval"})
	if err != nil {
		return nil, err
	}

	// Parse schedule triggers from the request body
	triggers, err := utils.ParseArrayFormFields(c, "trigger")
	if err != nil {
		return nil, err
	}

	// Parse optional fields
	schedule, err := parseOptionalFields(fields)
	if err != nil {
		return nil, err
	}

	// Parse triggers
	for _, trigger := range triggers {
		workflowTrigger, triggerParseErr := parseTrigger(trigger, d, workspace, sqidManager)
		if triggerParseErr != nil {
			return nil, triggerParseErr
		}
		if workflowTrigger != nil {
			schedule.Triggers = append(schedule.Triggers, *workflowTrigger)
		}
	}

	return &schedule, nil
}
