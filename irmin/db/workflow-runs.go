package db

import (
	"encoding/json"
	"time"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	"gorm.io/gorm"
)

type WorkflowRun struct {
	gorm.Model

	StartedAt         *time.Time                 `json:"started_at,omitempty"`
	FinishedAt        *time.Time                 `json:"finished_at,omitempty"`
	Status            irminmodels.WorkflowStatus `json:"status"                gorm:"index"`
	Retries           int                        `json:"retries"               gorm:"default:0"`
	Logs              []string                   `json:"logs,omitempty"        gorm:"type:jsonb;serializer:json"`
	TriggeredBy       *WorkflowTrigger           `json:"triggered_by"          gorm:"foreignKey:TriggeredByID"`
	TriggeredByID     *uint                      `json:"triggered_by_id"`
	TriggeredByUser   *User                      `json:"triggered_by_user"     gorm:"foreignKey:TriggeredByUserID"`
	TriggeredByUserID *uint                      `json:"triggered_by_user_id"`
	Workflow          Workflow                   `json:"workflow"              gorm:"foreignKey:WorkflowID"`
	WorkflowID        uint                       `json:"workflow_id"           gorm:"index"`

	// TriggerPayload contains the event data that triggered this workflow run.
	// For connection events, contains the webhook payload with patches.
	// For repository events with IncludeDiffAsPatch, contains generated patches.
	// Available to pipeline stages as trigger_event.json in previousStageResults.
	TriggerPayload json.RawMessage `json:"trigger_payload,omitempty" gorm:"type:jsonb"`
}

// GetWorkflowRunsByWorkflowID returns workflow runs for the given workflow ID,
// sorted by creation time, along with the total count of matching runs for pagination.
func (d *Database) GetWorkflowRunsByWorkflowID(workflowID uint, limit, offset int) ([]WorkflowRun, int, error) {
	// Count total number of matching events
	var total int64
	if err := d.Model(&WorkflowRun{}).
		Where(&WorkflowRun{WorkflowID: workflowID}).
		Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Find log events based on the provided parameters
	var workflowRuns []WorkflowRun
	result := d.Preload("TriggeredBy").
		Preload("TriggeredBy.Repository").
		Preload("TriggeredBy.Workflow").
		Preload("TriggeredByUser").
		Preload("Workflow").
		Where(&WorkflowRun{WorkflowID: workflowID}).
		Order("created_at desc").
		Limit(limit).
		Offset(offset).
		Find(&workflowRuns)

	return workflowRuns, int(total), result.Error
}

func (d *Database) GetLatestWorkflowRunByWorkflowID(workflowID uint) (*WorkflowRun, error) {
	var workflowRun WorkflowRun
	result := d.Preload("TriggeredBy").
		Preload("TriggeredBy.Repository").
		Preload("TriggeredBy.Workflow").
		Preload("TriggeredByUser").
		Preload("Workflow").
		Where(&WorkflowRun{WorkflowID: workflowID}).
		Order("created_at desc").
		Limit(1).
		Find(&workflowRun)
	return &workflowRun, result.Error
}

func (d *Database) GetWorkflowRunByID(id uint) (*WorkflowRun, error) {
	var workflowRun WorkflowRun
	result := d.Preload("TriggeredBy").
		Preload("TriggeredBy.Repository").
		Preload("TriggeredBy.Workflow").
		Preload("TriggeredByUser").
		Preload("Workflow").
		First(&workflowRun, id)
	return &workflowRun, result.Error
}

// GetWorkflowRunsByWorkflowIDWithCursor returns workflow runs using cursor-based pagination.
// This is more efficient than offset pagination for deep pages (O(1) vs O(n) for page depth).
// cursor: timestamp to start after (exclusive). Use nil for first page.
// Returns runs created before the cursor, sorted by created_at DESC.
func (d *Database) GetWorkflowRunsByWorkflowIDWithCursor(
	workflowID uint,
	cursor *time.Time,
	limit int,
) ([]WorkflowRun, error) {
	var workflowRuns []WorkflowRun

	query := d.Preload("TriggeredBy").
		Preload("TriggeredBy.Repository").
		Preload("TriggeredBy.Workflow").
		Preload("TriggeredByUser").
		Preload("Workflow").
		Where(&WorkflowRun{WorkflowID: workflowID})

	if cursor != nil {
		query = query.Where("created_at < ?", cursor)
	}

	if err := query.Order("created_at desc").Limit(limit).Find(&workflowRuns).Error; err != nil {
		return nil, err
	}

	return workflowRuns, nil
}

// GetWorkflowRunsByWorkspaceIDWithCursor returns workflow runs using cursor-based pagination.
// cursor: timestamp to start after (exclusive). Use nil for first page.
func (d *Database) GetWorkflowRunsByWorkspaceIDWithCursor(
	workspaceID uint,
	cursor *time.Time,
	limit int,
) ([]WorkflowRun, error) {
	var workflowRuns []WorkflowRun

	query := d.Preload("TriggeredBy").
		Preload("TriggeredBy.Repository").
		Preload("TriggeredBy.Workflow").
		Preload("TriggeredByUser").
		Preload("Workflow").
		Joins("JOIN workflows ON workflow_runs.workflow_id = workflows.id").
		Where("workflows.workspace_id = ?", workspaceID)

	if cursor != nil {
		query = query.Where("workflow_runs.created_at < ?", cursor)
	}

	if err := query.Order("workflow_runs.created_at desc").Limit(limit).Find(&workflowRuns).Error; err != nil {
		return nil, err
	}

	return workflowRuns, nil
}

// GetWorkflowRunsByWorkspaceID returns workflow runs for all workflows in the given workspace,
// sorted by creation time, along with the total count of matching runs for pagination.
func (d *Database) GetWorkflowRunsByWorkspaceID(workspaceID uint, limit, offset int) ([]WorkflowRun, int, error) {
	// Count total number of matching workflow runs
	var total int64
	if err := d.Model(&WorkflowRun{}).
		Joins("JOIN workflows ON workflow_runs.workflow_id = workflows.id").
		Where("workflows.workspace_id = ?", workspaceID).
		Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Find workflow runs based on the provided parameters
	var workflowRuns []WorkflowRun
	result := d.Preload("TriggeredBy").
		Preload("TriggeredBy.Repository").
		Preload("TriggeredBy.Workflow").
		Preload("TriggeredByUser").
		Preload("Workflow").
		Joins("JOIN workflows ON workflow_runs.workflow_id = workflows.id").
		Where("workflows.workspace_id = ?", workspaceID).
		Order("workflow_runs.created_at desc").
		Limit(limit).
		Offset(offset).
		Find(&workflowRuns)

	return workflowRuns, int(total), result.Error
}
