package engine

import (
	"context"
	"fmt"
	"irmin-api/db"
	enginevalidation "irmin-api/engine/validation"
	"irmin-api/lakefs"
	"irmin-api/utils"
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	irminutils "github.com/IrminData/irmin-sdk-go/utils"
	"gorm.io/gorm"
)

func (c *Client) CompareRefs(
	ctx context.Context,
	user *db.User,
	workspace *db.Workspace,
	repositorySlug, baseRef, compareRef string,
) (*irminmodels.Diff, error) {
	// Construct repository name.
	lakeFSRepositoryName := utils.ConstructLakeFSRepositoryName(workspace.Slug, repositorySlug)

	// Run LakeFS API calls concurrently.
	mergeBaseFuture := utils.AsyncWithContext(ctx, func() (*lakefs.MergeBase, error) {
		return c.LakeFSClient.FindMergeBase(lakeFSRepositoryName, compareRef, baseRef)
	})
	diffFuture := utils.AsyncWithContext(ctx, func() ([]lakefs.Diff, error) {
		return c.LakeFSClient.ListAllRefDiffs(lakeFSRepositoryName, baseRef, compareRef, "", "")
	})

	// Get the merge base, e.g. the common ancestor of the two references.
	mergeBase, err := mergeBaseFuture.Await()
	if err != nil {
		return nil, fmt.Errorf("failed to get merge base: %w", err)
	}

	// Get the diff items.
	diff, err := diffFuture.Await()
	if err != nil {
		return nil, fmt.Errorf("failed to get diff items: %w", err)
	}

	// Get the commits in the compare_ref after the merge base.
	newCommits, err := c.LakeFSClient.ListAllCommits(
		lakeFSRepositoryName,
		compareRef,
		"",
		"",
		mergeBase.BaseCommitID,
		nil,
		nil,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get commits in compare_ref: %w", err)
	}

	// Remove the merge base commit from the list of new commits.
	for i, commit := range newCommits {
		if commit.ID == mergeBase.BaseCommitID {
			newCommits = append(newCommits[:i], newCommits[i+1:]...)
			break
		}
	}

	// Construct Irmin diff object.
	irminChangeItems := make([]irminmodels.ChangeItem, len(diff))
	for i, diffItem := range diff {
		objectDetails := irminutils.ParseObjectDetailsFromPath(diffItem.Path)
		irminChangeItems[i] = irminmodels.ChangeItem{
			Type: irminmodels.ChangeType(diffItem.Type),
			Size: int(diffItem.SizeBytes),
			Object: irminmodels.Object{
				Name:        objectDetails.Name,
				Path:        objectDetails.FullPath,
				Type:        objectDetails.Type,
				ContentType: objectDetails.ContentType,
			},
		}
	}
	irminCommits := make([]irminmodels.Commit, len(newCommits))
	for i, lakeFSCommit := range newCommits {
		previousHash := ""
		if len(lakeFSCommit.Parents) > 0 {
			previousHash = lakeFSCommit.Parents[0]
		}
		author := lakeFSCommit.Committer
		if authorValue, ok := lakeFSCommit.Metadata["author"]; ok && authorValue != "" {
			author = authorValue
		}
		irminCommits[i] = irminmodels.Commit{
			Hash:         lakeFSCommit.ID,
			Message:      lakeFSCommit.Message,
			Timestamp:    time.Unix(int64(lakeFSCommit.CreationDate), 0).Format(time.RFC3339),
			Author:       author,
			PreviousHash: &previousHash,
		}
	}

	// Compute schema diffs for structured objects that changed
	schemaDiffs := c.computeSchemaDiffs(ctx, user, workspace, repositorySlug, baseRef, compareRef, diff)

	irminDiff := &irminmodels.Diff{
		Repository:  repositorySlug,
		BaseRef:     baseRef,
		CompareRef:  compareRef,
		Items:       irminChangeItems,
		Commits:     irminCommits,
		SchemaDiffs: schemaDiffs,
	}

	return irminDiff, nil
}

// computeSchemaDiffs computes schema differences for structured objects that changed between refs.
//
//nolint:gocognit // This function is complex but it's necessary to compute schema differences for structured objects.
func (c *Client) computeSchemaDiffs(
	ctx context.Context,
	user *db.User,
	workspace *db.Workspace,
	repositorySlug, baseRef, compareRef string,
	diffItems []lakefs.Diff,
) []irminmodels.ObjectSchemaDiff {
	var schemaDiffs []irminmodels.ObjectSchemaDiff

	for _, diffItem := range diffItems {
		objectDetails := irminutils.ParseObjectDetailsFromPath(diffItem.Path)

		// Only compute schema diffs for structured objects
		if objectDetails.Type != irminmodels.ObjectTypeStructured {
			continue
		}

		var baseSchema, compareSchema *irminmodels.ObjectSchema
		var baseErr, compareErr error

		// Get schema from base ref (for changed or removed items)
		if diffItem.Type == "changed" || diffItem.Type == "removed" {
			baseSchema, baseErr = c.GenerateObjectSchema(
				ctx,
				user,
				workspace,
				repositorySlug,
				objectDetails.FullPath,
				baseRef,
			)
			if baseErr != nil {
				c.Logger.WarnContext(ctx, "failed to get base schema for diff",
					"path", objectDetails.FullPath, "ref", baseRef, "error", baseErr)
			}
		}

		// Get schema from compare ref (for changed or added items)
		if diffItem.Type == "changed" || diffItem.Type == "added" {
			compareSchema, compareErr = c.GenerateObjectSchema(
				ctx,
				user,
				workspace,
				repositorySlug,
				objectDetails.FullPath,
				compareRef,
			)
			if compareErr != nil {
				c.Logger.WarnContext(ctx, "failed to get compare schema for diff",
					"path", objectDetails.FullPath, "ref", compareRef, "error", compareErr)
			}
		}

		// Compute schema diff if we have at least one schema
		if baseSchema != nil || compareSchema != nil {
			schemaDiff := enginevalidation.CompareSchemas(baseSchema, compareSchema)

			// Only include if there are actual changes
			if schemaDiff != nil && schemaDiff.HasChanges() {
				schemaDiffs = append(schemaDiffs, irminmodels.ObjectSchemaDiff{
					Path: objectDetails.FullPath,
					Diff: schemaDiff,
				})
			}
		}
	}

	return schemaDiffs
}

