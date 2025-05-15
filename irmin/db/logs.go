package db

import (
	"fmt"
	"strings"

	"gorm.io/gorm"
)

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

	User          *User        `json:"user"            gorm:"foreignKey:UserID"`
	UserID        *uint        `json:"user_id"`
	Workspace     *Workspace   `json:"workspace"       gorm:"foreignKey:WorkspaceID"`
	WorkspaceID   *uint        `json:"workspace_id"`
	Repository    *Repository  `json:"repository"      gorm:"foreignKey:RepositoryID"`
	RepositoryID  *uint        `json:"repository_id"`
	Workflow      *Workflow    `json:"workflow"        gorm:"foreignKey:WorkflowID"`
	WorkflowID    *uint        `json:"workflow_id"`
	WorkflowRun   *WorkflowRun `json:"workflow_run"    gorm:"foreignKey:WorkflowRunID"`
	WorkflowRunID *uint        `json:"workflow_run_id"`
	ConnectionID  *uint        `json:"connection_id"`
	Connection    *Connection  `json:"connection"      gorm:"foreignKey:ConnectionID"`
}

// GetLogEventsForWorkspace returns log events for the given workspace, optionally
// filtering by description, sorted by creation time, along with the total count
// of matching events for pagination.
//
// workspaceID: identifier of the workspace to fetch events for
// searchTerm: substring to search for in the description; if empty, ignored
// limit: maximum number of events to return
// offset: number of events to skip
// returns: slice of LogEvent, total count of matching events, and error if any
func (d *Database) GetLogEventsForWorkspace(
	workspaceID uint,
	searchTerm string,
	limit, offset int,
) ([]LogEvent, int64, error) {
	var events []LogEvent
	var total int64

	// base model for counting
	countQuery := d.Model(&LogEvent{}).
		Where("workspace_id = ?", workspaceID)

	// apply description filter if present
	if searchTerm != "" {
		pattern := fmt.Sprintf("%%%s%%", strings.ToLower(searchTerm))
		countQuery = countQuery.Where("LOWER(description) LIKE ?", pattern)
	}

	// count total number of matching events
	if err := countQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// base fetch query with associations
	query := d.Preload("User").
		Preload("Workspace").
		Preload("Repository").
		Preload("Workflow").
		Preload("WorkflowRun").
		Preload("Connection").
		Where("workspace_id = ?", workspaceID)

	// apply description filter if present
	if searchTerm != "" {
		pattern := fmt.Sprintf("%%%s%%", strings.ToLower(searchTerm))
		query = query.Where("LOWER(description) LIKE ?", pattern)
	}

	// execute fetch with ordering and pagination
	if err := query.
		Order("created_at desc").
		Limit(limit).
		Offset(offset).
		Find(&events).Error; err != nil {
		return nil, 0, err
	}

	return events, total, nil
}

// GetLogEventsByWorkspaceAndAsset fetches log events for a specific asset within
// a workspace, optionally filtering by description, alongside the total count for
// pagination.
//
// workspaceID: identifier of the workspace
// assetType: one of "repository", "workflow", "user", "connection"
// assetID: identifier of the asset to filter by
// searchTerm: substring to match in the description; if empty, ignored
// limit: maximum number of events to return
// offset: number of events to skip
// returns: slice of LogEvent, total count of matching events, and error if any
func (d *Database) GetLogEventsByWorkspaceAndAsset(
	workspaceID uint,
	assetType string,
	assetID uint,
	searchTerm string,
	limit, offset int,
) ([]LogEvent, int64, error) {
	var events []LogEvent
	var total int64

	// base for counting with workspace filter
	countQuery := d.Model(&LogEvent{}).
		Where("workspace_id = ?", workspaceID)

	// asset-specific filter for counting
	switch assetType {
	case "repository":
		countQuery = countQuery.Where("repository_id = ?", assetID)
	case "workflow":
		countQuery = countQuery.Where("workflow_id = ?", assetID)
	case "user":
		countQuery = countQuery.Where("user_id = ?", assetID)
	case "connection":
		countQuery = countQuery.Where("connection_id = ?", assetID)
	}

	// apply description filter if present
	if searchTerm != "" {
		pattern := fmt.Sprintf("%%%s%%", strings.ToLower(searchTerm))
		countQuery = countQuery.Where("LOWER(description) LIKE ?", pattern)
	}

	// count total matching events
	if err := countQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// base fetch query with preloads
	query := d.Preload("User").
		Preload("Workspace").
		Preload("Repository").
		Preload("Workflow").
		Preload("WorkflowRun").
		Preload("Connection").
		Where("workspace_id = ?", workspaceID)

	// asset-specific filter for fetching
	switch assetType {
	case "repository":
		query = query.Where("repository_id = ?", assetID)
	case "workflow":
		query = query.Where("workflow_id = ?", assetID)
	case "user":
		query = query.Where("user_id = ?", assetID)
	case "connection":
		query = query.Where("connection_id = ?", assetID)
	}

	// apply description filter if present
	if searchTerm != "" {
		pattern := fmt.Sprintf("%%%s%%", strings.ToLower(searchTerm))
		query = query.Where("LOWER(description) LIKE ?", pattern)
	}

	// execute fetch with ordering and pagination
	if err := query.
		Order("created_at desc").
		Limit(limit).
		Offset(offset).
		Find(&events).Error; err != nil {
		return nil, 0, err
	}

	return events, total, nil
}

// CreateLogEvent inserts a new log event into the database.
//
// event: pointer to LogEvent to be created
// returns: created LogEvent and error if any
func (d *Database) CreateLogEvent(event *LogEvent) (*LogEvent, error) {
	if err := d.Create(event).Error; err != nil {
		return nil, err
	}
	return event, nil
}
