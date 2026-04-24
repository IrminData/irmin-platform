package orchestrator

import (
	"context"
	"time"
)

// runMaintenanceLoop runs lightweight periodic cleanup jobs alongside the
// main trigger-scan loop. Intended for small, idempotent operations that
// keep DB tables bounded between full `-gc` passes — sweeping expired
// OAuth sessions today, more as it becomes useful.
//
// The loop stops when ctx is cancelled. Errors from individual jobs are
// logged and swallowed; a single job's failure must not interrupt the
// tick for the others.
func (o *Orchestrator) runMaintenanceLoop(ctx context.Context) {
	// Fire once immediately so restart doesn't leave us waiting a full
	// interval before the first sweep.
	o.runMaintenanceTick(ctx)

	ticker := time.NewTicker(MaintenanceTickInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			o.runMaintenanceTick(ctx)
		}
	}
}

// runMaintenanceTick executes one round of maintenance jobs. Each job is
// expected to short-circuit fast when there's nothing to do, so the
// overall tick finishes quickly on a cold database.
func (o *Orchestrator) runMaintenanceTick(ctx context.Context) {
	o.sweepExpiredOAuthSessions(ctx)
	if _, err := o.cleanupStalePendingWorkflowRuns(ctx, time.Now()); err != nil {
		o.logger.ErrorContext(ctx, "stale pending cleanup sweep failed", "error", err)
	}
}

// sweepExpiredOAuthSessions drops OAuth session rows whose TTL has
// elapsed. The service layer already rejects expired sessions at
// lookup time, so these rows are inert — the sweep just keeps the table
// from growing unbounded when users close the vendor popup mid-flow.
func (o *Orchestrator) sweepExpiredOAuthSessions(ctx context.Context) {
	deleted, err := o.db.DeleteExpiredConnectionOAuthSessions(time.Now())
	if err != nil {
		o.logger.ErrorContext(ctx, "oauth session sweep failed", "error", err)
		return
	}
	if deleted > 0 {
		o.logger.InfoContext(ctx, "oauth session sweep", "deleted", deleted)
	}
}
