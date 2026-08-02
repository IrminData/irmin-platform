package gc

import (
	"context"
	"fmt"
	"irmin-api/bucket"
	"irmin-api/db"
	"irmin-api/lakefs"
	"strings"
)

// syncLakeFSGCRules iterates all LakeFS repositories and sets GC rules on repos
// that don't already have rules configured. Repos with existing rules are left untouched
// so user-configured retention periods are not overwritten.
func (c *Collector) syncLakeFSGCRules(ctx context.Context, dryRun bool, report *Report) {
	c.logger.InfoContext(ctx, "syncing LakeFS GC rules",
		"default_retention_days", LakeFSDefaultRetentionDays,
		"default_branch_retention_days", LakeFSDefaultBranchRetentionDays,
	)

	allRepos, listErr := c.lakefsClient.ListAllRepositories("", "")
	if listErr != nil {
		report.LakeFSErrors = append(report.LakeFSErrors,
			fmt.Errorf("failed to list repositories: %w", listErr))
		c.logger.ErrorContext(ctx, "failed to list LakeFS repositories", "error", listErr)
		return
	}

	report.LakeFSReposScanned = len(allRepos)

	for _, repo := range allRepos {
		select {
		case <-ctx.Done():
			return
		default:
		}

		c.syncRepoGCRules(ctx, dryRun, report, repo)
	}
}

// syncRepoGCRules sets default GC rules on a single repository if it doesn't already have rules.
func (c *Collector) syncRepoGCRules(
	ctx context.Context,
	dryRun bool,
	report *Report,
	repo lakefs.Repository,
) {
	// Check existing rules — skip repos that already have custom configuration.
	existing, getErr := c.lakefsClient.GetGarbageCollectionRules(repo.ID)
	if getErr != nil {
		report.LakeFSReposFailed++
		report.LakeFSErrors = append(report.LakeFSErrors,
			fmt.Errorf("repo %s: failed to get GC rules: %w", repo.ID, getErr))
		c.logger.ErrorContext(ctx, "failed to get GC rules",
			"repository", repo.ID, "error", getErr,
		)
		return
	}
	if existing != nil && existing.DefaultRetentionDays > 0 {
		c.logger.DebugContext(ctx, "skipping repo with existing GC rules",
			"repository", repo.ID,
			"existing_retention_days", existing.DefaultRetentionDays,
		)
		return
	}

	repoRules := lakefs.GarbageCollectionRules{
		DefaultRetentionDays: LakeFSDefaultRetentionDays,
		Branches: []lakefs.BranchGarbageCollectionRules{
			{
				BranchID:      repo.DefaultBranch,
				RetentionDays: LakeFSDefaultBranchRetentionDays,
			},
		},
	}

	if dryRun {
		c.logger.InfoContext(ctx, "[DRY RUN] would set GC rules",
			"repository", repo.ID,
			"default_retention_days", repoRules.DefaultRetentionDays,
			"branch_retention_days", LakeFSDefaultBranchRetentionDays,
			"default_branch", repo.DefaultBranch,
		)
		report.LakeFSReposUpdated++
		return
	}

	if setErr := c.lakefsClient.SetGarbageCollectionRules(repo.ID, repoRules); setErr != nil {
		report.LakeFSReposFailed++
		report.LakeFSErrors = append(report.LakeFSErrors,
			fmt.Errorf("repo %s: %w", repo.ID, setErr))
		c.logger.ErrorContext(ctx, "failed to set GC rules",
			"repository", repo.ID, "error", setErr,
		)
		return
	}

	report.LakeFSReposUpdated++
	c.logger.InfoContext(ctx, "set GC rules",
		"repository", repo.ID,
		"default_retention_days", repoRules.DefaultRetentionDays,
		"branch_retention_days", LakeFSDefaultBranchRetentionDays,
	)
}

