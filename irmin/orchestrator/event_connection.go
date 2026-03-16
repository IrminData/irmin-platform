package orchestrator

import (
	"context"
	"encoding/json"
	"irmin-api/db"
	"irmin-api/lib"
	"strings"
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// ConnectionEvent represents an event received from a connector webhook.
// It contains information about data changes in the external system.
type ConnectionEvent struct {
	// EventType is the type of change (insert, update, delete, batch)
	EventType db.ConnectionEventType `json:"event_type"`
	// EventTime is when the event occurred in the external system
	EventTime time.Time `json:"event_time"`
	// ConnectionID identifies which Irmin connection this event is for
	ConnectionID uint `json:"connection_id"`
	// ConnectorID identifies which connector type generated this event
	ConnectorID uint `json:"connector_id"`
	// Path is the logical path of the affected data (e.g., "users", "orders/2024")
	Path string `json:"path"`
	// AffectedRows is the number of rows affected by this event
	AffectedRows int `json:"affected_rows,omitempty"`
	// Payload contains the raw event data from the connector
	Payload json.RawMessage `json:"payload,omitempty"`
	// Patches contains pre-computed patch operations from the connector
	Patches []irminmodels.PatchOperation `json:"patches,omitempty"`
}

// processConnectionEvent handles a connection event from a connector webhook.
// It finds matching connection event triggers and creates workflow runs for them.
func (o *Orchestrator) processConnectionEvent(ctx context.Context, event *ConnectionEvent) error {
	o.logger.InfoContext(ctx, "processing connection event",
		"event_type", event.EventType,
		"connection_id", event.ConnectionID,
		"connector_id", event.ConnectorID,
		"path", event.Path,
		"affected_rows", event.AffectedRows,
	)

	return o.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Verify the connection exists
		var connection db.Connection
		if err := tx.Preload("Connector").First(&connection, event.ConnectionID).Error; err != nil {
			o.logger.ErrorContext(ctx, "failed to get connection for event",
				"error", err,
				"connection_id", event.ConnectionID,
			)
			return err
		}

		o.logger.InfoContext(ctx, "found connection for event",
			"connection_id", connection.ID,
			"connection_name", connection.Name,
			"workspace_id", connection.WorkspaceID,
		)

		// Find all connection event triggers for this connection
		var triggers []db.WorkflowTrigger
		if findErr := tx.Clauses(clause.Locking{Strength: "UPDATE", Options: "SKIP LOCKED"}).
			Where("type = ? AND connection_id = ? AND deleted_at IS NULL",
				db.ConnectionEventTriggerType, event.ConnectionID).
			Find(&triggers).Error; findErr != nil {
			o.logger.ErrorContext(ctx, "failed to find triggers for connection",
				"error", findErr,
				"connection_id", event.ConnectionID,
			)
			return findErr
		}

		if len(triggers) == 0 {
			o.logger.InfoContext(ctx, "no connection triggers found for this connection",
				"connection_id", event.ConnectionID,
				"connection_name", connection.Name,
				"event_type", event.EventType,
			)
			return nil
		}

		o.logger.InfoContext(ctx, "found connection triggers to evaluate",
			"trigger_count", len(triggers),
			"connection_id", event.ConnectionID,
			"event_type", event.EventType,
		)

		// Process each trigger
		runsCreated := 0
		for _, t := range triggers {
			created, triggerErr := o.processConnectionTrigger(ctx, tx, &t, event)
			if triggerErr != nil {
				// Log error but continue processing other triggers
				o.logger.ErrorContext(ctx, "error processing connection trigger",
					"error", triggerErr,
					"trigger_id", t.ID,
					"connection_id", event.ConnectionID,
				)
				continue
			}
			if created {
				runsCreated++
			}
		}

		o.logger.InfoContext(ctx, "finished processing connection event",
			"triggers_evaluated", len(triggers),
			"runs_created", runsCreated,
			"connection_id", event.ConnectionID,
			"event_type", event.EventType,
		)

		return nil
	})
}

