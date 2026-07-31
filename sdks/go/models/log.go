package irminmodels

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
	ID          string       `json:"id"                     validate:"required,validsqid=logs"                                             example:"log_1a2b3c4d"`
	Type        LogEventType `json:"type"                   validate:"required,oneof=CREATE UPDATE DELETE LOGIN LOGOUT ERROR INFO WARNING" example:"CREATE"`
	Description string       `json:"description"            validate:"required,max=500"                                                    example:"User created a new object"`
	CreatedAt   time.Time    `json:"created_at"             validate:"required"                                                            example:"2025-01-15T10:30:00Z"`
	Workspace   *Workspace   `json:"workspace,omitempty"`
	User        *User        `json:"user,omitempty"`
	WorkflowRun *WorkflowRun `json:"workflow_run,omitempty"`
	Workflow    *Workflow    `json:"workflow,omitempty"`
	Repository  *Repository  `json:"repository,omitempty"`
	Connection  *Connection  `json:"connection,omitempty"`
	StoredQuery *StoredQuery `json:"stored_query,omitempty"`
	Policy      *Policy      `json:"policy,omitempty"`
	Object      *Object      `json:"object,omitempty"`
}