func (c *Client) GetUncommittedChanges(
	workspace, repository, branch string,
) (*irminmodels.Diff, error) {
	// Construct repository name.
	lakeFSRepositoryName := utils.ConstructLakeFSRepositoryName(workspace, repository)

	diff, err := c.LakeFSClient.ListAllBranchDiffs(lakeFSRepositoryName, branch)
	if err != nil {
		return nil, fmt.Errorf("failed to get diff items: %w", err)
	}

	// Construct Irmin diff object.
	irminChangeItems := make([]irminmodels.ChangeItem, len(diff))
	for i, diffItem := range diff {
		objectDetails := irminutils.ParseObjectDetailsFromPath(diffItem.Path)
		irminChangeItems[i] = irminmodels.ChangeItem{
			Type: irminmodels.ChangeType(diffItem.Type),
			Size: int(diffItem.SizeBytes),
			Object: irminmodels.Object{
				Name:        objectDetails.Name,
				Path:        objectDetails.FullPath,
				Type:        objectDetails.Type,
				ContentType: objectDetails.ContentType,
			},
		}
	}

	irminDiff := &irminmodels.Diff{
		Repository: repository,
		BaseRef:    branch,
		CompareRef: branch,
		Items:      irminChangeItems,
		Commits:    nil,
	}

	return irminDiff, nil
}

func (c *Client) MergeRefs(
	workspace, repository, baseRef, compareRef, message, author, strategy string,
	squash, allowEmpty bool,
) (*irminmodels.Commit, error) {
	// Create a lock key based on workspace, repository, and baseRef to prevent race conditions
	// We lock on the baseRef since that's the target branch being modified
	lockKey := fmt.Sprintf("merge_refs:%s:%s:%s", workspace, repository, baseRef)

	// Execute the entire operation within a database transaction with advisory lock
	var result *irminmodels.Commit
	transactionErr := c.DB.Transaction(func(tx *gorm.DB) error {
		// Acquire advisory lock to prevent concurrent merges to the same base branch
		if lockErr := db.LockKeyTx(tx, lockKey); lockErr != nil {
			return fmt.Errorf("failed to acquire advisory lock for merge to branch %s: %w", baseRef, lockErr)
		}

		// Process the merge
		var processErr error
		result, processErr = c.mergeRefsInternal(
			workspace,
			repository,
			baseRef,
			compareRef,
			message,
			author,
			strategy,
			squash,
			allowEmpty,
		)
		return processErr
	})

	if transactionErr != nil {
		return nil, transactionErr
	}

	return result, nil
}

// mergeRefsInternal contains the core merge logic, separated for clarity.
func (c *Client) mergeRefsInternal(
	workspace, repository, baseRef, compareRef, message, author, strategy string,
	squash, allowEmpty bool,
) (*irminmodels.Commit, error) {
	// Construct repository name.
	lakeFSRepositoryName := utils.ConstructLakeFSRepositoryName(workspace, repository)

	// Construct the merge request.
	mergeRequest := &lakefs.Merge{
		Message: message,
		Metadata: map[string]string{
			"author": author,
		},
		Strategy:    lakefs.MergeStrategy(strategy),
		SquashMerge: squash,
		AllowEmpty:  allowEmpty,
		Force:       false,
	}

	// Merge the compare_ref into the base_ref.
	merge, err := c.LakeFSClient.MergeRefs(lakeFSRepositoryName, compareRef, baseRef, *mergeRequest)
	if err != nil {
		return nil, fmt.Errorf("failed to merge refs: %w", err)
	}

	// Get merge commit details.
	lakeFSCommit, err := c.LakeFSClient.GetCommit(lakeFSRepositoryName, merge.Reference)
	if err != nil {
		return nil, fmt.Errorf("failed to get commit: %w", err)
	}

	// Convert LakeFS commit to Irmin commit.
	previousHash := ""
	if len(lakeFSCommit.Parents) > 0 {
		previousHash = lakeFSCommit.Parents[0]
	}
	author = lakeFSCommit.Committer
	if authorValue, ok := lakeFSCommit.Metadata["author"]; ok && authorValue != "" {
		author = authorValue
	}
	irminCommit := irminmodels.Commit{
		Hash:         lakeFSCommit.ID,
		Message:      lakeFSCommit.Message,
		Timestamp:    time.Unix(int64(lakeFSCommit.CreationDate), 0).Format(time.RFC3339),
		Author:       author,
		PreviousHash: &previousHash,
	}

	return &irminCommit, nil
}
