package db

import (
	"irmin-api/lakefs"
	"time"

	"gorm.io/gorm"
)

type WorkflowRunEventType string

const (
	PreWorkflowRun  WorkflowRunEventType = "pre-workflow-run"
	PostWorkflowRun WorkflowRunEventType = "post-workflow-run"
)

// ConnectionEventType represents the type of change event from a connector
type ConnectionEventType string

const (
	ConnectionEventInsert ConnectionEventType = "insert"
	ConnectionEventUpdate ConnectionEventType = "update"
	ConnectionEventDelete ConnectionEventType = "delete"
	ConnectionEventUpsert ConnectionEventType = "upsert"
	ConnectionEventBatch  ConnectionEventType = "batch"
)

type WorkflowTriggerType string

const (
	TimeTriggerType            WorkflowTriggerType = "time"
	RepositoryTriggerType      WorkflowTriggerType = "repository-event"
	WorkflowRunTriggerType     WorkflowTriggerType = "workflow-run-event"
	ConnectionEventTriggerType WorkflowTriggerType = "connection-event"
)

type WorkflowTrigger struct {
	gorm.Model

	Type       WorkflowTriggerType `json:"type"                  gorm:"index"`
	Schedule   *Schedule           `json:"schedule,omitempty"    gorm:"foreignKey:ScheduleID"`
	ScheduleID *uint               `json:"schedule_id,omitempty" gorm:"index"`

	// Time trigger
	RRule   *string    `json:"rrule,omitempty"`
	Cron    *string    `json:"cron,omitempty"`
	LastRun *time.Time `json:"last_run,omitempty"`
	NextRun *time.Time `json:"next_run,omitempty"`

	// Repository event trigger
	RepositoryEvent    *lakefs.WebhookEventType `json:"repository_event,omitempty"`
	Repository         *Repository              `json:"repository,omitempty"            gorm:"foreignKey:RepositoryID"`
	RepositoryID       *uint                    `json:"repository_id,omitempty"`
	RepositoryRef      *string                  `json:"repository_ref,omitempty"`
	IncludeDiffAsPatch bool                     `json:"include_diff_as_patch,omitempty"` // Generate patches from commit diff

	// Workflow run event trigger
	WorkflowRunEvent *WorkflowRunEventType `json:"workflow_run_event,omitempty"`
	Workflow         *Workflow             `json:"workflow,omitempty"           gorm:"foreignKey:WorkflowID"`
	WorkflowID       *uint                 `json:"workflow_id,omitempty"`

	// Connection event trigger
	ConnectionEventType  *ConnectionEventType `json:"connection_event_type,omitempty"` // insert, update, delete, batch
	Connection           *Connection          `json:"connection,omitempty"             gorm:"foreignKey:ConnectionID"`
	ConnectionID         *uint                `json:"connection_id,omitempty"`
	ConnectionEventPaths []string             `json:"connection_event_paths,omitempty" gorm:"type:jsonb;serializer:json"` // Optional path filter
}

type Schedule struct {
	gorm.Model

	Triggers    []WorkflowTrigger `json:"triggers"`
	PreviousRun *time.Time        `json:"previous_run,omitempty"`
	// MaxRetries is the maximum number of retries for a single workflow run.
	MaxRetries int `json:"max_retries,omitempty"`
	// MaxRuntime is the maximum runtime in seconds for a single workflow run.
	MaxRuntime int `json:"max_runtime,omitempty"`
	// MinInterval is the minimum interval in seconds between workflow runs.
	MinInterval int `json:"min_interval,omitempty"`
}

// GetScheduleByID retrieves a schedule record from the database by its ID.
func (d *Database) GetScheduleByID(id uint) (*Schedule, error) {
	var schedule Schedule
	if err := d.Preload("Triggers").
		Preload("Triggers.Repository").
		Preload("Triggers.Workflow").
		Preload("Triggers.Connection").
		Preload("Triggers.Connection.Connector").
		First(&schedule, id).Error; err != nil {
		return nil, err
	}
	return &schedule, nil
}
