package irminmodels

type RepositoryEvent string

const (
	PreCommit        RepositoryEvent = "pre-commit"
	PostCommit       RepositoryEvent = "post-commit"
	PreMerge         RepositoryEvent = "pre-merge"
	PostMerge        RepositoryEvent = "post-merge"
	PreCreateBranch  RepositoryEvent = "pre-create-branch"
	PostCreateBranch RepositoryEvent = "post-create-branch"
	PreDeleteBranch  RepositoryEvent = "pre-delete-branch"
	PostDeleteBranch RepositoryEvent = "post-delete-branch"
	PreCreateTag     RepositoryEvent = "pre-create-tag"
	PostCreateTag    RepositoryEvent = "post-create-tag"
	PreDeleteTag     RepositoryEvent = "pre-delete-tag"
	PostDeleteTag    RepositoryEvent = "post-delete-tag"
)

type WorkflowRunEvent string

const (
	PreWorkflowRun  WorkflowRunEvent = "pre-workflow-run"
	PostWorkflowRun WorkflowRunEvent = "post-workflow-run"
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

type ScheduleTrigger struct {
	Type WorkflowTriggerType `json:"type" validate:"required,oneof=time repository-event workflow-run-event connection-event,validschedule" example:"time"`

	// Time trigger - these should only be validated if they have values
	RRule *string `json:"rrule,omitempty" example:"FREQ=DAILY;INTERVAL=1;BYHOUR=9"`
	Cron  *string `json:"cron,omitempty"  example:"0 9 * * *"`

	// Repository event trigger
	RepositoryEvent    *RepositoryEvent `json:"repository_event,omitempty"      validate:"required_if=Type repository-event"       example:"post-commit"`
	Repository         *string          `json:"repository,omitempty"            validate:"required_with=RepositoryEvent,validslug" example:"customer-analytics"` // Slug of the repository
	RepositoryRef      *string          `json:"repository_ref,omitempty"        validate:"required_with=RepositoryEvent"           example:"main"`
	IncludeDiffAsPatch *bool            `json:"include_diff_as_patch,omitempty"` // Generate patches from commit diff for export flows

	// Workflow run event trigger
	WorkflowRunEvent *WorkflowRunEvent `json:"workflow_run_event,omitempty" validate:"required_if=Type workflow-run-event"                example:"post-workflow-run"`
	WorkflowID       *string           `json:"workflow_id,omitempty"        validate:"required_with=WorkflowRunEvent,validsqid=workflows" example:"wf_8x2m9k4n7p5q"` // Sqid of the workflow

	// Connection event trigger
	ConnectionEventType  *ConnectionEventType `json:"connection_event_type,omitempty"`                                             // insert, update, delete, batch
	ConnectionID         *string              `json:"connection_id,omitempty"          validate:"omitempty,validsqid=connections"` // Sqid of the connection
	ConnectionEventPaths []string             `json:"connection_event_paths,omitempty"`                                            // Optional path filter (e.g., ["users", "orders"])
}

type Schedule struct {
	Triggers    []ScheduleTrigger `json:"triggers"               validate:"dive"`
	MaxRetries  int               `json:"max_retries,omitempty"  validate:"min=0,max=10" example:"3"`
	MaxRuntime  int               `json:"max_runtime,omitempty"  validate:"min=0"        example:"3600"`
	MinInterval int               `json:"min_interval,omitempty" validate:"min=0"        example:"300"`
}