// cleanupOrphanedLakeFSRepos deletes LakeFS repositories that have no corresponding
// record in the database (not even soft-deleted). Both the LakeFS metadata and the
// underlying S3 storage namespace are removed. Repos whose DB record is soft-deleted
// are kept — they'll be cleaned up after the DB record is hard-deleted.
func (c *Collector) cleanupOrphanedLakeFSRepos(ctx context.Context, dryRun bool, report *Report) {
	c.logger.InfoContext(ctx, "cleaning up orphaned LakeFS repositories")

	allRepos, listErr := c.lakefsClient.ListAllRepositories("", "")
	if listErr != nil {
		report.LakeFSErrors = append(report.LakeFSErrors,
			fmt.Errorf("failed to list repositories for cleanup: %w", listErr))
		c.logger.ErrorContext(ctx, "failed to list LakeFS repositories for cleanup", "error", listErr)
		return
	}

	// Create bucket client once for S3 storage cleanup (shared across all deletions).
	bucketClient, bucketErr := bucket.CreateClient(c.env, c.env.LakeFSS3Bucket, c.db)
	if bucketErr != nil {
		report.LakeFSErrors = append(report.LakeFSErrors,
			fmt.Errorf("failed to create bucket client for LakeFS cleanup: %w", bucketErr))
		c.logger.ErrorContext(ctx, "failed to create bucket client for LakeFS cleanup", "error", bucketErr)
		return
	}
	defer bucketClient.Close()

	for _, repo := range allRepos {
		select {
		case <-ctx.Done():
			return
		default:
		}

		c.processOrphanedLakeFSRepo(ctx, dryRun, report, repo, bucketClient)
	}
}

// processOrphanedLakeFSRepo checks a single LakeFS repo against the DB and deletes it if orphaned.
// Both the LakeFS metadata and the underlying S3 storage are removed.
func (c *Collector) processOrphanedLakeFSRepo(
	ctx context.Context,
	dryRun bool,
	report *Report,
	repo lakefs.Repository,
	bucketClient *bucket.Client,
) {
	// Check if ANY DB record exists for this LakeFS repo (including soft-deleted).
	// On query error, assume the repo is NOT orphaned to avoid accidental deletion.
	var count int64
	countResult := c.db.Unscoped().Model(&db.Repository{}).
		Where(&db.Repository{LakeFSRepoID: repo.ID}).
		Count(&count)

	if countResult.Error != nil {
		report.LakeFSErrors = append(report.LakeFSErrors,
			fmt.Errorf("repo %s: failed to check DB record: %w", repo.ID, countResult.Error))
		c.logger.ErrorContext(ctx, "failed to check DB record for LakeFS repository, skipping",
			"repository", repo.ID, "error", countResult.Error,
		)
		return
	}

	if count > 0 {
		return
	}

	if dryRun {
		report.LakeFSReposDeleted++
		c.logger.InfoContext(ctx, "[DRY RUN] would delete orphaned LakeFS repository",
			"repository", repo.ID,
			"storage_namespace", repo.StorageNamespace,
		)
		return
	}

	// 1. Delete repository metadata from LakeFS.
	if deleteErr := c.lakefsClient.DeleteRepository(repo.ID); deleteErr != nil {
		report.LakeFSReposFailed++
		report.LakeFSErrors = append(report.LakeFSErrors,
			fmt.Errorf("failed to delete orphaned LakeFS repo %s: %w", repo.ID, deleteErr))
		c.logger.ErrorContext(ctx, "failed to delete orphaned LakeFS repository",
			"repository", repo.ID, "error", deleteErr,
		)
		return
	}

	// 2. Delete underlying S3 objects (same pattern as engine/repositories.go).
	storagePrefix := strings.TrimPrefix(repo.StorageNamespace, "s3://")
	if storagePrefix != "" {
		if s3Err := bucketClient.DeletePath(ctx, storagePrefix); s3Err != nil {
			report.LakeFSErrors = append(report.LakeFSErrors,
				fmt.Errorf("failed to delete S3 storage for orphaned repo %s: %w", repo.ID, s3Err))
			c.logger.ErrorContext(ctx, "failed to delete S3 storage for orphaned LakeFS repository",
				"repository", repo.ID,
				"storage_namespace", repo.StorageNamespace,
				"error", s3Err,
			)
		}
	}

	report.LakeFSReposDeleted++
	c.logger.InfoContext(ctx, "deleted orphaned LakeFS repository",
		"repository", repo.ID,
		"storage_namespace", repo.StorageNamespace,
	)
}