// processConnectionTrigger handles a single connection event trigger.
// Returns true if a workflow run was created, false otherwise.
func (o *Orchestrator) processConnectionTrigger(
	ctx context.Context,
	tx *gorm.DB,
	t *db.WorkflowTrigger,
	event *ConnectionEvent,
) (bool, error) {
	o.logger.InfoContext(ctx, "processing connection trigger",
		"trigger_id", t.ID,
		"trigger_event_type", t.ConnectionEventType,
		"trigger_connection_id", t.ConnectionID,
		"event_type", event.EventType,
		"event_path", event.Path,
	)

	// If the trigger specifies an event type, check if it matches
	if t.ConnectionEventType != nil && *t.ConnectionEventType != event.EventType {
		o.logger.InfoContext(ctx, "event type does not match trigger - skipping",
			"trigger_id", t.ID,
			"trigger_event_type", *t.ConnectionEventType,
			"actual_event_type", event.EventType,
		)
		return false, nil
	}

	// If the trigger specifies path filters, check if the event path matches
	if len(t.ConnectionEventPaths) > 0 && !pathMatchesFilter(event.Path, t.ConnectionEventPaths) {
		o.logger.InfoContext(ctx, "path does not match trigger filters - skipping",
			"trigger_id", t.ID,
			"trigger_paths", t.ConnectionEventPaths,
			"event_path", event.Path,
		)
		return false, nil
	}

	// Get the workflow associated with this trigger
	var workflow db.Workflow
	if err := tx.Where("schedule_id = ?", t.ScheduleID).First(&workflow).Error; err != nil {
		o.logger.ErrorContext(ctx, "failed to get workflow for connection trigger",
			"error", err,
			"trigger_id", t.ID,
			"schedule_id", t.ScheduleID,
		)
		// Delete the trigger if we can't find the workflow
		if deleteErr := tx.Delete(t).Error; deleteErr != nil {
			o.logger.ErrorContext(ctx, "failed to delete orphaned trigger",
				"error", deleteErr,
				"trigger_id", t.ID,
			)
		}
		return false, err
	}

	o.logger.InfoContext(ctx, "connection event matched trigger - creating workflow run",
		"trigger_id", t.ID,
		"workflow_id", workflow.ID,
		"workflow_name", workflow.Name,
		"event_type", event.EventType,
		"connection_id", event.ConnectionID,
	)

	// Create workflow run with the connection event as payload
	run, err := lib.CreateWorkflowRunWithPayload(tx, &workflow, nil, t, event, o.usageCheckFunc(), false)
	if err != nil {
		o.logger.ErrorContext(ctx, "failed to create workflow run from connection event",
			"error", err,
			"trigger_id", t.ID,
			"workflow_id", workflow.ID,
			"event_type", event.EventType,
		)
		return false, err
	}

	o.logger.InfoContext(ctx, "successfully created workflow run from connection event",
		"run_id", run.ID,
		"workflow_id", workflow.ID,
		"workflow_name", workflow.Name,
		"trigger_id", t.ID,
		"event_type", event.EventType,
		"connection_id", event.ConnectionID,
	)
	return true, nil
}

// pathMatchesFilter checks if an event path matches any of the filter patterns.
// It supports simple prefix matching - if the event path starts with or equals
// any of the filter paths, it's considered a match.
func pathMatchesFilter(eventPath string, filters []string) bool {
	for _, filter := range filters {
		// Normalize paths by removing leading/trailing slashes
		normalizedEvent := strings.Trim(eventPath, "/")
		normalizedFilter := strings.Trim(filter, "/")

		// Check for exact match or prefix match
		if normalizedEvent == normalizedFilter {
			return true
		}
		if strings.HasPrefix(normalizedEvent, normalizedFilter+"/") {
			return true
		}
	}
	return false
}
