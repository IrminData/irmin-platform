package orchestrator

import (
	"context"
	"errors"
	"fmt"
	"irmin-api/db"
	"time"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	"gorm.io/gorm"
)

const (
	// stalePendingWorkflowRunCancelAge defines when a pending run is old
	// enough to be considered abandoned and auto-cancelled.
	stalePendingWorkflowRunCancelAge = 24 * time.Hour
	// stalePendingWorkflowRunDeleteAge defines when an already-cancelled run
	// (cancelled by stale cleanup) is old enough to be hard-deleted.
	stalePendingWorkflowRunDeleteAge = 30 * 24 * time.Hour
	// stalePendingWorkflowRunBatchSize bounds one cleanup sweep.
	stalePendingWorkflowRunBatchSize = 200
	// stalePendingCleanupLogPrefix marks maintenance-originated cancellations.
	stalePendingCleanupLogPrefix = "auto-cancelled stale pending run during maintenance"
	// StalePendingWorkflowRunAgeThreshold is the age at which pending runs are
	// treated as abandoned and auto-cancelled by maintenance.
	StalePendingWorkflowRunAgeThreshold = stalePendingWorkflowRunCancelAge
)

// cleanupStalePendingWorkflowRuns marks very old pending runs as cancelled and
// eventually hard-deletes those stale-cancelled rows after a longer retention.
// It returns the number of runs cancelled in this sweep.
func (o *Orchestrator) cleanupStalePendingWorkflowRuns(ctx context.Context, now time.Time) (int64, error) {
	if o == nil || o.db == nil {
		return 0, nil
	}

	cancelCutoff := now.Add(-stalePendingWorkflowRunCancelAge)
	deleteCutoff := now.Add(-stalePendingWorkflowRunDeleteAge)
	var cleanupErr error

	// First, hard-delete extremely old pending runs that are well beyond
	// recovery windows (e.g. leftovers from prolonged outages).
	prunedPendingCount, pruneErr := o.deleteVeryOldPendingWorkflowRuns(ctx, deleteCutoff)
	if pruneErr != nil {
		o.logger.ErrorContext(ctx, "stale pending cleanup (prune pending phase) failed", "error", pruneErr)
		cleanupErr = errors.Join(cleanupErr, pruneErr)
	} else if prunedPendingCount > 0 {
		o.logger.InfoContext(
			ctx,
			"stale pending cleanup pruned very old pending workflow runs",
			"count", prunedPendingCount,
			"older_than", deleteCutoff,
		)
	}

	cancelledCount, cancelErr := o.cancelStalePendingWorkflowRuns(ctx, cancelCutoff, now)
	if cancelErr != nil {
		o.logger.ErrorContext(ctx, "stale pending cleanup (cancel phase) failed", "error", cancelErr)
		cleanupErr = errors.Join(cleanupErr, cancelErr)
	} else if cancelledCount > 0 {
		o.logger.InfoContext(
			ctx,
			"stale pending cleanup cancelled workflow runs",
			"count", cancelledCount,
			"older_than", cancelCutoff,
		)
	}

	deletedCount, deleteErr := o.deleteOldStaleCancelledWorkflowRuns(ctx, deleteCutoff)
	if deleteErr != nil {
		o.logger.ErrorContext(ctx, "stale pending cleanup (delete phase) failed", "error", deleteErr)
		cleanupErr = errors.Join(cleanupErr, deleteErr)
	} else if deletedCount > 0 {
		o.logger.InfoContext(
			ctx,
			"stale pending cleanup deleted workflow runs",
			"count", deletedCount,
			"older_than", deleteCutoff,
		)
	}

	return cancelledCount, cleanupErr
}

func (o *Orchestrator) cancelStalePendingWorkflowRuns(ctx context.Context, cutoff, now time.Time) (int64, error) {
	return ApplyStalePendingUpdates(o.db.WithContext(ctx), now, cutoff, stalePendingCleanupLogPrefix)
}

func (o *Orchestrator) deleteOldStaleCancelledWorkflowRuns(ctx context.Context, cutoff time.Time) (int64, error) {
	result := o.db.WithContext(ctx).
		Unscoped().
		Where(
			"status = ? AND finished_at < ? AND deleted_at IS NULL AND logs::text LIKE ?",
			irminmodels.WorkflowStatusCancelled,
			cutoff,
			"%"+stalePendingCleanupLogPrefix+"%",
		).
		Order("id ASC").
		Limit(stalePendingWorkflowRunBatchSize).
		Delete(&db.WorkflowRun{})
	if result.Error != nil {
		return 0, fmt.Errorf("delete old stale-cancelled runs: %w", result.Error)
	}
	return result.RowsAffected, nil
}

func (o *Orchestrator) deleteVeryOldPendingWorkflowRuns(ctx context.Context, cutoff time.Time) (int64, error) {
	result := o.db.WithContext(ctx).
		Unscoped().
		Where(
			"status = ? AND created_at < ? AND deleted_at IS NULL",
			irminmodels.WorkflowStatusPending,
			cutoff,
		).
		Limit(stalePendingWorkflowRunBatchSize).
		Delete(&db.WorkflowRun{})
	if result.Error != nil {
		return 0, fmt.Errorf("delete very old pending runs: %w", result.Error)
	}
	return result.RowsAffected, nil
}

// ApplyStalePendingUpdates marks pending runs older than cutoff as cancelled.
func ApplyStalePendingUpdates(gormDB *gorm.DB, now, cutoff time.Time, logPrefix string) (int64, error) {
	var staleRuns []db.WorkflowRun
	if err := gormDB.
		Where(
			"status = ? AND deleted_at IS NULL AND ((started_at IS NOT NULL AND started_at < ?) OR (started_at IS NULL AND created_at < ?))",
			irminmodels.WorkflowStatusPending,
			cutoff,
			cutoff,
		).
		Order("id ASC").
		Limit(stalePendingWorkflowRunBatchSize).
		Find(&staleRuns).Error; err != nil {
		return 0, fmt.Errorf("query stale pending runs: %w", err)
	}
	if len(staleRuns) == 0 {
		return 0, nil
	}

	var cancelled int64
	for _, run := range staleRuns {
		logs := append([]string{}, run.Logs...)
		logs = append(logs, fmt.Sprintf("%s (run_id=%d)", logPrefix, run.ID))
		result := gormDB.Model(&db.WorkflowRun{}).
			Where("id = ? AND status = ? AND deleted_at IS NULL", run.ID, irminmodels.WorkflowStatusPending).
			Updates(map[string]any{
				"status":      irminmodels.WorkflowStatusCancelled,
				"finished_at": now,
				"logs":        logs,
			})
		if result.Error != nil {
			return cancelled, fmt.Errorf("cancel stale pending run %d: %w", run.ID, result.Error)
		}
		cancelled += result.RowsAffected
	}
	return cancelled, nil
}
