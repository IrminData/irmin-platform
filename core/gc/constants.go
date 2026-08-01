package gc

// LakeFS garbage collection defaults applied to all repositories.
const (
	// LakeFSDefaultRetentionDays is the default retention period for deleted objects
	// across all branches in LakeFS.
	LakeFSDefaultRetentionDays = 30

	// LakeFSDefaultBranchRetentionDays is the retention period for deleted objects
	// on a repository's default branch (typically "main").
	LakeFSDefaultBranchRetentionDays = 14
)

// Database retention policies for old records.
const (
	// WorkflowRunRetentionDays is the number of days to keep completed, failed,
	// or cancelled workflow runs before hard-deleting them from the database.
	WorkflowRunRetentionDays = 90

	// LogEventRetentionDays is the number of days to keep audit log events
	// before hard-deleting them from the database.
	LogEventRetentionDays = 180

	// SoftDeleteRetentionDays is the number of days to keep soft-deleted records
	// (where deleted_at IS NOT NULL) before permanently hard-deleting them.
	SoftDeleteRetentionDays = 30
)

// GC operational settings.
const (
	// GCBatchSize is the maximum number of records to delete in a single
	// database transaction to avoid holding long locks.
	GCBatchSize = 1000

	// GCAdvisoryLockKey is the PostgreSQL advisory lock key used to prevent
	// concurrent GC runs across multiple application instances.
	GCAdvisoryLockKey = "irmin:gc:global"
)
