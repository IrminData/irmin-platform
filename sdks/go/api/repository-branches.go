package irmincore

import (
	"context"
	"fmt"
	"net/http"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
)

// CreateBranchRequest represents the JSON request body for creating a branch.
type CreateBranchRequest struct {
	Name        string `json:"name"                   validate:"required" example:"feature/add-customer-data"`
	From        string `json:"from"                   validate:"required" example:"main"`
	IsImmutable bool   `json:"is_immutable,omitempty"                     example:"false"`
}

// UpdateBranchRequest represents the JSON request body for updating a branch.
type UpdateBranchRequest struct {
	Name        *string `json:"name,omitempty"         example:"feature/add-customer-data"`
	IsImmutable *bool   `json:"is_immutable,omitempty" example:"false"`
}

// ResetBranchRequest represents the JSON request body for resetting a branch to a specific commit.
type ResetBranchRequest struct {
	CommitRef string `json:"commit_ref"      validate:"required" example:"abc123def456"`
	Force     bool   `json:"force,omitempty"                     example:"false"`
}

// RevertCommitRequest represents the JSON request body for reverting a commit.
// This creates a new commit that undoes the changes from the specified commit.
type RevertCommitRequest struct {
	CommitRef    string `json:"commit_ref"              validate:"required" example:"abc123def456"`
	ParentNumber *int   `json:"parent_number,omitempty"                     example:"0"`
}

func (c *Client) ListBranches(
	ctx context.Context,
	workspace, repository string,
) ([]irminmodels.Branch, *irminmodels.IrminAPIResponse, error) {
	var branches []irminmodels.Branch
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/repositories/%s/branches", workspace, repository),
	}, &branches)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch branches error: %w", err)
	}
	return branches, apiResp, nil
}

func (c *Client) GetBranch(
	ctx context.Context,
	workspace, repository, branchName string,
) (*irminmodels.Branch, *irminmodels.IrminAPIResponse, error) {
	var branch irminmodels.Branch
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/repositories/%s/branches/%s", workspace, repository, branchName),
	}, &branch)
	if err != nil {
		return &branch, nil, fmt.Errorf("fetch branch error: %w", err)
	}
	return &branch, apiResp, nil
}

// CreateBranch creates a new branch in the repository.
func (c *Client) CreateBranch(
	ctx context.Context,
	workspace, repository string,
	req CreateBranchRequest,
) (*irminmodels.Branch, *irminmodels.IrminAPIResponse, error) {
	var branch irminmodels.Branch
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/repositories/%s/branches", workspace, repository),
		ContentType: "application/json",
		Body:        req,
	}, &branch)
	if err != nil {
		return nil, nil, fmt.Errorf("create branch error: %w", err)
	}

	return &branch, apiResp, nil
}

// DeleteBranch deletes a branch in the repository.
func (c *Client) DeleteBranch(
	ctx context.Context,
	workspace, repository, branch string,
) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodDelete,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/repositories/%s/branches/%s", workspace, repository, branch),
		ContentType: "application/x-www-form-urlencoded",
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete branch error: %w", err)
	}

	return apiResp, nil
}

// UpdateBranch updates a branch name in the repository.
func (c *Client) UpdateBranch(
	ctx context.Context,
	workspace, repository, oldName string,
	req UpdateBranchRequest,
) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPatch,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/repositories/%s/branches/%s", workspace, repository, oldName),
		ContentType: "application/json",
		Body:        req,
	}, nil)

	if err != nil {
		return nil, fmt.Errorf("failed to update branch, status code: %w", err)
	}

	return apiResp, nil
}

// GetUncommittedChanges retrieves the list of uncommitted changes in a branch.
func (c *Client) GetUncommittedChanges(
	ctx context.Context,
	workspace, repository, branch string,
) (*irminmodels.Diff, *irminmodels.IrminAPIResponse, error) {
	var diff irminmodels.Diff
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/repositories/%s/branches/%s/changes", workspace, repository, branch),
	}, &diff)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch uncommitted changes error: %w", err)
	}
	return &diff, apiResp, nil
}

// ResetBranch resets a branch to a specific commit reference.
// This performs a hard reset, moving the branch pointer to the specified commit.
// If force is true, uncommitted changes will be discarded.
func (c *Client) ResetBranch(
	ctx context.Context,
	workspace, repository, branch string,
	req ResetBranchRequest,
) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/repositories/%s/branches/%s/reset", workspace, repository, branch),
		ContentType: "application/json",
		Body:        req,
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("reset branch error: %w", err)
	}
	return apiResp, nil
}

// RevertCommit reverts a commit on a branch by creating a new commit that undoes its changes.
// This is a non-destructive operation that preserves history.
// ParentNumber is used for merge commits to specify which parent to follow (0 = first parent).
func (c *Client) RevertCommit(
	ctx context.Context,
	workspace, repository, branch string,
	req RevertCommitRequest,
) (*irminmodels.Commit, *irminmodels.IrminAPIResponse, error) {
	var commit irminmodels.Commit
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/repositories/%s/branches/%s/revert", workspace, repository, branch),
		ContentType: "application/json",
		Body:        req,
	}, &commit)
	if err != nil {
		return nil, nil, fmt.Errorf("revert commit error: %w", err)
	}
	return &commit, apiResp, nil
}
