package db

import (
	"time"

	"gorm.io/gorm"
)

type WorkflowRun struct {
	gorm.Model

	StartedAt         *time.Time       `json:"started_at,omitempty"`
	FinishedAt        *time.Time       `json:"finished_at,omitempty"`
	Status            WorkflowStatus   `json:"status"`
	Logs              []string         `json:"logs,omitempty"        gorm:"type:jsonb;serializer:json"`
	TriggeredBy       *WorkflowTrigger `json:"triggered_by"          gorm:"foreignKey:TriggeredByID"`
	TriggeredByID     *uint            `json:"triggered_by_id"`
	TriggeredByUser   *User            `json:"triggered_by_user"     gorm:"foreignKey:TriggeredByUserID"`
	TriggeredByUserID *uint            `json:"triggered_by_user_id"`
	Workflow          Workflow         `json:"workflow"              gorm:"foreignKey:WorkflowID"`
	WorkflowID        uint             `json:"workflow_id"`
}

// GetWorkflowRunsByWorkspaceID returns workflow runs for the given workspace ID,
// sorted by creation time, along with the total count of matching runs for pagination.
func GetWorkflowRunsByWorkflowID(workflowID uint, limit, offset int) ([]WorkflowRun, int64, error) {
	// Count total number of matching events
	var total int64
	if err := DB.Model(&LogEvent{}).
		Where("workflow_id = ?", workflowID).
		Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Find log events based on the provided parameters
	var workflowRuns []WorkflowRun
	result := DB.Preload("TriggeredBy").
		Preload("TriggeredByUser").
		Preload("Workflow").
		Where("workflow_id = ?", workflowID).
		Order("created_at desc").
		Limit(limit).
		Offset(offset).
		Find(&workflowRuns)
	return workflowRuns, total, result.Error
}

func GetLatestWorkflowRunByWorkflowID(workflowID uint) (*WorkflowRun, error) {
	var workflowRun WorkflowRun
	result := DB.Preload("TriggeredBy").
		Preload("TriggeredByUser").
		Preload("Workflow").
		Where("workflow_id = ?", workflowID).
		Order("created_at desc").
		Limit(1).
		Find(&workflowRun)
	return &workflowRun, result.Error
}

func GetWorkflowRunByID(id uint) (*WorkflowRun, error) {
	var workflowRun WorkflowRun
	result := DB.Preload("TriggeredBy").Preload("TriggeredByUser").Preload("Workflow").First(&workflowRun, id)
	return &workflowRun, result.Error
}

func CreateWorkflowRun(run *WorkflowRun) (*WorkflowRun, error) {
	if err := DB.Create(&run).Error; err != nil {
		return nil, err
	}
	if err := DB.Preload("TriggeredBy").Preload("TriggeredByUser").Preload("Workflow").First(&run, run.ID).Error; err != nil {
		return nil, err
	}
	return run, nil
}

func UpdateWorkflowRun(run *WorkflowRun) (*WorkflowRun, error) {
	if err := DB.Save(&run).Error; err != nil {
		return nil, err
	}
	if err := DB.Preload("TriggeredBy").Preload("TriggeredByUser").Preload("Workflow").First(&run, run.ID).Error; err != nil {
		return nil, err
	}
	return run, nil
}
