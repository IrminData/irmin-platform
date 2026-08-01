package engine

import (
	"errors"
	"fmt"
	"irmin-api/db"
	"irmin-api/lakefs"
	"irmin-api/utils"
	"time"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	"gorm.io/gorm"
)

func (c *Client) ListCommits(
	workspace, repository, ref string,
	after *string,
	limit *int,
) ([]irminmodels.Commit, *lakefs.Pagination, error) {
	// Construct repository name.
	lakeFSRepositoryName := utils.ConstructLakeFSRepositoryName(workspace, repository)

	// If the "ref" query param is not provided, get the repository's default branch.
	if ref == "" {
		repository, getRepositoryErr := c.LakeFSClient.GetRepository(lakeFSRepositoryName)
		if getRepositoryErr != nil {
			return nil, nil, fmt.Errorf("failed to get repository: %w", getRepositoryErr)
		}
		ref = repository.DefaultBranch
	}

	// Fetch commits
	var lakefsCommits []lakefs.Commit
	var pagination *lakefs.Pagination
	var listAllCommitsErr error
	if after != nil && limit != nil {
		lakefsCommitList, listCommitsErr := c.LakeFSClient.ListCommits(
			lakeFSRepositoryName,
			ref,
			*after,
			"",
			"",
			*limit,
			nil,
			nil,
		)
		if listCommitsErr != nil {
			return nil, nil, fmt.Errorf("failed to list commits: %w", listCommitsErr)
		}
		lakefsCommits = lakefsCommitList.Results
		pagination = &lakefsCommitList.Pagination
	} else {
		lakefsCommits, listAllCommitsErr = c.LakeFSClient.ListAllCommits(lakeFSRepositoryName, ref, "", "", "", nil, nil)
	}
	if listAllCommitsErr != nil {
		return nil, nil, fmt.Errorf("failed to list commits: %w", listAllCommitsErr)
	}

	// Convert LakeFS commits to Irmin commits.
	irminCommits := make([]irminmodels.Commit, len(lakefsCommits))
	for i, lakeFSCommit := range lakefsCommits {
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

	return irminCommits, pagination, nil
}

func (c *Client) GetCommit(workspace, repository, hash string) (*irminmodels.Commit, error) {
	// Construct repository name.
	lakeFSRepositoryName := utils.ConstructLakeFSRepositoryName(workspace, repository)

	// Get commit details.
	lakeFSCommit, getCommitErr := c.LakeFSClient.GetCommit(lakeFSRepositoryName, hash)
	if getCommitErr != nil {
		return nil, fmt.Errorf("failed to get commit: %w", getCommitErr)
	}

	// Convert LakeFS commit to Irmin commit.
	previousHash := ""
	if len(lakeFSCommit.Parents) > 0 {
		previousHash = lakeFSCommit.Parents[0]
	}
	author := lakeFSCommit.Committer
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

func (c *Client) CommitChanges(
	workspace, repository, branch, message, author string,
	allowEmpty bool,
) (*irminmodels.Commit, error) {
	// Create a lock key based on workspace, repository, and branch to prevent race conditions
	lockKey := fmt.Sprintf("commit_changes:%s:%s:%s", workspace, repository, branch)

	// Execute the entire operation within a database transaction with advisory lock
	var result *irminmodels.Commit
	transactionErr := c.DB.Transaction(func(tx *gorm.DB) error {
		// Acquire advisory lock to prevent concurrent commits to the same branch
		if lockErr := db.LockKeyTx(tx, lockKey); lockErr != nil {
			return fmt.Errorf("failed to acquire advisory lock for commit to branch %s: %w", branch, lockErr)
		}

		// Process the commit
		var processErr error
		result, processErr = c.commitChangesInternal(workspace, repository, branch, message, author, allowEmpty)
		return processErr
	})

	if transactionErr != nil {
		return nil, transactionErr
	}

	return result, nil
}

// commitChangesInternal contains the core commit logic, separated for clarity.
func (c *Client) commitChangesInternal(
	workspace, repository, branch, message, author string,
	allowEmpty bool,
) (*irminmodels.Commit, error) {
	// Construct repository name.
	lakeFSRepositoryName := utils.ConstructLakeFSRepositoryName(workspace, repository)

	// Commit changes in the repository.
	lakeFSCommit, createCommitErr := c.LakeFSClient.CreateCommit(
		lakeFSRepositoryName,
		branch,
		"",
		lakefs.CommitCreateRequest{
			Message: message,
			Metadata: map[string]string{
				"author": author,
			},
			Date:       time.Now().Unix(),
			AllowEmpty: allowEmpty,
		},
	)
	if createCommitErr != nil {
		return nil, fmt.Errorf("failed to create commit: %w", createCommitErr)
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

func (c *Client) RevertUncommitedChanges(workspace, repository, branch, path, pathType string) error {
	// Create a lock key based on workspace, repository, and branch to prevent race conditions
	lockKey := fmt.Sprintf("revert_changes:%s:%s:%s", workspace, repository, branch)

	// Execute the entire operation within a database transaction with advisory lock
	transactionErr := c.DB.Transaction(func(tx *gorm.DB) error {
		// Acquire advisory lock to prevent concurrent reverts on the same branch
		if lockErr := db.LockKeyTx(tx, lockKey); lockErr != nil {
			return fmt.Errorf("failed to acquire advisory lock for revert on branch %s: %w", branch, lockErr)
		}

		// Process the revert
		return c.revertUncommitedChangesInternal(workspace, repository, branch, path, pathType)
	})

	return transactionErr
}

// revertUncommitedChangesInternal contains the core revert logic, separated for clarity.
func (c *Client) revertUncommitedChangesInternal(workspace, repository, branch, path, pathType string) error {
	// Construct repository name.
	lakeFSRepositoryName := utils.ConstructLakeFSRepositoryName(workspace, repository)

	// Reset the branch.
	resetType := lakefs.PathTypeReset
	if pathType != "" {
		resetType = lakefs.PathType(pathType)
	}
	resetPath := path
	if resetPath == "" {
		resetPath = "/"
	}
	resetBranchErr := c.LakeFSClient.ResetBranch(lakeFSRepositoryName, branch, lakefs.BranchResetRequest{
		Type: resetType,
		Path: resetPath,
	})
	if resetBranchErr != nil {
		return fmt.Errorf("failed to reset branch: %w", resetBranchErr)
	}

	return nil
}

// RevertCommit creates a new commit that undoes the changes from a specified commit.
// This is a non-destructive operation that preserves history.
// parentNumber is used for merge commits to specify which parent to follow (1-indexed, 0 means use default).
func (c *Client) RevertCommit(
	workspace, repository, branch, commitRef string,
	parentNumber int,
) (*irminmodels.Commit, error) {
	// Use the same lock key as CommitChanges since both operations modify the branch.
	// This prevents a race where another commit could occur between RevertBranch and
	// ListCommits (which fetches the revert commit since LakeFS doesn't return it).
	lockKey := fmt.Sprintf("commit_changes:%s:%s:%s", workspace, repository, branch)

	// Execute the entire operation within a database transaction with advisory lock
	var result *irminmodels.Commit
	transactionErr := c.DB.Transaction(func(tx *gorm.DB) error {
		// Acquire advisory lock to prevent concurrent commits/reverts on the same branch
		if lockErr := db.LockKeyTx(tx, lockKey); lockErr != nil {
			return fmt.Errorf("failed to acquire advisory lock for revert on branch %s: %w", branch, lockErr)
		}

		// Process the revert
		var processErr error
		result, processErr = c.revertCommitInternal(workspace, repository, branch, commitRef, parentNumber)
		return processErr
	})

	if transactionErr != nil {
		return nil, transactionErr
	}

	return result, nil
}

// revertCommitInternal contains the core revert commit logic, separated for clarity.
func (c *Client) revertCommitInternal(
	workspace, repository, branch, commitRef string,
	parentNumber int,
) (*irminmodels.Commit, error) {
	// Construct repository name.
	lakeFSRepositoryName := utils.ConstructLakeFSRepositoryName(workspace, repository)

	// Revert the commit by creating a new commit that undoes its changes
	revertErr := c.LakeFSClient.RevertBranch(lakeFSRepositoryName, branch, lakefs.BranchRevertRequest{
		Ref:          commitRef,
		ParentNumber: parentNumber,
	})
	if revertErr != nil {
		return nil, fmt.Errorf("failed to revert commit: %w", revertErr)
	}

	// Get the latest commit on the branch (the revert commit)
	// Use limit=1 to fetch only the most recent commit, avoiding pagination of entire history
	limitOne := 1
	latestCommits, _, err := c.ListCommits(workspace, repository, branch, nil, &limitOne)
	if err != nil {
		return nil, fmt.Errorf("failed to get revert commit: %w", err)
	}

	if len(latestCommits) == 0 {
		return nil, errors.New("no commits found after revert")
	}

	return &latestCommits[0], nil
}

// GetCommitDiff returns the diff for a commit compared to its parent.
// If the commit has no parent (initial commit), it returns all files as added.
func (c *Client) GetCommitDiff(workspace, repository, commitHash string) ([]lakefs.Diff, error) {
	// Construct repository name.
	lakeFSRepositoryName := utils.ConstructLakeFSRepositoryName(workspace, repository)

	// Get commit to find its parent.
	lakeFSCommit, err := c.LakeFSClient.GetCommit(lakeFSRepositoryName, commitHash)
	if err != nil {
		return nil, fmt.Errorf("failed to get commit: %w", err)
	}

	// If commit has no parent (initial commit), use empty tree as base
	if len(lakeFSCommit.Parents) == 0 {
		// For initial commits, we can't easily diff - return empty
		// The caller can handle this by fetching all files in the commit
		return []lakefs.Diff{}, nil
	}

	// Diff between parent and this commit
	parentHash := lakeFSCommit.Parents[0]
	diffs, err := c.LakeFSClient.ListAllRefDiffs(lakeFSRepositoryName, parentHash, commitHash, "", "")
	if err != nil {
		return nil, fmt.Errorf("failed to get commit diff: %w", err)
	}

	return diffs, nil
}
