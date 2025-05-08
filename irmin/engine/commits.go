package engine

import (
	"fmt"
	"irmin-api/lakefs"
	"irmin-api/utils"
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

func (c *Client) ListCommits(
	workspace, repository, ref string,
	after *string,
	limit *int,
) ([]irminmodels.Commit, *lakefs.Pagination, error) {
	// Construct repository name.
	lakeFSRepositoryName := utils.GetLakeFSRepositoryName(workspace, repository)

	// If the "ref" query param is not provided, get the repository's default branch.
	if ref == "" {
		repository, err := c.LakeFSClient.GetRepository(lakeFSRepositoryName)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to get repository: %w", err)
		}
		ref = repository.DefaultBranch
	}

	// Fetch commits
	var lakefsCommits []lakefs.Commit
	var pagination *lakefs.Pagination
	var err error
	if after != nil && limit != nil {
		lakefsCommitList, err := c.LakeFSClient.ListCommits(lakeFSRepositoryName, ref, *after, "", "", *limit, nil, nil)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to list commits: %w", err)
		}
		lakefsCommits = lakefsCommitList.Results
		pagination = &lakefsCommitList.Pagination
	} else {
		lakefsCommits, err = c.LakeFSClient.ListAllCommits(lakeFSRepositoryName, ref, "", "", "", nil, nil)
	}
	if err != nil {
		return nil, nil, fmt.Errorf("failed to list commits: %w", err)
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
	lakeFSRepositoryName := utils.GetLakeFSRepositoryName(workspace, repository)

	// Get commit details.
	lakeFSCommit, err := c.LakeFSClient.GetCommit(lakeFSRepositoryName, hash)
	if err != nil {
		return nil, fmt.Errorf("failed to get commit: %w", err)
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
	allow_empty bool,
) (*irminmodels.Commit, error) {
	// Construct repository name.
	lakeFSRepositoryName := utils.GetLakeFSRepositoryName(workspace, repository)

	// Commit changes in the repository.
	lakeFSCommit, err := c.LakeFSClient.CreateCommit(lakeFSRepositoryName, branch, "", lakefs.CommitCreateRequest{
		Message: message,
		Metadata: map[string]string{
			"author": author,
		},
		Date:       time.Now().Unix(),
		AllowEmpty: allow_empty,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create commit: %w", err)
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
	// Construct repository name.
	lakeFSRepositoryName := utils.GetLakeFSRepositoryName(workspace, repository)

	// Reset the branch.
	resetType := lakefs.PathTypeReset
	if pathType != "" {
		resetType = lakefs.PathType(pathType)
	}
	resetPath := path
	if resetPath == "" {
		resetPath = "/"
	}
	err := c.LakeFSClient.ResetBranch(lakeFSRepositoryName, branch, lakefs.BranchResetRequest{
		Type: resetType,
		Path: resetPath,
	})
	if err != nil {
		return fmt.Errorf("failed to reset branch: %w", err)
	}

	return nil
}
