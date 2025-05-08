package lakefs

import (
	"fmt"
	"net/http"
)

// Branch represents a branch in a  repository.
type Branch struct {
	ID       string `json:"id"`
	CommitID string `json:"commit_id"`
}

// BranchList represents the response when listing branches.
type BranchList struct {
	Pagination Pagination `json:"pagination"`
	Results    []Branch   `json:"results"`
}

// BranchProtectionRule represents a protection rule for a branch. Protected branches cannot be modified.
type BranchProtectionRule struct {
	Pattern string `json:"pattern"`
}

// BranchCreateRequest represents the request payload to create a repository branch.
type BranchCreateRequest struct {
	Name   string `json:"name"`
	Source string `json:"source"`
	Force  bool   `json:"force,omitempty"`
	Hidden bool   `json:"hidden,omitempty"`
}

// BranchResetRequest represents the request payload to reset a repository branch.
type BranchResetRequest struct {
	Type  PathType `json:"type"` // What to reset according to path.
	Path  string   `json:"path,omitempty"`
	Force bool     `json:"force,omitempty"`
}

// CommitOverrides represents the commit overrides for a branch reset or revert.
type CommitOverrides struct {
	Message  string            `json:"message"`
	Metadata map[string]string `json:"metadata"`
}

// BranchRevertRequest represents the request payload to revert a repository branch.
type BranchRevertRequest struct {
	Ref             string          `json:"ref"` // The commit to revert, given by a ref
	CommitOverrides CommitOverrides `json:"commit_overrides,omitempty"`
	ParentNumber    int             `json:"parent_number"` // when reverting a merge commit, the parent number (starting from 1) relative to which to perform the revert.
	Force           bool            `json:"force,omitempty"`
	AllowEmpty      bool            `json:"allow_empty,omitempty"`
}

// CherryPickRequest represents the cherry-pick creation request.
type CherryPickRequest struct {
	Ref             string          `json:"ref"`           // The commit to cherry-pick, given by a ref
	ParentCommit    int             `json:"parent_commit"` // When cherry-picking a merge commit, the parent number (starting from 1) with which to perform the diff. The default branch is parent 1.
	CommitOverrides CommitOverrides `json:"commit_overrides,omitempty"`
	Force           bool            `json:"force,omitempty"`
}

// GetBranch fetches a single repository branch by its ID.
func (c *Client) GetBranch(repositoryID, branchID string) (*Branch, error) {
	var branch Branch
	endpoint := fmt.Sprintf("/repositories/%s/branches/%s", repositoryID, branchID)
	if err := c.doRequest("GET", endpoint, nil, []int{http.StatusOK}, &branch); err != nil {
		return nil, err
	}
	return &branch, nil
}

// ListBranches retrieves a single page of branches for a given repository.
func (c *Client) ListBranches(repositoryID, prefix, after string, amount int, show_hidden bool) (*BranchList, error) {
	endpoint := fmt.Sprintf(
		"/repositories/%s/branches?prefix=%s&after=%s&amount=%d&show_hidden=%t",
		repositoryID,
		prefix,
		after,
		amount,
		show_hidden,
	)
	var listResp BranchList
	if err := c.doRequest("GET", endpoint, nil, []int{http.StatusOK}, &listResp); err != nil {
		return nil, err
	}
	return &listResp, nil
}

// ListAllBranches handles pagination automatically and returns all branches for a repository.
func (c *Client) ListAllBranches(repositoryID, prefix string, show_hidden bool) ([]Branch, error) {
	var allBranches []Branch
	after := ""
	for {
		branches, err := c.ListBranches(repositoryID, prefix, after, 100, show_hidden)
		if err != nil {
			return nil, err
		}
		allBranches = append(allBranches, branches.Results...)
		if !branches.Pagination.HasMore {
			break
		}
		after = branches.Pagination.NextOffset
	}
	return allBranches, nil
}

