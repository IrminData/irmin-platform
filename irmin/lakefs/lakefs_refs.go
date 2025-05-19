package lakefs

import (
	"fmt"
	"net/http"
)

// CommitList represents a list of commits in a lakeFS repository.
type CommitList struct {
	Pagination Pagination `json:"pagination"`
	Results    []Commit   `json:"results"`
}

// MergeStrategy represents the strategy to use when resolving a merge conflict.
type MergeStrategy string

const (
	// MergeStrategyNone is used when no selection is made, causing the merge process to fail in case of a conflict.
	MergeStrategyNone MergeStrategy = ""
	// MergeStrategyDestWins favors changes from the destination ref.
	MergeStrategyDestWins MergeStrategy = "dest-wins"
	// MergeStrategySourceWins favors changes from the source ref.
	MergeStrategySourceWins MergeStrategy = "source-wins"
)

// Merge represents a merge operation between two refs.
type Merge struct {
	Message     string            `json:"message"`
	Metadata    map[string]string `json:"metadata,omitempty"`     // Additional metadata to attach to the merge commit
	Strategy    MergeStrategy     `json:"strategy,omitempty"`     // The strategy to use when resolving a merge conflict
	Force       bool              `json:"force,omitempty"`        // Allow merge into a read-only branch or into a branch with the same content
	AllowEmpty  bool              `json:"allow_empty,omitempty"`  // Allow merge when the branches have the same content
	SquashMerge bool              `json:"squash_merge,omitempty"` // Set only the destination branch as a parent, which "squashes" the merge to appear as a single commit on the destination branch. The source commit is no longer a part of the merge commit; consider adding it to the 'metadata' or 'message' fields. This behaves like 'git merge --squash; git commit ...'.
}

// MergeResult represents the result of a merge operation.
type MergeResult struct {
	Reference string `json:"reference"`
}

// MergeBase represents the result of a find merge base operation.
type MergeBase struct {
	// The commit ID of the merge source
	SourceCommitID string `json:"source_commit_id"`
	// The commit ID of the merge destination
	DestinationCommitID string `json:"destination_commit_id"`
	// The commit ID of the merge base
	BaseCommitID string `json:"base_commit_id"`
}

// PathType represents the type of the path in a lakeFS repository.
type PathType string

const (
	PathTypeObject       PathType = "object"
	PathTypeCommonPrefix PathType = "common_prefix"
	PathTypeReset        PathType = "reset" // Reset is a path type used only in branch reset.
)

// DiffType represents the type of the diff.
type DiffType string

const (
	DiffTypeAdded         DiffType = "added"
	DiffTypeRemoved       DiffType = "removed"
	DiffTypeChanged       DiffType = "changed"
	DiffTypeConflict      DiffType = "conflict"
	DiffTypePrefixChanged DiffType = "prefix_changed"
)

// Diff represents a diff between two refs.
type Diff struct {
	Type      DiffType `json:"type"` // Type of the change depicted in the diff.
	Path      string   `json:"path"`
	PathType  PathType `json:"path_type"`  // Type of the path in the diff.
	SizeBytes int64    `json:"size_bytes"` // Represents the size of the added/changed/deleted entry
}

// DiffList represents a list of diffs between two branches.
type DiffList struct {
	Pagination Pagination `json:"pagination"`
	Results    []Diff     `json:"results"`
}

// MergeRefs merges two refs in a repository.
func (c *Client) MergeRefs(repositoryID, sourceRef, destinationBranch string, mergeReq Merge) (*MergeResult, error) {
	var mergeRes MergeResult
	endpoint := fmt.Sprintf("/repositories/%s/refs/%s/merge/%s", repositoryID, sourceRef, destinationBranch)
	if err := c.doRequest("POST", endpoint, mergeReq, []int{http.StatusOK}, &mergeRes); err != nil {
		return nil, err
	}
	return &mergeRes, nil
}

// FindMergeBase finds the merge base between two refs in a repository.
func (c *Client) FindMergeBase(repositoryID, sourceRef, destinationBranch string) (*MergeBase, error) {
	var mergeBase MergeBase
	endpoint := fmt.Sprintf("/repositories/%s/refs/%s/merge/%s", repositoryID, sourceRef, destinationBranch)
	if err := c.doRequest("GET", endpoint, nil, []int{http.StatusOK}, &mergeBase); err != nil {
		return nil, err
	}
	return &mergeBase, nil
}

// ListRefDiffs returns the differences between two refs in a repository.
func (c *Client) ListRefDiffs(
	repositoryID, leftRef, rightRef, after, prefix, delimiter string,
	amount int,
) (*DiffList, error) {
	var diffs DiffList
	endpoint := fmt.Sprintf(
		"/repositories/%s/refs/%s/diff/%s?after=%s&prefix=%s&delimiter=%s&amount=%d",
		repositoryID,
		leftRef,
		rightRef,
		after,
		prefix,
		delimiter,
		amount,
	)
	if err := c.doRequest("GET", endpoint, nil, []int{http.StatusOK}, &diffs); err != nil {
		return nil, err
	}
	return &diffs, nil
}

// ListAllRefDiffs handles pagination automatically and returns all diffs between two refs.
func (c *Client) ListAllRefDiffs(repositoryID, leftRef, rightRef, prefix, delimiter string) ([]Diff, error) {
	var allDiffs []Diff
	after := ""
	for {
		diffs, err := c.ListRefDiffs(repositoryID, leftRef, rightRef, after, prefix, delimiter, DefaultListAmountLimit)
		if err != nil {
			return nil, err
		}
		allDiffs = append(allDiffs, diffs.Results...)
		if !diffs.Pagination.HasMore {
			break
		}
		after = diffs.Pagination.NextOffset
	}
	return allDiffs, nil
}
