package gc

import (
	"context"
	"fmt"
	"irmin-api/db"
	"strings"
	"time"

	"gorm.io/gorm"
)

// cleanupWorkflowRuns hard-deletes workflow runs older than the retention period.
// Only completed, error, or cancelled runs are deleted — never running or pending ones.
func (c *Collector) cleanupWorkflowRuns(ctx context.Context, dryRun bool, report *Report) {
	c.logger.InfoContext(ctx, "cleaning up old workflow runs",
		"retention_days", WorkflowRunRetentionDays,
	)

	cutoff := time.Now().AddDate(0, 0, -WorkflowRunRetentionDays)
	terminalStatuses := []string{"complete", "error", "cancelled"}

	if dryRun {
		var count int64
		c.db.Model(&db.WorkflowRun{}).
			Where("created_at < ? AND status IN ?", cutoff, terminalStatuses).
			Count(&count)
		report.WorkflowRunsDeleted = count
		c.logger.InfoContext(ctx, "[DRY RUN] would delete workflow runs", "count", count)
		return
	}

	for {
		var deleted int64
		txErr := c.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
			result := tx.Unscoped().
				Where("id IN (?)",
					tx.Model(&db.WorkflowRun{}).
						Select("id").
						Where("created_at < ? AND status IN ?", cutoff, terminalStatuses).
						Limit(GCBatchSize),
				).
				Delete(&db.WorkflowRun{})
			deleted = result.RowsAffected
			return result.Error
		})
		if txErr != nil {
			report.Errors = append(report.Errors, fmt.Errorf("workflow run cleanup: %w", txErr))
			c.logger.ErrorContext(ctx, "workflow run cleanup error", "error", txErr)
			break
		}
		report.WorkflowRunsDeleted += deleted
		if deleted < int64(GCBatchSize) {
			break
		}
	}

	c.logger.InfoContext(ctx, "workflow run cleanup complete", "deleted", report.WorkflowRunsDeleted)
}

// cleanupLogEvents hard-deletes log events older than the retention period.
func (c *Collector) cleanupLogEvents(ctx context.Context, dryRun bool, report *Report) {
	c.logger.InfoContext(ctx, "cleaning up old log events",
		"retention_days", LogEventRetentionDays,
	)

	cutoff := time.Now().AddDate(0, 0, -LogEventRetentionDays)

	if dryRun {
		var count int64
		c.db.Model(&db.LogEvent{}).
			Where("created_at < ?", cutoff).
			Count(&count)
		report.LogEventsDeleted = count
		c.logger.InfoContext(ctx, "[DRY RUN] would delete log events", "count", count)
		return
	}

	for {
		var deleted int64
		txErr := c.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
			result := tx.Unscoped().
				Where("id IN (?)",
					tx.Model(&db.LogEvent{}).
						Select("id").
						Where("created_at < ?", cutoff).
						Limit(GCBatchSize),
				).
				Delete(&db.LogEvent{})
			deleted = result.RowsAffected
			return result.Error
		})
		if txErr != nil {
			report.Errors = append(report.Errors, fmt.Errorf("log event cleanup: %w", txErr))
			c.logger.ErrorContext(ctx, "log event cleanup error", "error", txErr)
			break
		}
		report.LogEventsDeleted += deleted
		if deleted < int64(GCBatchSize) {
			break
		}
	}

	c.logger.InfoContext(ctx, "log event cleanup complete", "deleted", report.LogEventsDeleted)
}

// softDeleteTable represents a GORM model that uses soft-delete via gorm.Model.
type softDeleteTable struct {
	Name  string
	Model any
}