// CreateBranch creates a new repository branch using the provided request data.
func (c *Client) CreateBranch(repositoryID string, reqData BranchCreateRequest) error {
	endpoint := fmt.Sprintf("/repositories/%s/branches", repositoryID)
	return c.doRequest("POST", endpoint, reqData, []int{http.StatusCreated}, nil)
}

// DeleteBranch deletes a repository branch by its ID.
func (c *Client) DeleteBranch(repositoryID, branchID string) error {
	endpoint := fmt.Sprintf("/repositories/%s/branches/%s", repositoryID, branchID)
	return c.doRequest("DELETE", endpoint, nil, []int{http.StatusOK, http.StatusNoContent}, nil)
}

// GetBranchProtectionRules returns the protection rules for branches in a repository.
func (c *Client) GetBranchProtectionRules(repositoryID string) ([]BranchProtectionRule, error) {
	var rules []BranchProtectionRule
	endpoint := fmt.Sprintf("/repositories/%s/settings/branch_protection", repositoryID)
	if err := c.doRequest("GET", endpoint, nil, []int{http.StatusOK}, &rules); err != nil {
		return nil, err
	}
	return rules, nil
}

// SetBranchProtectionRules sets the protection rules for branches in a repository.
func (c *Client) SetBranchProtectionRules(repositoryID string, rules []BranchProtectionRule) error {
	endpoint := fmt.Sprintf("/repositories/%s/settings/branch_protection", repositoryID)
	return c.doRequest("PUT", endpoint, rules, []int{http.StatusOK, http.StatusNoContent}, nil)
}

// ResetBranch resets a repository branch.
func (c *Client) ResetBranch(repositoryID, branchID string, reqData BranchResetRequest) error {
	endpoint := fmt.Sprintf("/repositories/%s/branches/%s", repositoryID, branchID)
	return c.doRequest("PUT", endpoint, reqData, []int{http.StatusOK, http.StatusNoContent}, nil)
}

// HardResetBranch will relocate branch to refer to ref. Branch must not contain uncommitted data.
func (c *Client) HardResetBranch(repositoryID, branchID, ref string, force bool) error {
	endpoint := fmt.Sprintf(
		"/repositories/%s/branches/%s/hard_reset?ref=%s&force=%t",
		repositoryID,
		branchID,
		ref,
		force,
	)
	return c.doRequest("PUT", endpoint, nil, []int{http.StatusOK, http.StatusNoContent}, nil)
}

// RevertBranch reverts a repository branch.
func (c *Client) RevertBranch(repositoryID, branchID string, reqData BranchRevertRequest) error {
	endpoint := fmt.Sprintf("/repositories/%s/branches/%s/revert", repositoryID, branchID)
	return c.doRequest("POST", endpoint, reqData, []int{http.StatusOK, http.StatusNoContent}, nil)
}

// BranchCherryPick allows to replay the changes of a commit on a branch.
func (c *Client) BranchCherryPick(repositoryID, branchID string, reqData CherryPickRequest) (*Commit, error) {
	var commit Commit
	endpoint := fmt.Sprintf("/repositories/%s/branches/%s/cherry-pick", repositoryID, branchID)
	if err := c.doRequest("POST", endpoint, reqData, []int{http.StatusOK, http.StatusCreated}, &commit); err != nil {
		return nil, err
	}
	return &commit, nil
}

// GetBranchDiffs returns the differences between a branch and the base.
func (c *Client) GetBranchDiffs(
	repositoryID, branchID, after, prefix, delimiter string,
	amount int,
) (*DiffList, error) {
	var diffs DiffList
	endpoint := fmt.Sprintf(
		"/repositories/%s/branches/%s/diff?after=%s&prefix=%s&delimiter=%s&amount=%d",
		repositoryID,
		branchID,
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

// ListAllBranchDiffs handles pagination automatically and returns all diffs for a branch.
func (c *Client) ListAllBranchDiffs(repositoryID, branchID string) ([]Diff, error) {
	var allDiffs []Diff
	after := ""
	for {
		diffs, err := c.GetBranchDiffs(repositoryID, branchID, after, "", "", 100)
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
