package irminmodels

import "time"

type WorkflowRun struct {
	ID              string           `json:"id"                          validate:"required,validsqid=workflow-runs"`
	CreatedAt       time.Time        `json:"created_at"                  validate:"required"`
	UpdatedAt       time.Time        `json:"updated_at"                  validate:"required"`
	StartedAt       *time.Time       `json:"started_at,omitempty"`
	FinishedAt      *time.Time       `json:"finished_at,omitempty"`
	Status          WorkflowStatus   `json:"status"                      validate:"required,oneof=paused pending initiating running complete error cancelled"`
	TriggeredBy     *ScheduleTrigger `json:"triggered_by,omitempty"`
	TriggeredByUser *User            `json:"triggered_by_user,omitempty"`
	WorkflowID      string           `json:"workflow_id"                 validate:"required,validsqid=workflows"`
	Logs            []string         `json:"logs,omitempty"              validate:"dive"`
}
