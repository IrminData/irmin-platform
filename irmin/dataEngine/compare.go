package dataEngine

import (
	"context"
	"fmt"
	"irmin-api/lakefs"
	"irmin-api/utils"
	"time"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

func (c *Client) CompareRefs(ctx context.Context, workspace, repository, baseRef, compareRef string) (*irminModels.Diff, error) {
	// Create LakeFS client.
	lakefsClient, err := lakefs.CreateClient()
	if err != nil {
		return nil, fmt.Errorf("failed to create LakeFS client: %w", err)
	}

	// Construct repository name.
	lakeFSRepositoryName := utils.GetLakeFSRepositoryName(workspace, repository)

	// Run LakeFS API calls concurrently.
	mergeBaseFuture := utils.AsyncWithContext(ctx, func() (*lakefs.MergeBase, error) {
		return lakefsClient.FindMergeBase(lakeFSRepositoryName, compareRef, baseRef)
	})
	diffFuture := utils.AsyncWithContext(ctx, func() ([]lakefs.Diff, error) {
		return lakefsClient.ListAllRefDiffs(lakeFSRepositoryName, baseRef, compareRef, "", "")
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
	newCommits, err := lakefsClient.ListAllCommits(lakeFSRepositoryName, compareRef, "", "", mergeBase.BaseCommitID, nil, nil)
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
	irminChangeItems := make([]irminModels.ChangeItem, len(diff))
	for i, diffItem := range diff {
		objectDetails := utils.ParseObjectDetailsFromPath(diffItem.Path)
		irminChangeItems[i] = irminModels.ChangeItem{
			Type: irminModels.ChangeType(diffItem.Type),
			Size: int(diffItem.SizeBytes),
			Object: irminModels.Object{
				Name:        objectDetails.Name,
				Path:        objectDetails.FullPath,
				Type:        objectDetails.Type,
				ContentType: &objectDetails.ContentType,
			},
		}
	}
	irminCommits := make([]irminModels.Commit, len(newCommits))
	for i, lakeFSCommit := range newCommits {
		previousHash := ""
		if len(lakeFSCommit.Parents) > 0 {
			previousHash = lakeFSCommit.Parents[0]
		}
		author := lakeFSCommit.Committer
		if authorValue, ok := lakeFSCommit.Metadata["author"]; ok && authorValue != "" {
			author = authorValue
		}
		irminCommits[i] = irminModels.Commit{
			Hash:         lakeFSCommit.ID,
			Message:      lakeFSCommit.Message,
			Timestamp:    time.Unix(int64(lakeFSCommit.CreationDate), 0).Format(time.RFC3339),
			Author:       author,
			PreviousHash: &previousHash,
		}
	}
	irminDiff := &irminModels.Diff{
		Repository: repository,
		BaseRef:    baseRef,
		CompareRef: compareRef,
		Items:      irminChangeItems,
		Commits:    &irminCommits,
	}

	return irminDiff, nil
}

func (c *Client) MergeRefs(workspace, repository, baseRef, compareRef, message, author, strategy string, squash, allowEmpty bool) (*irminModels.Commit, error) {
	// Create LakeFS client.
	lakefsClient, err := lakefs.CreateClient()
	if err != nil {
		return nil, fmt.Errorf("failed to create LakeFS client: %w", err)
	}

	// Construct repository name.
	lakeFSRepositoryName := utils.GetLakeFSRepositoryName(workspace, repository)

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
	merge, err := lakefsClient.MergeRefs(lakeFSRepositoryName, compareRef, baseRef, *mergeRequest)
	if err != nil {
		return nil, fmt.Errorf("failed to merge refs: %w", err)
	}

	// Get merge commit details.
	lakeFSCommit, err := lakefsClient.GetCommit(lakeFSRepositoryName, merge.Reference)
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
	irminCommit := irminModels.Commit{
		Hash:         lakeFSCommit.ID,
		Message:      lakeFSCommit.Message,
		Timestamp:    time.Unix(int64(lakeFSCommit.CreationDate), 0).Format(time.RFC3339),
		Author:       author,
		PreviousHash: &previousHash,
	}

	return &irminCommit, nil
}
