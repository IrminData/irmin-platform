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
	Logs              []string         `json:"logs,omitempty" gorm:"type:jsonb;serializer:json"`
	TriggeredBy       *WorkflowTrigger `json:"triggered_by" gorm:"foreignKey:TriggeredByID"`
	TriggeredByID     *uint            `json:"triggered_by_id"`
	TriggeredByUser   *User            `json:"triggered_by_user" gorm:"foreignKey:TriggeredByUserID"`
	TriggeredByUserID *uint            `json:"triggered_by_user_id"`
	Workflow          Workflow         `json:"workflow" gorm:"foreignKey:WorkflowID"`
	WorkflowID        uint             `json:"workflow_id"`
}

func GetWorkflowRunsByWorkflowID(workflowID uint) ([]WorkflowRun, error) {
	var workflowRuns []WorkflowRun
	result := DB.Preload("TriggeredBy").Preload("TriggeredByUser").Preload("Workflow").Where("workflow_id = ?", workflowID).Find(&workflowRuns)
	return workflowRuns, result.Error
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
	if err := DB.Preload("TriggeredBy").Preload("TriggeredByUser").Preload("Workflow").Create(&run).Error; err != nil {
		return nil, err
	}
	return run, nil
}

func UpdateWorkflowRun(id uint, updates map[string]any) (*WorkflowRun, error) {
	var run WorkflowRun
	if err := DB.Model(&WorkflowRun{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return nil, err
	}
	if err := DB.Preload("TriggeredBy").Preload("TriggeredByUser").Preload("Workflow").First(&run, id).Error; err != nil {
		return nil, err
	}
	return &run, nil
}
