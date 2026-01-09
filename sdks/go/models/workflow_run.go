package irminmodels

import "time"

type WorkflowRun struct {
	ID              string           `json:"id"                          validate:"required,validsqid=workflow-runs"                                          example:"wr_2k8n9q1m7p3x4z"`
	CreatedAt       time.Time        `json:"created_at"                  validate:"required"                                                                  example:"2025-01-15T10:30:00Z"`
	UpdatedAt       time.Time        `json:"updated_at"                  validate:"required"                                                                  example:"2025-01-15T10:35:00Z"`
	StartedAt       *time.Time       `json:"started_at,omitempty"                                                                                             example:"2025-01-15T10:30:30Z"`
	FinishedAt      *time.Time       `json:"finished_at,omitempty"                                                                                            example:"2025-01-15T10:35:00Z"`
	Status          WorkflowStatus   `json:"status"                      validate:"required,oneof=paused pending initiating running complete error cancelled" example:"complete"`
	Logs            []string         `json:"logs,omitempty"              validate:"dive"                                                                      example:"Starting workflow execution,Processing customer data,Workflow completed successfully"`
	TriggeredBy     *ScheduleTrigger `json:"triggered_by,omitempty"`
	TriggeredByUser *User            `json:"triggered_by_user,omitempty"`
	WorkflowID      string           `json:"workflow_id"                 validate:"required,validsqid=workflows"                                              example:"wf_8x2m9k4n7p5q"`
	WorkflowName    string           `json:"workflow_name"               validate:"required"                                                                  example:"Customer Data Import"`
	WorkflowType    WorkflowableType `json:"workflow_type"               validate:"required"                                                                  example:"import"`
}
