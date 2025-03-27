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
	Schedule   *Schedule           `json:"schedule,omitempty" gorm:"foreignKey:ScheduleID"`
	ScheduleID *uint               `json:"schedule_id,omitempty"`

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

// GetScheduleByID retrieves a schedule record from the database by its ID.
func GetScheduleByID(id uint) (*Schedule, error) {
	var schedule Schedule
	if err := DB.Preload("Triggers").Preload("Triggers.Repository").Preload("Triggers.Workflow").First(&schedule, id).Error; err != nil {
		return nil, err
	}
	return &schedule, nil
}

// CreateSchedule creates a new schedule record in the database.
func CreateSchedule(schedule *Schedule) (*Schedule, error) {
	if err := DB.Create(schedule).Error; err != nil {
		return nil, err
	}
	return schedule, nil
}

// DeleteSchedule deletes a schedule record and associated triggers from the database by its ID.
func DeleteSchedule(id uint) error {
	if err := DB.Select("Triggers").Where("id = ?", id).Delete(&Schedule{}).Error; err != nil {
		return err
	}
	return nil
}

// UpdateSchedule updates a schedule record in the database.
func UpdateSchedule(schedule *Schedule) (*Schedule, error) {
	if err := DB.Save(schedule).Error; err != nil {
		return nil, err
	}
	return schedule, nil
}
