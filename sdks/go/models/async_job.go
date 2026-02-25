package irminmodels

import "time"

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

// AsyncJob represents an asynchronous background job response.
type AsyncJob struct {
	ID           string         `json:"id"                      validate:"required,validsqid=async-jobs"`
	CreatedAt    time.Time      `json:"created_at"              validate:"required"`
	UpdatedAt    time.Time      `json:"updated_at"              validate:"required"`
	Type         AsyncJobType   `json:"type"                    validate:"required"`
	Status       AsyncJobStatus `json:"status"                  validate:"required"`
	Progress     int            `json:"progress"`
	ErrorMessage string         `json:"error_message,omitempty"`
	ResultExpiry *time.Time     `json:"result_expiry,omitempty"`
}
