package db

import (
	"fmt"
	"time"

	"gorm.io/datatypes"
)

// OperationJob is the GORM-mapped persistence record for an
// asynchronous connector operation job (e.g., a long-running pull).
//
// The wire-facing SDK type lives in
// github.com/IrminData/irmin-sdk-go/models.OperationJob — fields here
// mirror that shape but add the bookkeeping columns (Progress JSON,
// ResultPath, Error) that the server side needs and the SDK client
// does not. The connector service converts between the two at the
// HTTP boundary.
type OperationJob struct {
	// JobID is the connector-issued opaque identifier. Primary key
	// because it's what every external call (status / result /
	// cancel) lookups on.
	JobID string `gorm:"primaryKey;type:varchar(64)" json:"job_id"`

	// ConnectorRegistrationID is the connector-service-local FK to
	// the connector this job was started on. Used for auditing; not
	// surfaced directly on the status response (we surface the
	// connector name via ConnectorName).
	ConnectorRegistrationID uint `gorm:"index" json:"connector_registration_id"`

	// ConnectorName is the connector slug (e.g., "stripe"). Echoed on
	// the status response as OperationJob.ConnectorID in the SDK
	// shape — the SDK uses that field as a human-readable connector
	// ident, not a sqid.
	ConnectorName string `gorm:"type:varchar(128);index" json:"connector_name"`

	// OperationID is the connector-service-local Operation row this
	// job is executing against. Needed so the worker can fetch the
	// operation, hydrate the provider, and emit progress events that
	// round-trip to the operation log.
	OperationID uint `gorm:"index" json:"operation_id"`

	// Kind tags the row with the operation kind (pull / push /
	// patch / schema) so 409 AlreadyRunningBody responses can tell
	// the caller which flavor is blocking. Nullable varchar with an
	// empty default so pre-migration rows and tests that don't
	// supply a kind continue to work — the wire shape tolerates an
	// empty Kind as "unknown".
	Kind string `gorm:"type:varchar(32);index" json:"kind"`

	// Status is the lifecycle state. Stored as text so migrations
	// don't require a Postgres enum type — the set of valid values is
	// enforced by the SDK constants (OperationJobStatusPending etc.).
	Status string `gorm:"type:varchar(32);index;not null" json:"status"`

	// Progress is the cumulative JSON-encoded slice of ProgressEvent
	// values the worker has emitted so far. Kept as a single JSON
	// column rather than a child table because the append volume is
	// low (one event per page/batch/heartbeat, not per row) and the
	// whole slice is always read together on GET /operation/status.
	Progress datatypes.JSON `gorm:"type:json" json:"progress"`

	// Error is populated when Status=failed. Operator-facing message;
	// not a machine-readable code.
	Error string `gorm:"type:text" json:"error"`

	// ResultPath is the absolute filesystem path of the result zip
	// once the worker has finished. Empty until then.
	ResultPath string `gorm:"type:text" json:"result_path"`

	// CreatedAt / UpdatedAt are standard GORM-managed timestamps.
	// They are used by the janitor together with ExpiresAt to drive
	// GC decisions.
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// ExpiresAt is when the janitor should garbage-collect this row
	// and its result file. Set when the job reaches a terminal state
	// (complete/failed/cancelled); zero for in-flight jobs.
	ExpiresAt *time.Time `gorm:"index" json:"expires_at,omitempty"`
}

// TableName pins the GORM-derived table name so future renames of the
// Go type (unlikely but nonzero) don't silently migrate schema.
func (OperationJob) TableName() string {
	return "operation_jobs"
}

// CreateOperationJob inserts a new OperationJob record. Returns the
// record (with zero-value timestamps filled in by GORM) so callers can
// surface CreatedAt on the accept-path response without a re-read.
func (d *Database) CreateOperationJob(job *OperationJob) (*OperationJob, error) {
	if err := d.Create(job).Error; err != nil {
		return nil, fmt.Errorf("failed to create operation job record: %w", err)
	}
	return job, nil
}

// GetOperationJob fetches a job by its opaque JobID. Returns
// (nil, nil) when no row matches — callers decide whether that's a
// 404 (unknown job) or a 410 (expired + already reaped); the janitor
// deletes expired rows, so the distinction is made at the handler
// level by consulting a seen-job cache we do not maintain here. The
// server-side choice is "treat missing as 404"; a real 410 requires
// a tombstone row, which is a deliberate non-goal of this phase.
func (d *Database) GetOperationJob(jobID string) (*OperationJob, error) {
	var job OperationJob
	err := d.Where("job_id = ?", jobID).First(&job).Error
	if err != nil {
		// Caller discriminates gorm.ErrRecordNotFound; return the
		// error as-is so errors.Is works without wrapping.
		return nil, err
	}
	return &job, nil
}

