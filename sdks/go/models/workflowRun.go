package irminmodels

import "time"

type WorkflowRun struct {
	ID              string           `json:"id"`
	CreatedAt       time.Time        `json:"created_at"`
	UpdatedAt       time.Time        `json:"updated_at"`
	StartedAt       *time.Time       `json:"started_at,omitempty"`
	FinishedAt      *time.Time       `json:"finished_at,omitempty"`
	Status          WorkflowStatus   `json:"status"`
	TriggeredBy     *ScheduleTrigger `json:"triggered_by,omitempty"`
	TriggeredByUser *User            `json:"triggered_by_user,omitempty"`
	WorkflowID      string           `json:"workflow_id"`
	Logs            []string         `json:"logs,omitempty"`
}
