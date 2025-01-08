package models

// RepositoryEvent represents repository-related events that can trigger a workflow.
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

// WorkflowRunEvent represents workflow run-related events that can trigger a workflow.
type WorkflowRunEvent string

const (
	PreWorkflowRun  WorkflowRunEvent = "pre-workflow-run"
	PostWorkflowRun WorkflowRunEvent = "post-workflow-run"
)

// WorkflowTrigger is an interface for different trigger types.
type WorkflowTrigger interface {
	GetType() string
}

// TimeTrigger represents a time-based trigger using an RRULE.
type TimeTrigger struct {
	Type  string `json:"type"`  // Always "time"
	RRule string `json:"rrule"` // Recurrence rule
}

func (t TimeTrigger) GetType() string {
	return t.Type
}

// RepositoryTrigger represents a trigger for repository-related events.
type RepositoryTrigger struct {
	Type       string          `json:"type"`       // Always "repository-event"
	Event      RepositoryEvent `json:"event"`      // The repository event
	Repository *string         `json:"repository"` // Optional repository slug
	Ref        *string         `json:"ref"`        // Optional ref (branch, tag, etc.)
}

func (t RepositoryTrigger) GetType() string {
	return t.Type
}

// WorkflowRunTrigger represents a trigger for workflow run-related events.
type WorkflowRunTrigger struct {
	Type     string           `json:"type"`     // Always "workflow-run-event"
	Event    WorkflowRunEvent `json:"event"`    // The workflow run event
	Workflow *string          `json:"workflow"` // Optional workflow ID
}

func (t WorkflowRunTrigger) GetType() string {
	return t.Type
}

// WorkflowSchedule represents the schedule configuration for a workflow.
type WorkflowSchedule struct {
	Triggers    []WorkflowTrigger `json:"triggers"`
	MaxRetries  *int              `json:"max_retries,omitempty"`
	MaxRuntime  *int              `json:"max_runtime,omitempty"`
	MinInterval *int              `json:"min_interval,omitempty"`
}