// cleanupOrphanedDBRepos soft-deletes DB Repository records whose LakeFS repository
// no longer exists. This handles the reverse of cleanupOrphanedLakeFSRepos — where
// a LakeFS repo was manually deleted or lost but the DB record remains.
func (c *Collector) cleanupOrphanedDBRepos(ctx context.Context, dryRun bool, report *Report) {
	c.logger.InfoContext(ctx, "cleaning up DB repositories with missing LakeFS repos")

	allLakeFSRepos, listErr := c.lakefsClient.ListAllRepositories("", "")
	if listErr != nil {
		report.LakeFSErrors = append(report.LakeFSErrors,
			fmt.Errorf("failed to list LakeFS repositories for DB cleanup: %w", listErr))
		c.logger.ErrorContext(ctx, "failed to list LakeFS repositories for DB cleanup", "error", listErr)
		return
	}

	// Build a set of all LakeFS repo IDs for O(1) lookup.
	lakefsIDSet := make(map[string]struct{}, len(allLakeFSRepos))
	for _, repo := range allLakeFSRepos {
		lakefsIDSet[repo.ID] = struct{}{}
	}

	// Fetch all active DB repos that have a LakeFS repo ID assigned.
	var dbRepos []db.Repository
	queryResult := c.db.
		Where("lake_fs_repo_id IS NOT NULL AND lake_fs_repo_id != ''").
		Find(&dbRepos)
	if queryResult.Error != nil {
		report.LakeFSErrors = append(report.LakeFSErrors,
			fmt.Errorf("failed to query DB repositories: %w", queryResult.Error))
		c.logger.ErrorContext(ctx, "failed to query DB repositories for LakeFS cleanup", "error", queryResult.Error)
		return
	}

	// Safety check: if LakeFS returned 0 repos but DB has repos, something is wrong
	// (e.g. LakeFS is down or misconfigured). Abort to prevent mass deletion.
	if len(allLakeFSRepos) == 0 && len(dbRepos) > 0 {
		c.logger.WarnContext(ctx,
			"LakeFS returned 0 repos but DB has repos, skipping cleanup to prevent mass deletion",
			"db_repos_count", len(dbRepos),
		)
		return
	}

	for _, dbRepo := range dbRepos {
		select {
		case <-ctx.Done():
			return
		default:
		}

		if _, exists := lakefsIDSet[dbRepo.LakeFSRepoID]; exists {
			continue
		}

		if dryRun {
			report.LakeFSDBReposOrphaned++
			c.logger.InfoContext(ctx, "[DRY RUN] would soft-delete DB repository with missing LakeFS repo",
				"db_repo_id", dbRepo.ID,
				"lakefs_repo_id", dbRepo.LakeFSRepoID,
			)
			continue
		}

		if deleteErr := c.db.Delete(&dbRepo).Error; deleteErr != nil {
			report.LakeFSErrors = append(
				report.LakeFSErrors,
				fmt.Errorf("soft-delete DB repo %d (lakefs: %s): %w", dbRepo.ID, dbRepo.LakeFSRepoID, deleteErr),
			)
			c.logger.ErrorContext(ctx, "failed to soft-delete DB repository with missing LakeFS repo",
				"db_repo_id", dbRepo.ID,
				"lakefs_repo_id", dbRepo.LakeFSRepoID,
				"error", deleteErr,
			)
			continue
		}

		report.LakeFSDBReposOrphaned++
		c.logger.InfoContext(ctx, "soft-deleted DB repository with missing LakeFS repo",
			"db_repo_id", dbRepo.ID,
			"lakefs_repo_id", dbRepo.LakeFSRepoID,
		)
	}
}
