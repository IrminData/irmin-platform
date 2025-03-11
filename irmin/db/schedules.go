package db

import "gorm.io/gorm"

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

type WorkflowTriggerType string

const (
	TimeTriggerType        WorkflowTriggerType = "time"
	RepositoryTriggerType  WorkflowTriggerType = "repository-event"
	WorkflowRunTriggerType WorkflowTriggerType = "workflow-run-event"
)

type WorkflowTrigger struct {
	gorm.Model

	Type       WorkflowTriggerType `json:"type"`
	ScheduleID uint                `json:"schedule_id,omitempty"`

	// Time trigger
	RRule *string `json:"rrule,omitempty"`
	Cron  *string `json:"cron,omitempty"`

	// Repository event trigger
	RepositoryEvent *RepositoryEvent `json:"repository_event,omitempty"`
	Repository      *Repository      `json:"repository,omitempty" gorm:"foreignKey:RepositoryID"`
	RepositoryID    *uint            `json:"repository_id,omitempty"`
	RepositoryRef   *string          `json:"repository_ref,omitempty"`

	// Workflow run event trigger
	WorkflowRunEvent *WorkflowRunEvent `json:"workflow_run_event,omitempty"`
	Workflow         *Workflow         `json:"workflow,omitempty" gorm:"foreignKey:WorkflowID"`
	WorkflowID       *uint             `json:"workflow_id,omitempty"`
}

type Schedule struct {
	gorm.Model

	Triggers    []WorkflowTrigger `json:"triggers"`
	MaxRetries  int               `json:"max_retries,omitempty"`
	MaxRuntime  int               `json:"max_runtime,omitempty"`
	MinInterval int               `json:"min_interval,omitempty"`
}
