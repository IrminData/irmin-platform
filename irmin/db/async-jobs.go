package db

import (
	"encoding/json"
	"time"

	"gorm.io/gorm"
)

// AsyncJobStatus represents the status of an async job.
type AsyncJobStatus string

const (
	AsyncJobStatusPending   AsyncJobStatus = "pending"
	AsyncJobStatusRunning   AsyncJobStatus = "running"
	AsyncJobStatusCompleted AsyncJobStatus = "completed"
	AsyncJobStatusFailed    AsyncJobStatus = "failed"
)

// AsyncJobType represents the type of async job.
type AsyncJobType string

const (
	AsyncJobTypeZipDownload AsyncJobType = "zip_download"
)

// AsyncJob represents an asynchronous background job.
// The table is kept for migration compatibility; job processing infrastructure
// has been removed (no jobs are currently created).
type AsyncJob struct {
	gorm.Model
	WorkspaceID  uint            `json:"workspace_id"            gorm:"index"`
	UserID       uint            `json:"user_id"                 gorm:"index"`
	Type         AsyncJobType    `json:"type"                    gorm:"index"`
	Status       AsyncJobStatus  `json:"status"                  gorm:"index;default:pending"`
	Params       json.RawMessage `json:"params"                  gorm:"type:jsonb"`
	ResultURL    string          `json:"result_url,omitempty"`
	ResultExpiry *time.Time      `json:"result_expiry,omitempty"`
	ErrorMessage string          `json:"error_message,omitempty"`
	Progress     int             `json:"progress"                gorm:"default:0"`
}
