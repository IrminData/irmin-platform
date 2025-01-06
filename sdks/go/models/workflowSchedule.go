package models

type WorkflowSchedule struct {
	Triggers    []WorkflowTrigger `json:"triggers"`
	MaxRetries  *int              `json:"max_retries,omitempty"`
	MaxRuntime  *int              `json:"max_runtime,omitempty"`
	MinInterval *int              `json:"min_interval,omitempty"`
}

// WorkflowTrigger represents the different trigger configurations that can activate a workflow to run.
type WorkflowTrigger struct {
	Type               string              `json:"type"`
	TimeTrigger        *TimeTrigger        `json:"time_trigger,omitempty"`
	RepositoryTrigger  *RepositoryTrigger  `json:"repository_trigger,omitempty"`
	WorkflowRunTrigger *WorkflowRunTrigger `json:"workflow_run_trigger,omitempty"`
}

// TimeTrigger represents a time-based trigger using cron syntax.
type TimeTrigger struct {
	Type  string `json:"type"`
	RRule string `json:"rrule"`
}

// RepositoryEvent defines the events that can trigger a workflow in a repository.
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

// RepositoryTrigger defines trigger configuration for repository events.
type RepositoryTrigger struct {
	Type       string          `json:"type"`
	Event      RepositoryEvent `json:"event"`
	Repository *string         `json:"repository,omitempty"`
	Ref        *string         `json:"ref,omitempty"`
}

// WorkflowRunEvent defines the events that can trigger a workflow run.
type WorkflowRunEvent string

const (
	PreWorkflowRun  WorkflowRunEvent = "pre-workflow-run"
	PostWorkflowRun WorkflowRunEvent = "post-workflow-run"
)

// WorkflowRunTrigger defines trigger configuration for workflow run events.
type WorkflowRunTrigger struct {
	Type     string           `json:"type"`
	Event    WorkflowRunEvent `json:"event"`
	Workflow *string          `json:"workflow,omitempty"`
}
