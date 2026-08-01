package formatter

import (
	"errors"
	"fmt"
	"irmin-api/db"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	irminsqids "github.com/IrminData/irmin-platform/sdks/go/sqids"
)

// FormatScheduleTriggerResponse formats a schedule trigger for the response.
//
//nolint:gocognit // Multiple trigger types require comprehensive handling
func FormatScheduleTriggerResponse(
	trigger *db.WorkflowTrigger,
	sqidManager *irminsqids.SQIDManager,
) (*irminmodels.ScheduleTrigger, error) {
	if trigger == nil {
		return nil, errors.New("trigger is nil")
	}

	var repositorySlug *string
	if trigger.Repository != nil {
		repositorySlug = &trigger.Repository.Slug
	}

	var workflowSqid *string
	if trigger.Workflow != nil {
		sqid, err := sqidManager.Encode("workflows", uint64(*trigger.WorkflowID))
		if err != nil {
			return nil, fmt.Errorf("error encoding workflow sqid: %w", err)
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

	// Format the schedule trigger based on type
	switch trigger.Type {
	case db.WorkflowRunTriggerType:
		return &irminmodels.ScheduleTrigger{
			Type:             irminmodels.WorkflowRunTriggerType,
			WorkflowID:       workflowSqid,
			WorkflowRunEvent: &workflowRunEvent,
		}, nil
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
		return &newTrigger, nil
	case db.RepositoryTriggerType:
		includeDiffAsPatch := trigger.IncludeDiffAsPatch
		return &irminmodels.ScheduleTrigger{
			Type:               irminmodels.RepositoryTriggerType,
			RepositoryEvent:    &repositoryEvent,
			Repository:         repositorySlug,
			RepositoryRef:      trigger.RepositoryRef,
			IncludeDiffAsPatch: &includeDiffAsPatch,
		}, nil
	case db.ConnectionEventTriggerType:
		var connectionEventType *irminmodels.ConnectionEventType
		if trigger.ConnectionEventType != nil {
			cet := irminmodels.ConnectionEventType(*trigger.ConnectionEventType)
			connectionEventType = &cet
		}
		var connectionSqid *string
		if trigger.ConnectionID != nil {
			encoded, sqidErr := sqidManager.Encode("connections", uint64(*trigger.ConnectionID))
			if sqidErr == nil {
				connectionSqid = &encoded
			}
		}
		return &irminmodels.ScheduleTrigger{
			Type:                 irminmodels.ConnectionEventTriggerType,
			ConnectionEventType:  connectionEventType,
			ConnectionID:         connectionSqid,
			ConnectionEventPaths: trigger.ConnectionEventPaths,
		}, nil
	default:
		return nil, fmt.Errorf("unknown trigger type: %s", trigger.Type)
	}
}
