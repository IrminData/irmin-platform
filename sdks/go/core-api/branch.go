package irmincore

import (
	"fmt"
	"net/http"
	"strconv"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

func (c *Client) ListBranches(
	workspace, repository string,
) ([]irminmodels.Branch, *irminmodels.IrminAPIResponse, error) {
	var branches []irminmodels.Branch
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/repositories/%s/branches", workspace, repository),
	}, &branches)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch branches error: %w", err)
	}
	return branches, apiResp, nil
}

func (c *Client) GetBranch(
	workspace, repository, branchName string,
) (*irminmodels.Branch, *irminmodels.IrminAPIResponse, error) {
	var branch irminmodels.Branch
	apiResp, err := c.FetchAPI(RequestOptions{
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
	workspace, repository, name, from string,
	isImmutable bool,
) (*irminmodels.Branch, *irminmodels.IrminAPIResponse, error) {
	var branch irminmodels.Branch
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/repositories/%s/branches", workspace, repository),
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"name":         name,
			"from":         from,
			"is_immutable": strconv.FormatBool(isImmutable),
		},
	}, &branch)
	if err != nil {
		return nil, nil, fmt.Errorf("create branch error: %w", err)
	}

	return &branch, apiResp, nil
}

// DeleteBranch deletes a branch in the repository.
func (c *Client) DeleteBranch(workspace, repository, branch string) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(RequestOptions{
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
	workspace, repository, oldName, newName string,
	isImmutable bool,
) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPatch,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/repositories/%s/branches/%s", workspace, repository, oldName),
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"name":         newName,
			"is_immutable": strconv.FormatBool(isImmutable),
		},
	}, nil)

	if err != nil {
		return nil, fmt.Errorf("failed to update branch, status code: %w", err)
	}

	return apiResp, nil
}

// GetUncommittedChanges retrieves the list of uncommitted changes in a branch.
func (c *Client) GetUncommittedChanges(
	workspace, repository, branch string,
) (*irminmodels.Diff, *irminmodels.IrminAPIResponse, error) {
	var diff irminmodels.Diff
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/repositories/%s/branches/%s/changes", workspace, repository, branch),
	}, &diff)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch uncommitted changes error: %w", err)
	}
	return &diff, apiResp, nil
}