// FindActiveOperationJob returns the job currently holding the
// operation_exec advisory lock for operationID, if any. "Active"
// means status is pending or running — both non-terminal states that
// imply the worker goroutine is either about to start or in-flight.
//
// Used by the 409 path: when Begin fails to acquire the lock we
// surface the blocking job's ID to the caller so they can poll its
// status or cancel it without a second round-trip. Returns
// gorm.ErrRecordNotFound when no active row exists (e.g., a
// legacy-sync handler still holds the lock without having
// registered a job row); callers treat that as "retry later".
//
// Multiple active rows shouldn't happen in practice — Begin takes
// the advisory lock before creating the row — but if the DB is in a
// weird state we pick the most recently created one so the operator
// can find the live worker.
func (d *Database) FindActiveOperationJob(operationID uint) (*OperationJob, error) {
	var job OperationJob
	err := d.Where(
		"operation_id = ? AND status IN ?",
		operationID,
		[]string{"pending", "running"},
	).Order("created_at DESC").First(&job).Error
	if err != nil {
		return nil, err
	}
	return &job, nil
}

// UpdateOperationJobStatus sets the Status column (and optionally
// Error / ResultPath / ExpiresAt) for a job. Uses a column-scoped
// Updates() call so concurrent Progress appends from the worker
// goroutine don't race — GORM serialises the single-column write at
// the SQL level.
func (d *Database) UpdateOperationJobStatus(
	jobID string,
	status string,
	errMsg *string,
	resultPath *string,
	expiresAt *time.Time,
) error {
	updates := map[string]any{
		"status": status,
	}
	if errMsg != nil {
		updates["error"] = *errMsg
	}
	if resultPath != nil {
		updates["result_path"] = *resultPath
	}
	if expiresAt != nil {
		updates["expires_at"] = expiresAt
	}
	if err := d.Model(&OperationJob{}).
		Where("job_id = ?", jobID).
		Updates(updates).Error; err != nil {
		return fmt.Errorf("failed to update operation job %q: %w", jobID, err)
	}
	return nil
}

// UpdateOperationJobProgress replaces the Progress JSON column for a
// job. Writers serialise the in-memory slice before calling this, so
// there is no rows-level race — the worker owns the authoritative
// copy and persists it after each append.
func (d *Database) UpdateOperationJobProgress(jobID string, progressJSON []byte) error {
	if err := d.Model(&OperationJob{}).
		Where("job_id = ?", jobID).
		Update("progress", datatypes.JSON(progressJSON)).Error; err != nil {
		return fmt.Errorf("failed to update operation job progress %q: %w", jobID, err)
	}
	return nil
}

// DeleteExpiredOperationJobs removes all rows whose ExpiresAt is in
// the past. Returns the number of rows deleted so the janitor can log
// a meaningful number. The result file is NOT deleted here — the
// janitor handles filesystem cleanup separately (it reads ResultPath
// first, then calls this).
func (d *Database) DeleteExpiredOperationJobs(now time.Time) (int64, error) {
	res := d.Where("expires_at IS NOT NULL AND expires_at < ?", now).
		Delete(&OperationJob{})
	if res.Error != nil {
		return 0, fmt.Errorf("failed to delete expired operation jobs: %w", res.Error)
	}
	return res.RowsAffected, nil
}

// ListExpiredOperationJobs returns the jobs whose ExpiresAt is in the
// past, without deleting them. Used by the janitor to know which
// ResultPath files to unlink before issuing DeleteExpiredOperationJobs.
func (d *Database) ListExpiredOperationJobs(now time.Time) ([]OperationJob, error) {
	var jobs []OperationJob
	if err := d.Where("expires_at IS NOT NULL AND expires_at < ?", now).
		Find(&jobs).Error; err != nil {
		return nil, fmt.Errorf("failed to list expired operation jobs: %w", err)
	}
	return jobs, nil
}

// ListStuckOperationJobs returns jobs still in a non-terminal status
// (pending / running) whose updated_at is older than threshold. These
// are candidates for janitor reclaim: a worker that vanished (pod
// crash, SIGKILL, network partition) leaves the row at
// status=running indefinitely because the terminal-transition write
// never happens. The janitor compares updated_at against the stuck
// threshold — a live worker's heartbeat bumps updated_at every
// heartbeat tick via UpdateOperationJobProgress, so anything quieter
// than threshold is presumed dead.
//
// The caller is expected to probe the operation's advisory lock
// before actually reclaiming the row, so a slow-but-alive worker
// (e.g., one caught in a long network call with the heartbeat
// goroutine wedged) is not falsely killed.
func (d *Database) ListStuckOperationJobs(threshold time.Time) ([]OperationJob, error) {
	var jobs []OperationJob
	err := d.Where(
		"status IN ? AND updated_at < ?",
		[]string{"pending", "running"},
		threshold,
	).Find(&jobs).Error
	if err != nil {
		return nil, fmt.Errorf("failed to list stuck operation jobs: %w", err)
	}
	return jobs, nil
}
