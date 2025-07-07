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
	ID          string       `json:"id"                     validate:"required,validsqid=logs"`
	Type        LogEventType `json:"type"                   validate:"required,oneof=CREATE UPDATE DELETE LOGIN LOGOUT ERROR INFO WARNING"`
	Description string       `json:"description"            validate:"required,min=1,max=500"`
	CreatedAt   time.Time    `json:"created_at"             validate:"required"`
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
