package irminModels

import "time"

type LogEventType string

const (
	LogEventTypeCreate  LogEventType = "CREATE"
	LogEventTypeUpdate  LogEventType = "UPDATE"
	LogEventTypeDelete  LogEventType = "DELETE"
	LogEventTypeLogin   LogEventType = "LOGIN"
	LogEventTypeLogout  LogEventType = "LOGOUT"
	LogEventTypeError   LogEventType = "ERROR"
	LogEventTypeInfo    LogEventType = "INFO"
	LogEventTypeWarning LogEventType = "WARNING"
)

type LogEvent struct {
	ID          string       `json:"id"`
	Type        LogEventType `json:"type"`
	Description string       `json:"description"`
	CreatedAt   time.Time    `json:"created_at"`
	User        *User        `json:"user,omitempty"`
	WorkflowRun *WorkflowRun `json:"workflow_run,omitempty"`
	Workflow    *Workflow    `json:"workflow,omitempty"`
	Repository  *Repository  `json:"repository,omitempty"`
}
