package db

import (
	"time"

	"gorm.io/gorm"
)

// MCPPendingOperation stores a destructive canonical tool call until a user approves it.
type MCPPendingOperation struct {
	gorm.Model
	WorkspaceID     uint                   `json:"workspace_id" gorm:"not null;index"`
	Workspace       Workspace              `json:"workspace" gorm:"foreignKey:WorkspaceID"`
	RequestedByID   uint                   `json:"requested_by_id" gorm:"not null;index"`
	RequestedBy     User                   `json:"requested_by" gorm:"foreignKey:RequestedByID"`
	ToolName        string                 `json:"tool_name" gorm:"not null;index"`
	Risk            string                 `json:"risk" gorm:"not null"`
	Capability      string                 `json:"capability"`
	ApprovalPreview string                 `json:"approval_preview"`
	ArgumentsJSON   string                 `json:"-" gorm:"type:jsonb;not null"`
	Status          PendingOperationStatus `json:"status" gorm:"default:pending;index"`
	ReviewedByID    *uint                  `json:"reviewed_by_id,omitempty"`
	ReviewedBy      *User                  `json:"reviewed_by,omitempty" gorm:"foreignKey:ReviewedByID"`
	ReviewedAt      *time.Time             `json:"reviewed_at,omitempty"`
	ExecutionError  string                 `json:"execution_error,omitempty"`
}

func (d *Database) CreateMCPPendingOperation(operation *MCPPendingOperation) error {
	return d.Create(operation).Error
}

func (d *Database) GetMCPPendingOperation(id uint) (*MCPPendingOperation, error) {
	var operation MCPPendingOperation
	if err := d.Preload("Workspace").Preload("RequestedBy").Preload("ReviewedBy").First(&operation, id).Error; err != nil {
		return nil, err
	}
	return &operation, nil
}

func (d *Database) ClaimMCPPendingOperation(id, reviewerID uint) (bool, error) {
	now := time.Now()
	result := d.Model(&MCPPendingOperation{}).
		Where("id = ? AND status = ?", id, PendingOperationStatusPending).
		Updates(map[string]any{
			"status": PendingOperationStatusExecuting, "reviewed_by_id": reviewerID, "reviewed_at": now,
		})
	return result.RowsAffected == 1, result.Error
}

func (d *Database) TransitionMCPPendingOperation(
	id uint,
	expected, next PendingOperationStatus,
	reviewerID uint,
) (bool, error) {
	now := time.Now()
	result := d.Model(&MCPPendingOperation{}).
		Where("id = ? AND status = ?", id, expected).
		Updates(map[string]any{
			"status": next, "reviewed_by_id": reviewerID, "reviewed_at": now,
		})
	return result.RowsAffected == 1, result.Error
}

func (d *Database) FinishMCPPendingOperation(id uint, status PendingOperationStatus, executionError string) error {
	return d.Model(&MCPPendingOperation{}).Where("id = ?", id).Updates(map[string]any{
		"status": status, "execution_error": executionError,
	}).Error
}
