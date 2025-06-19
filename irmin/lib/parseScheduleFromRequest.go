package lib

import (
	"errors"
	"fmt"
	"irmin-api/db"
	"irmin-api/lakefs"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

const (
	defaultMaxRetries  = 3
	defaultMaxRuntime  = 120
	defaultMinInterval = 120
)

// parseOptionalFields parses optional schedule fields from the structured data.
func parseOptionalFields(scheduleReq *irminmodels.Schedule) db.Schedule {
	schedule := db.Schedule{}

	// Set max retries with default
	if scheduleReq.MaxRetries > 0 {
		schedule.MaxRetries = scheduleReq.MaxRetries
	} else {
		schedule.MaxRetries = defaultMaxRetries
	}

	// Set max runtime with default
	if scheduleReq.MaxRuntime > 0 {
		schedule.MaxRuntime = scheduleReq.MaxRuntime
	} else {
		schedule.MaxRuntime = defaultMaxRuntime
	}

	// Set min interval with default
	if scheduleReq.MinInterval > 0 {
		schedule.MinInterval = scheduleReq.MinInterval
	} else {
		schedule.MinInterval = defaultMinInterval
	}

	return schedule
}

// parseTrigger parses a single trigger from the structured data.
func parseTrigger(
	trigger irminmodels.ScheduleTrigger,
	d *db.Database,
	workspace db.Workspace,
	sqidManager *utils.SQIDManager,
) (*db.WorkflowTrigger, error) {
	switch trigger.Type {
	case irminmodels.TimeTriggerType:
		return &db.WorkflowTrigger{
			Type:  db.TimeTriggerType,
			RRule: trigger.RRule,
			Cron:  trigger.Cron,
		}, nil

	case irminmodels.RepositoryTriggerType:
		if trigger.Repository == nil || trigger.RepositoryEvent == nil {
			return nil, errors.New("repository and event are required for repository-event trigger")
		}
		repository, err := d.GetRepositoryBySlugAndWorkspaceID(*trigger.Repository, workspace.ID)
		if err != nil {
			return nil, err
		}
		event := lakefs.WebhookEventType(*trigger.RepositoryEvent)
		return &db.WorkflowTrigger{
			Type:            db.RepositoryTriggerType,
			RepositoryEvent: &event,
			RepositoryID:    &repository.ID,
			RepositoryRef:   trigger.RepositoryRef,
		}, nil

	case irminmodels.WorkflowRunTriggerType:
		if trigger.WorkflowID == nil || trigger.WorkflowRunEvent == nil {
			return nil, errors.New("workflow and event are required for workflow-run-event trigger")
		}
		workflowID, err := sqidManager.Decode("workflows", *trigger.WorkflowID)
		if err != nil {
			return nil, err
		}
		workflow, err := d.GetWorkflowByID(uint(workflowID))
		if err != nil {
			return nil, err
		}
		event := db.WorkflowRunEventType(*trigger.WorkflowRunEvent)
		return &db.WorkflowTrigger{
			Type:             db.WorkflowRunTriggerType,
			WorkflowRunEvent: &event,
			WorkflowID:       &workflow.ID,
		}, nil

	default:
		return nil, fmt.Errorf("invalid trigger type: %s", trigger.Type)
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
	// Parse JSON request body
	var scheduleReq irminmodels.Schedule
	if err := c.Bind().JSON(&scheduleReq); err != nil {
		return nil, err
	}

	// Parse optional fields
	schedule := parseOptionalFields(&scheduleReq)

	// Parse triggers
	for _, trigger := range scheduleReq.Triggers {
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

// ParseScheduleFromData creates a schedule object from structured data instead of parsing from request context.
// This is used when schedule data is part of a larger JSON request structure.
func ParseScheduleFromData(
	scheduleReq *irminmodels.Schedule,
	d *db.Database,
	workspace db.Workspace,
	sqidManager *utils.SQIDManager,
) (*db.Schedule, error) {
	if scheduleReq == nil {
		// Return default schedule if no schedule data provided
		return &db.Schedule{
			MaxRetries:  defaultMaxRetries,
			MaxRuntime:  defaultMaxRuntime,
			MinInterval: defaultMinInterval,
		}, nil
	}

	// Parse optional fields
	schedule := parseOptionalFields(scheduleReq)

	// Parse triggers
	for _, trigger := range scheduleReq.Triggers {
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
