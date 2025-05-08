package irmincore

import (
	"fmt"
	"net/http"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

func (c *Client) ListCommits(
	workspace, repository, ref, after string,
	perPage int,
) ([]irminmodels.Commit, *irminmodels.IrminAPIResponse, error) {
	var commits []irminmodels.Commit
	endpoint := fmt.Sprintf(
		"/v1/workspaces/%s/repositories/%s/commits?per_page=%d&after=%s",
		workspace,
		repository,
		perPage,
		after,
	)
	if ref != "" {
		endpoint += fmt.Sprintf("&ref=%s", ref)
	}

	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &commits)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch commits error: %w", err)
	}
	return commits, apiResp, nil
}

func (c *Client) GetCommit(
	workspace, repository, hash string,
) (*irminmodels.Commit, *irminmodels.IrminAPIResponse, error) {
	var commit irminmodels.Commit
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/repositories/%s/commits/%s", workspace, repository, hash),
	}, &commit)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch commit error: %w", err)
	}
	return &commit, apiResp, nil
}

func (c *Client) CreateCommit(
	workspace, repository, branch, message string,
) (*irminmodels.Commit, *irminmodels.IrminAPIResponse, error) {
	var commit irminmodels.Commit
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/repositories/%s/commits", workspace, repository),
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"branch":  branch,
			"message": message,
		},
	}, &commit)
	if err != nil {
		return nil, nil, fmt.Errorf("create commit error: %w", err)
	}
	return &commit, apiResp, nil
}

func (c *Client) RevertChanges(
	workspace, repository, branch, pathType, path string,
) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/repositories/%s/commits/revert", workspace, repository),
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"branch":    branch,
			"path":      path,
			"path_type": pathType,
		},
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("revert uncommitted changes error: %w", err)
	}
	return apiResp, nil
}
