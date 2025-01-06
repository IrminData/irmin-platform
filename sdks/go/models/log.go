package models

// LogEventType represents the types of log events.
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

// LogEvent represents the details of a log event.
type LogEvent struct {
	// Unique identifier of the event
	ID string `json:"id"`
	// Type of the activity (e.g., CREATE, UPDATE, DELETE, etc.)
	Type LogEventType `json:"type"`
	// Timestamp of the event
	Timestamp string `json:"timestamp"`
	// Description of the event
	Description string `json:"description"`
	// Optional: ID of the subject object of the event
	SubjectID *string `json:"subject_id,omitempty"`
	// Optional: Type of the subject object of the event (e.g., repository, workflow, connection)
	SubjectType *string `json:"subject_type,omitempty"`
	// Optional: User who is responsible for the event. Leave empty if system.
	User *User `json:"user,omitempty"`
}

// WorkflowRunLogs represents logs associated with a workflow run.
type WorkflowRunLogs struct {
	// WorkflowRun represents the associated workflow run
	WorkflowRun WorkflowRun `json:"workflowRun"`
	// Workflow represents the associated workflow
	Workflow Workflow `json:"workflow"`
	// Logs is the log feed as text to be rendered in the UI
	Logs []string `json:"logs"`
}
