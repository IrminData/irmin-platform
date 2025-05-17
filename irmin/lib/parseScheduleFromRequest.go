package lib

import (
	"irmin-api/db"
	"irmin-api/lakefs"
	"irmin-api/utils"
	"log"
	"strconv"

	"github.com/gofiber/fiber/v3"
)

// ParseScheduleFromRequest creates a schedule object from the request body.
func ParseScheduleFromRequest(c fiber.Ctx, d *db.Database, workspace db.Workspace) (*db.Schedule, error) {
	// Parse the request body
	fields, err := utils.ParseFormFields(c, nil, []string{"max_retries", "max_runtime", "min_interval"})
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return nil, err
	}

	// Parse schedule triggers form the request body.
	triggers, err := utils.ParseArrayFormFields(c, "trigger")
	if err != nil {
		log.Printf("Error parsing trigger form fields: %v", err)
		return nil, err
	}

	// Create the schedule object.
	schedule := db.Schedule{}

	// Parse optional fields if they exist
	if maxRetriesStr, ok := fields["max_retries"]; ok && maxRetriesStr != "" {
		maxRetries, err := strconv.Atoi(maxRetriesStr)
		if err != nil {
			log.Printf("Error parsing max_retries: %v", err)
			return nil, err
		}
		schedule.MaxRetries = maxRetries
	} else {
		schedule.MaxRetries = 3
	}

	if maxRuntimeStr, ok := fields["max_runtime"]; ok && maxRuntimeStr != "" {
		maxRuntime, err := strconv.Atoi(maxRuntimeStr)
		if err != nil {
			log.Printf("Error parsing max_runtime: %v", err)
			return nil, err
		}
		schedule.MaxRuntime = maxRuntime
	} else {
		schedule.MaxRuntime = 120
	}

	if minIntervalStr, ok := fields["min_interval"]; ok && minIntervalStr != "" {
		minInterval, err := strconv.Atoi(minIntervalStr)
		if err != nil {
			log.Printf("Error parsing min_interval: %v", err)
			return nil, err
		}
		schedule.MinInterval = minInterval
	} else {
		schedule.MinInterval = 120
	}

	// Parse triggers
	for _, trigger := range triggers {
		switch trigger["type"] {
		case "time":
			rrule := trigger["rrule"]
			cron := trigger["cron"]
			schedule.Triggers = append(schedule.Triggers, db.WorkflowTrigger{
				Type:  db.TimeTriggerType,
				RRule: &rrule,
				Cron:  &cron,
			})
		case "repository-event":
			repositorySlug := trigger["repository"]
			repository, err := d.GetRepositoryBySlugAndWorkspaceID(repositorySlug, workspace.ID)
			if err != nil {
				log.Printf("Error retrieving repository: %v", err)
				continue
			}
			event := lakefs.WebhookEventType(trigger["event"])
			ref := trigger["ref"]
			schedule.Triggers = append(schedule.Triggers, db.WorkflowTrigger{
				Type:            db.RepositoryTriggerType,
				RepositoryEvent: &event,
				RepositoryID:    &repository.ID,
				RepositoryRef:   &ref,
			})
		case "workflow-run-event":
			workflowSqid := trigger["workflow"]
			workflowID, err := utils.DecodeSqids("workflows", workflowSqid)
			if err != nil {
				log.Printf("Error decoding workflow sqid: %v", err)
				continue
			}
			workflow, err := d.GetWorkflowByID(uint(workflowID))
			if err != nil {
				log.Printf("Error retrieving workflow: %v", err)
				continue
			}
			event := db.WorkflowRunEventType(trigger["event"])
			schedule.Triggers = append(schedule.Triggers, db.WorkflowTrigger{
				Type:             db.WorkflowRunTriggerType,
				WorkflowRunEvent: &event,
				WorkflowID:       &workflow.ID,
			})
		default:
			log.Printf("Invalid trigger type: %s", trigger["type"])
		}
	}

	// Return the schedule object.
	return &schedule, nil
}
