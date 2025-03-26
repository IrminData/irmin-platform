package irminModels

import "time"

type WorkflowRun struct {
	ID              string           `json:"id"`
	CreatedAt       time.Time        `json:"created_at"`
	Status          WorkflowStatus   `json:"status"`
	TriggeredBy     *ScheduleTrigger `json:"triggered_by,omitempty"`
	TriggeredByUser *User            `json:"triggered_by_user,omitempty"`
	WorkflowID      string           `json:"workflow_id"`
	Logs            []string         `json:"logs,omitempty"`
}
