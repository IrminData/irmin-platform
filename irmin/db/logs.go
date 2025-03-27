package db

import "gorm.io/gorm"

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
	gorm.Model

	Type        LogEventType `json:"type"`
	Description string       `json:"description"`

	User          *User        `json:"user" gorm:"foreignKey:UserID"`
	UserID        *uint        `json:"user_id"`
	Workspace     *Workspace   `json:"workspace" gorm:"foreignKey:WorkspaceID"`
	WorkspaceID   *uint        `json:"workspace_id"`
	Repository    *Repository  `json:"repository" gorm:"foreignKey:RepositoryID"`
	RepositoryID  *uint        `json:"repository_id"`
	Workflow      *Workflow    `json:"workflow" gorm:"foreignKey:WorkflowID"`
	WorkflowID    *uint        `json:"workflow_id"`
	WorkflowRun   *WorkflowRun `json:"workflow_run" gorm:"foreignKey:WorkflowRunID"`
	WorkflowRunID *uint        `json:"workflow_run_id"`
}

func GetLogEventsForWorkspace(workspaceID uint) ([]LogEvent, error) {
	var events []LogEvent
	if err := DB.Preload("User").Preload("Workspace").Preload("Repository").Preload("Workflow").Preload("WorkflowRun").Where("workspace_id = ?", workspaceID).Find(&events).Error; err != nil {
		return nil, err
	}
	return events, nil
}

func CreateLogEvent(event *LogEvent) (*LogEvent, error) {
	if err := DB.Create(event).Error; err != nil {
		return nil, err
	}
	return event, nil
}