// cleanupSoftDeletedRecords permanently removes records where deleted_at is older
// than the retention period. Tables are processed in FK-safe order (children first).
func (c *Collector) cleanupSoftDeletedRecords(ctx context.Context, dryRun bool, report *Report) {
	c.logger.InfoContext(ctx, "cleaning up soft-deleted records",
		"retention_days", SoftDeleteRetentionDays,
	)

	cutoff := time.Now().AddDate(0, 0, -SoftDeleteRetentionDays)

	// Tables in FK-safe deletion order: children before parents.
	// Only models with gorm.Model (soft-delete) are included.
	// Junction tables (QueryTag, ScriptTag, etc.) do NOT have gorm.Model.
	tables := []softDeleteTable{
		// Leaf-level — no other soft-delete table has an FK pointing to these.
		{Name: "ai_application_pending_writes", Model: &db.AIApplicationPendingWrite{}},
		{Name: "ai_application_tool_logs", Model: &db.AIApplicationToolLog{}},
		{Name: "ai_application_custom_tools", Model: &db.AIApplicationCustomTool{}},
		{Name: "ai_application_data_sources", Model: &db.AIApplicationDataSource{}},
		{Name: "templates", Model: &db.Template{}},
		{Name: "repository_objects", Model: &db.RepositoryObject{}},
		{Name: "repository_schema_caches", Model: &db.RepositorySchemaCache{}},
		{Name: "connection_subscriptions", Model: &db.ConnectionSubscription{}},
		{Name: "connection_schema_caches", Model: &db.ConnectionSchemaCache{}},
		{Name: "log_events", Model: &db.LogEvent{}},
		{Name: "workflow_runs", Model: &db.WorkflowRun{}},
		{Name: "workflow_triggers", Model: &db.WorkflowTrigger{}},
		{Name: "pipeline_stages", Model: &db.PipelineStage{}},
		{Name: "action_workflowable_inputs", Model: &db.ActionWorkflowableInput{}},
		{Name: "policies", Model: &db.Policy{}},
		{Name: "tags", Model: &db.Tag{}},
		{Name: "api_tokens", Model: &db.APIToken{}},
		{Name: "invites", Model: &db.Invite{}},
		{Name: "workspace_user_roles", Model: &db.WorkspaceUserRole{}},

		// Level 2 — referenced by leaf tables above.
		// stored_queries is parent of log_events (fk_log_events_stored_query).
		// workflows is parent of workflow_runs (fk_workflow_runs_workflow).
		{Name: "stored_queries", Model: &db.StoredQuery{}},
		{Name: "stored_scripts", Model: &db.StoredScript{}},
		{Name: "workflows", Model: &db.Workflow{}},

		// Level 3 — workflowable parents, referenced by workflows.
		// workflows.schedule_id → schedules, workflows.import_id → import_workflowables, etc.
		{Name: "schedules", Model: &db.Schedule{}},
		{Name: "import_workflowables", Model: &db.ImportWorkflowable{}},
		{Name: "export_workflowables", Model: &db.ExportWorkflowable{}},
		{Name: "action_workflowables", Model: &db.ActionWorkflowable{}},
		{Name: "pipeline_workflowables", Model: &db.PipelineWorkflowable{}},

		// Level 4 — mid-level parents.
		{Name: "ai_applications", Model: &db.AIApplication{}},
		{Name: "connections", Model: &db.Connection{}},
		{Name: "repositories", Model: &db.Repository{}},

		// Level 5 — workspace level.
		{Name: "workspace_users", Model: &db.WorkspaceUser{}},
		{Name: "workspaces", Model: &db.Workspace{}},

		// Level 6 — top-level parents (deleted last).
		{Name: "users", Model: &db.User{}},
		{Name: "connectors", Model: &db.Connector{}},
		{Name: "roles", Model: &db.Role{}},
	}

	for _, table := range tables {
		select {
		case <-ctx.Done():
			return
		default:
		}

		c.cleanupSoftDeletedTable(ctx, dryRun, report, table, cutoff)
	}
}

// cleanupSoftDeletedTable hard-deletes soft-deleted records from a single table.
func (c *Collector) cleanupSoftDeletedTable(
	ctx context.Context,
	dryRun bool,
	report *Report,
	table softDeleteTable,
	cutoff time.Time,
) {
	if dryRun {
		var count int64
		c.db.Unscoped().Model(table.Model).
			Where("deleted_at IS NOT NULL AND deleted_at < ?", cutoff).
			Count(&count)
		if count > 0 {
			report.SoftDeletedRecords[table.Name] = count
			c.logger.InfoContext(ctx, "[DRY RUN] would hard-delete soft-deleted records",
				"table", table.Name,
				"count", count,
			)
		}
		return
	}

	var totalDeleted int64
	for {
		var deleted int64
		txErr := c.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
			result := tx.Unscoped().
				Where("id IN (?)",
					tx.Unscoped().Model(table.Model).
						Select("id").
						Where("deleted_at IS NOT NULL AND deleted_at < ?", cutoff).
						Limit(GCBatchSize),
				).
				Delete(table.Model)
			deleted = result.RowsAffected
			return result.Error
		})
		if txErr != nil {
			if isFKViolation(txErr) {
				c.logger.WarnContext(ctx, "skipping hard-delete: records still referenced by other tables",
					"table", table.Name,
				)
			} else {
				report.Errors = append(report.Errors,
					fmt.Errorf("soft-delete cleanup %s: %w", table.Name, txErr))
				c.logger.ErrorContext(ctx, "soft-delete cleanup error",
					"table", table.Name,
					"error", txErr,
				)
			}
			break
		}
		totalDeleted += deleted
		if deleted < int64(GCBatchSize) {
			break
		}
	}

	if totalDeleted > 0 {
		report.SoftDeletedRecords[table.Name] = totalDeleted
		c.logger.InfoContext(ctx, "hard-deleted soft-deleted records",
			"table", table.Name,
			"count", totalDeleted,
		)
	}
}

// isFKViolation returns true if the error is a PostgreSQL foreign key constraint violation (SQLSTATE 23503).
// These are expected during hard-delete when recently-orphaned children haven't passed retention yet.
func isFKViolation(err error) bool {
	return err != nil && strings.Contains(err.Error(), "23503")
}
