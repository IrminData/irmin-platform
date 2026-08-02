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

// LogAssetType constants for filtering log events by asset type.
const (
	LogAssetTypeRepository       = "repository"
	LogAssetTypeWorkflow         = "workflow"
	LogAssetTypeUser             = "user"
	LogAssetTypeConnection       = "connection"
	LogAssetTypeStoredQuery      = "stored_query"
	LogAssetTypePolicy           = "policy"
	LogAssetTypeRepositoryObject = "repository_object"
	LogAssetTypeAIApplication    = "ai_application"
)

type LogEvent struct {
	gorm.Model

	Type        LogEventType `json:"type"`
	Description string       `json:"description"`

	User               *User             `json:"user"                 gorm:"foreignKey:UserID"`
	UserID             *uint             `json:"user_id"              gorm:"index"`
	Workspace          *Workspace        `json:"workspace"            gorm:"foreignKey:WorkspaceID"`
	WorkspaceID        *uint             `json:"workspace_id"         gorm:"index"`
	Repository         *Repository       `json:"repository"           gorm:"foreignKey:RepositoryID"`
	RepositoryID       *uint             `json:"repository_id"        gorm:"index"`
	RepositoryObject   *RepositoryObject `json:"repository_object"    gorm:"foreignKey:RepositoryObjectID"`
	RepositoryObjectID *uint             `json:"repository_object_id" gorm:"index"`
	Workflow           *Workflow         `json:"workflow"             gorm:"foreignKey:WorkflowID"`
	WorkflowID         *uint             `json:"workflow_id"          gorm:"index"`
	WorkflowRun        *WorkflowRun      `json:"workflow_run"         gorm:"foreignKey:WorkflowRunID"`
	WorkflowRunID      *uint             `json:"workflow_run_id"      gorm:"index"`
	ConnectionID       *uint             `json:"connection_id"        gorm:"index"`
	Connection         *Connection       `json:"connection"           gorm:"foreignKey:ConnectionID"`
	Policy             *Policy           `json:"policy"               gorm:"foreignKey:PolicyID"`
	PolicyID           *uint             `json:"policy_id"            gorm:"index"`
	StoredQuery        *StoredQuery      `json:"stored_query"         gorm:"foreignKey:StoredQueryID"`
	StoredQueryID      *uint             `json:"stored_query_id"      gorm:"index"`
	AIApplication      *AIApplication    `json:"ai_application"       gorm:"foreignKey:AIApplicationID"`
	AIApplicationID    *uint             `json:"ai_application_id"    gorm:"index"`
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
		Where(&LogEvent{WorkspaceID: &workspaceID})

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
		Preload("Workspace.Owner").
		Preload("Repository").
		Preload("Workflow").
		Preload("WorkflowRun").
		Preload("Connection").
		Preload("Policy").
		Preload("StoredQuery").
		Preload("RepositoryObject.Repository").
		Preload("AIApplication").
		Where(&LogEvent{WorkspaceID: &workspaceID})

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
		Where(&LogEvent{WorkspaceID: &workspaceID})

	// asset-specific filter for counting
	switch assetType {
	case LogAssetTypeRepository:
		countQuery = countQuery.Where(&LogEvent{RepositoryID: &assetID})
	case LogAssetTypeWorkflow:
		countQuery = countQuery.Where(&LogEvent{WorkflowID: &assetID})
	case LogAssetTypeUser:
		countQuery = countQuery.Where(&LogEvent{UserID: &assetID})
	case LogAssetTypeConnection:
		countQuery = countQuery.Where(&LogEvent{ConnectionID: &assetID})
	case LogAssetTypeStoredQuery:
		countQuery = countQuery.Where(&LogEvent{StoredQueryID: &assetID})
	case LogAssetTypePolicy:
		countQuery = countQuery.Where(&LogEvent{PolicyID: &assetID})
	case LogAssetTypeRepositoryObject:
		countQuery = countQuery.Where(&LogEvent{RepositoryObjectID: &assetID})
	case LogAssetTypeAIApplication:
		countQuery = countQuery.Where(&LogEvent{AIApplicationID: &assetID})
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
		Preload("Workspace.Owner").
		Preload("Repository").
		Preload("Workflow").
		Preload("WorkflowRun").
		Preload("Connection").
		Preload("Policy").
		Preload("StoredQuery").
		Preload("RepositoryObject.Repository").
		Preload("AIApplication").
		Where(&LogEvent{WorkspaceID: &workspaceID})

	// asset-specific filter for fetching
	switch assetType {
	case LogAssetTypeRepository:
		query = query.Where(&LogEvent{RepositoryID: &assetID})
	case LogAssetTypeWorkflow:
		query = query.Where(&LogEvent{WorkflowID: &assetID})
	case LogAssetTypeUser:
		query = query.Where(&LogEvent{UserID: &assetID})
	case LogAssetTypeConnection:
		query = query.Where(&LogEvent{ConnectionID: &assetID})
	case LogAssetTypeStoredQuery:
		query = query.Where(&LogEvent{StoredQueryID: &assetID})
	case LogAssetTypePolicy:
		query = query.Where(&LogEvent{PolicyID: &assetID})
	case LogAssetTypeRepositoryObject:
		query = query.Where(&LogEvent{RepositoryObjectID: &assetID})
	case LogAssetTypeAIApplication:
		query = query.Where(&LogEvent{AIApplicationID: &assetID})
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
