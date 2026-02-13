package gc

import (
	"context"
	"irmin-api/db"
	"irmin-api/lakefs"
	"irmin-api/utils"
	"log/slog"
	"time"
)

// Collector is the garbage collection service. It cleans up old data across
// LakeFS repositories, the PostgreSQL database, and the local filesystem.
type Collector struct {
	db           *db.Database
	lakefsClient *lakefs.Client
	logger       *slog.Logger
	env          *utils.CoreAPIEnv
}

// NewCollector creates a new GC collector.
func NewCollector(
	database *db.Database,
	lakefsClient *lakefs.Client,
	logger *slog.Logger,
	env *utils.CoreAPIEnv,
) *Collector {
	return &Collector{
		db:           database,
		lakefsClient: lakefsClient,
		logger:       logger,
		env:          env,
	}
}

// Run executes all garbage collection operations.
// If dryRun is true, no data is actually deleted; the report shows what would happen.
func (c *Collector) Run(ctx context.Context, dryRun bool) *Report {
	report := NewReport(dryRun)

	c.logger.InfoContext(ctx, "starting garbage collection", "dry_run", dryRun)

	// Acquire global advisory lock on a pinned connection to prevent concurrent GC runs.
	// PostgreSQL session-scoped advisory locks are bound to the connection that acquired them,
	// so we must hold the same connection for both lock and unlock.
	if !dryRun {
		conn, connErr := c.db.GetPgxConn(ctx)
		if connErr != nil {
			report.Errors = append(report.Errors, connErr)
			c.logger.ErrorContext(ctx, "failed to get connection for GC advisory lock", "error", connErr)
			return report
		}
		defer conn.Release()

		locked, lockErr := db.TryLockKeyConn(ctx, conn, GCAdvisoryLockKey)
		if lockErr != nil {
			report.Errors = append(report.Errors, lockErr)
			c.logger.ErrorContext(ctx, "failed to acquire GC advisory lock", "error", lockErr)
			return report
		}
		if !locked {
			c.logger.WarnContext(ctx, "GC already running on another instance, skipping")
			return report
		}
		defer func() {
			if unlockErr := db.UnlockKeyConn(ctx, conn, GCAdvisoryLockKey); unlockErr != nil {
				c.logger.ErrorContext(ctx, "failed to release GC advisory lock", "error", unlockErr)
			}
		}()
	}

	// 1. Sync LakeFS GC rules across all repositories.
	c.syncLakeFSGCRules(ctx, dryRun, report)

	// 2. Delete LakeFS repositories with no corresponding DB record.
	c.cleanupOrphanedLakeFSRepos(ctx, dryRun, report)

	// 3. Soft-delete DB repositories whose LakeFS repo no longer exists.
	c.cleanupOrphanedDBRepos(ctx, dryRun, report)

	// 4. Clean up old workflow runs.
	c.cleanupWorkflowRuns(ctx, dryRun, report)

	// 5. Clean up old log events.
	c.cleanupLogEvents(ctx, dryRun, report)

	// 6. Soft-delete orphaned records (cascading parent deletions).
	c.cleanupOrphans(ctx, dryRun, report)

	// 7. Hard-delete soft-deleted records past retention.
	c.cleanupSoftDeletedRecords(ctx, dryRun, report)

	// 8. Clean up orphaned temp files.
	c.cleanupTempFiles(ctx, dryRun, report)

	report.FinishedAt = time.Now()
	c.logReport(ctx, report)

	return report
}

// logReport logs the GC report summary.
func (c *Collector) logReport(ctx context.Context, report *Report) {
	duration := report.FinishedAt.Sub(report.StartedAt)

	c.logger.InfoContext(ctx, "garbage collection completed",
		"dry_run", report.DryRun,
		"duration", duration,
		"lakefs_repos_scanned", report.LakeFSReposScanned,
		"lakefs_repos_updated", report.LakeFSReposUpdated,
		"lakefs_repos_deleted", report.LakeFSReposDeleted,
		"lakefs_repos_failed", report.LakeFSReposFailed,
		"lakefs_db_repos_orphaned", report.LakeFSDBReposOrphaned,
		"workflow_runs_deleted", report.WorkflowRunsDeleted,
		"log_events_deleted", report.LogEventsDeleted,
		"orphaned_rules_matched", len(report.OrphanedRecords),
		"soft_deleted_tables", len(report.SoftDeletedRecords),
		"temp_files_deleted", report.TempFilesDeleted,
		"temp_bytes_freed", report.TempBytesFreed,
		"has_errors", report.HasErrors(),
	)
}
