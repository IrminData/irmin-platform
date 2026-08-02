package gc

import (
	"context"
	"fmt"

	"gorm.io/gorm"
)

// cleanupOrphans iterates all orphan rules and processes each one.
// Rules are ordered so parent-level orphans cascade into child rules.
func (c *Collector) cleanupOrphans(ctx context.Context, dryRun bool, report *Report) {
	c.logger.InfoContext(ctx, "cleaning up orphaned records")

	for _, rule := range orphanRules() {
		select {
		case <-ctx.Done():
			return
		default:
		}

		switch rule.Type {
		case orphanByParent:
			c.cleanupOrphansByParent(ctx, dryRun, report, rule)
		case orphanByNoMembers:
			c.cleanupOrphansByNoMembers(ctx, dryRun, report, rule)
		case orphanByUnreferenced:
			c.cleanupOrphansByUnreferenced(ctx, dryRun, report, rule)
		}
	}
}

// cleanupOrphansByParent soft-deletes (or hard-deletes for junction tables) child records
// whose parent is soft-deleted, hard-deleted, or missing.
func (c *Collector) cleanupOrphansByParent(
	ctx context.Context,
	dryRun bool,
	report *Report,
	rule orphanRule,
) {
	parentSubquery := c.activeParentSubquery(rule.ParentTable, rule.ParentHasSoftDelete)
	condition := fmt.Sprintf("%s IS NOT NULL AND %s NOT IN (?)", rule.FKColumn, rule.FKColumn)

	if dryRun {
		count := c.countOrphans(rule, condition, parentSubquery)
		if count > 0 {
			report.OrphanedRecords[rule.Name] = count
			c.logger.InfoContext(ctx, "[DRY RUN] would clean up orphan records",
				"rule", rule.Name, "count", count,
			)
		}
		return
	}

	total := c.deleteOrphansInBatches(ctx, report, rule, condition, parentSubquery)
	if total > 0 {
		report.OrphanedRecords[rule.Name] = total
		c.logger.InfoContext(ctx, "cleaned up orphan records",
			"rule", rule.Name, "count", total,
		)
	}
}

// cleanupOrphansByNoMembers soft-deletes workspaces that have zero active members.
func (c *Collector) cleanupOrphansByNoMembers(
	ctx context.Context,
	dryRun bool,
	report *Report,
	rule orphanRule,
) {
	activeWorkspaces := c.db.Table("workspace_users").
		Select("workspace_id").
		Where("deleted_at IS NULL")
	condition := "id NOT IN (?)"

	if dryRun {
		var count int64
		c.db.Model(rule.ChildModel).
			Where(condition, activeWorkspaces).
			Count(&count)
		if count > 0 {
			report.OrphanedRecords[rule.Name] = count
			c.logger.InfoContext(ctx, "[DRY RUN] would soft-delete workspaces with no members",
				"count", count,
			)
		}
		return
	}

	total := c.deleteOrphansInBatches(ctx, report, rule, condition, activeWorkspaces)
	if total > 0 {
		report.OrphanedRecords[rule.Name] = total
		c.logger.InfoContext(ctx, "soft-deleted workspaces with no members",
			"count", total,
		)
	}
}

// cleanupOrphansByUnreferenced soft-deletes records no longer referenced
// by any active row in the referencing table.
func (c *Collector) cleanupOrphansByUnreferenced(
	ctx context.Context,
	dryRun bool,
	report *Report,
	rule orphanRule,
) {
	referenced := c.db.Table(rule.ReferencingTable).
		Select(rule.ReferencingColumn).
		Where(fmt.Sprintf("deleted_at IS NULL AND %s IS NOT NULL", rule.ReferencingColumn))
	condition := "id NOT IN (?)"

	if dryRun {
		var count int64
		c.db.Model(rule.ChildModel).
			Where(condition, referenced).
			Count(&count)
		if count > 0 {
			report.OrphanedRecords[rule.Name] = count
			c.logger.InfoContext(ctx, "[DRY RUN] would soft-delete unreferenced records",
				"rule", rule.Name, "count", count,
			)
		}
		return
	}

	total := c.deleteOrphansInBatches(ctx, report, rule, condition, referenced)
	if total > 0 {
		report.OrphanedRecords[rule.Name] = total
		c.logger.InfoContext(ctx, "soft-deleted unreferenced records",
			"rule", rule.Name, "count", total,
		)
	}
}

// activeParentSubquery returns a subquery selecting IDs of active (non-deleted) parents.
func (c *Collector) activeParentSubquery(parentTable string, parentHasSoftDelete bool) *gorm.DB {
	q := c.db.Table(parentTable).Select("id")
	if parentHasSoftDelete {
		q = q.Where("deleted_at IS NULL")
	}
	return q
}

// countOrphans counts orphaned records matching the condition.
// For soft-delete models GORM auto-adds WHERE deleted_at IS NULL.
func (c *Collector) countOrphans(rule orphanRule, condition string, subquery *gorm.DB) int64 {
	var count int64
	q := c.db.Model(rule.ChildModel).Where(condition, subquery)
	if !rule.HasSoftDelete {
		q = q.Unscoped()
	}
	q.Count(&count)
	return count
}

// deleteOrphansInBatches processes deletions in batches of GCBatchSize.
// Soft-delete tables use GORM's default Delete (sets deleted_at).
// Junction tables use hard-delete (no deleted_at column).
// Junction tables are deleted unbatched since they lack an id column.
func (c *Collector) deleteOrphansInBatches(
	ctx context.Context,
	report *Report,
	rule orphanRule,
	condition string,
	subquery *gorm.DB,
) int64 {
	// Junction tables: single unbatched delete.
	if !rule.HasSoftDelete {
		return c.deleteJunctionOrphans(ctx, report, rule, condition, subquery)
	}

	var total int64
	for {
		var affected int64
		txErr := c.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
			result := tx.Where("id IN (?)",
				tx.Model(rule.ChildModel).
					Select("id").
					Where(condition, subquery).
					Limit(GCBatchSize),
			).Delete(rule.ChildModel)
			affected = result.RowsAffected
			return result.Error
		})
		if txErr != nil {
			report.Errors = append(report.Errors,
				fmt.Errorf("orphan cleanup %s: %w", rule.Name, txErr))
			c.logger.ErrorContext(ctx, "orphan cleanup error",
				"rule", rule.Name, "error", txErr,
			)
			break
		}
		total += affected
		if affected < int64(GCBatchSize) {
			break
		}
	}
	return total
}

// deleteJunctionOrphans hard-deletes all orphaned junction table records in one transaction.
func (c *Collector) deleteJunctionOrphans(
	ctx context.Context,
	report *Report,
	rule orphanRule,
	condition string,
	subquery *gorm.DB,
) int64 {
	var affected int64
	txErr := c.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		result := tx.Where(condition, subquery).Delete(rule.ChildModel)
		affected = result.RowsAffected
		return result.Error
	})
	if txErr != nil {
		report.Errors = append(report.Errors,
			fmt.Errorf("orphan cleanup %s: %w", rule.Name, txErr))
		c.logger.ErrorContext(ctx, "orphan cleanup error",
			"rule", rule.Name, "error", txErr,
		)
		return 0
	}
	return affected
}
