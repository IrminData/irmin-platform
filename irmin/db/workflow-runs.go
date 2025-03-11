package db

import "gorm.io/gorm"

type WorkflowRun struct {
	gorm.Model

	Workflow   Workflow `json:"workflow" gorm:"foreignKey:WorkflowID"`
	WorkflowID uint     `json:"workflow_id"`
}
