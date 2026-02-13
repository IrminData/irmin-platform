package gc

import "time"

// Report contains the results of a garbage collection run.
type Report struct {
	StartedAt  time.Time
	FinishedAt time.Time
	DryRun     bool

	// LakeFS results.
	LakeFSReposScanned    int
	LakeFSReposUpdated    int
	LakeFSReposDeleted    int
	LakeFSReposFailed     int
	LakeFSDBReposOrphaned int
	LakeFSErrors          []error

	// Workflow run cleanup results.
	WorkflowRunsDeleted int64

	// Log event cleanup results.
	LogEventsDeleted int64

	// Orphan record cleanup results (rule name → count affected).
	OrphanedRecords map[string]int64

	// Soft-deleted records cleanup results (table name → count deleted).
	SoftDeletedRecords map[string]int64

	// Temp file cleanup results.
	TempFilesDeleted int
	TempBytesFreed   int64

	// General errors encountered during GC.
	Errors []error
}

// NewReport creates a new empty GC report.
func NewReport(dryRun bool) *Report {
	return &Report{
		StartedAt:          time.Now(),
		DryRun:             dryRun,
		OrphanedRecords:    make(map[string]int64),
		SoftDeletedRecords: make(map[string]int64),
	}
}

// HasErrors returns true if any errors were recorded during the GC run.
func (r *Report) HasErrors() bool {
	return len(r.Errors) > 0 || len(r.LakeFSErrors) > 0
}
