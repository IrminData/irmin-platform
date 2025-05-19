package db

import (
	"time"

	"gorm.io/gorm"
)

type WorkflowRun struct {
	gorm.Model

	StartedAt         *time.Time       `json:"started_at,omitempty"`
	FinishedAt        *time.Time       `json:"finished_at,omitempty"`
	Status            WorkflowStatus   `json:"status"                gorm:"index"`
	Retries           int              `json:"retries"               gorm:"default:0"`
	Logs              []string         `json:"logs,omitempty"        gorm:"type:jsonb;serializer:json"`
	TriggeredBy       *WorkflowTrigger `json:"triggered_by"          gorm:"foreignKey:TriggeredByID"`
	TriggeredByID     *uint            `json:"triggered_by_id"`
	TriggeredByUser   *User            `json:"triggered_by_user"     gorm:"foreignKey:TriggeredByUserID"`
	TriggeredByUserID *uint            `json:"triggered_by_user_id"`
	Workflow          Workflow         `json:"workflow"              gorm:"foreignKey:WorkflowID"`
	WorkflowID        uint             `json:"workflow_id"           gorm:"index"`
}

// GetWorkflowRunsByWorkflowID returns workflow runs for the given workflow ID,
// sorted by creation time, along with the total count of matching runs for pagination.
func (d *Database) GetWorkflowRunsByWorkflowID(workflowID uint, limit, offset int) ([]WorkflowRun, int64, error) {
	// Count total number of matching events
	var total int64
	if err := d.Model(&WorkflowRun{}).
		Where("workflow_id = ?", workflowID).
		Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Find log events based on the provided parameters
	var workflowRuns []WorkflowRun
	result := d.Preload("TriggeredBy").
		Preload("TriggeredByUser").
		Preload("Workflow").
		Where("workflow_id = ?", workflowID).
		Order("created_at desc").
		Limit(limit).
		Offset(offset).
		Find(&workflowRuns)
	return workflowRuns, total, result.Error
}

func (d *Database) GetLatestWorkflowRunByWorkflowID(workflowID uint) (*WorkflowRun, error) {
	var workflowRun WorkflowRun
	result := d.Preload("TriggeredBy").
		Preload("TriggeredByUser").
		Preload("Workflow").
		Where("workflow_id = ?", workflowID).
		Order("created_at desc").
		Limit(1).
		Find(&workflowRun)
	return &workflowRun, result.Error
}

func (d *Database) GetWorkflowRunByID(id uint) (*WorkflowRun, error) {
	var workflowRun WorkflowRun
	result := d.Preload("TriggeredBy").Preload("TriggeredByUser").Preload("Workflow").First(&workflowRun, id)
	return &workflowRun, result.Error
}
