package lib

import (
	"irmin-api/db"
	"irmin-api/utils"
	"log"
	"strconv"

	"github.com/gofiber/fiber/v3"
)

// CreateScheduleObject creates a schedule object from the request body.
func CreateScheduleObject(c fiber.Ctx, workspace db.Workspace) (*db.Schedule, error) {
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
	maxRetries, err := strconv.Atoi(fields["max_retries"])
	if err != nil {
		log.Printf("Error parsing max_retries: %v", err)
		return nil, err
	}
	maxRuntime, err := strconv.Atoi(fields["max_runtime"])
	if err != nil {
		log.Printf("Error parsing max_runtime: %v", err)
		return nil, err
	}
	minInterval, err := strconv.Atoi(fields["min_interval"])
	if err != nil {
		log.Printf("Error parsing min_interval: %v", err)
		return nil, err
	}
	schedule := db.Schedule{
		MaxRetries:  maxRetries,
		MaxRuntime:  maxRuntime,
		MinInterval: minInterval,
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
			repository, err := db.GetRepositoryBySlugAndWorkspaceID(repositorySlug, workspace.ID)
			if err != nil {
				log.Printf("Error retrieving repository: %v", err)
				continue
			}
			event := db.RepositoryEvent(trigger["event"])
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
			workflow, err := db.GetWorkflowByID(uint(workflowID))
			if err != nil {
				log.Printf("Error retrieving workflow: %v", err)
				continue
			}
			event := db.WorkflowRunEvent(trigger["event"])
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
