package irminCore

import (
	"fmt"
	"net/http"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

func (c *Client) ListCommits(workspace, repository, ref string) ([]irminModels.Commit, *irminModels.IrminAPIResponse, error) {
	var commits []irminModels.Commit
	endpoint := fmt.Sprintf("/v1/workspaces/%s/repositories/%s/commits", workspace, repository)
	if ref != "" {
		endpoint += fmt.Sprintf("?ref=%s", ref)
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

func (c *Client) GetCommit(workspace, repository, hash string) (*irminModels.Commit, *irminModels.IrminAPIResponse, error) {
	var commit irminModels.Commit
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/repositories/%s/commits/%s", workspace, repository, hash),
	}, &commit)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch commit error: %w", err)
	}
	return &commit, apiResp, nil
}

func (c *Client) CreateCommit(workspace, repository, branch, message string) (*irminModels.Commit, *irminModels.IrminAPIResponse, error) {
	var commit irminModels.Commit
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

func (c *Client) RevertChanges(workspace, repository, branch, pathType, path string) (*irminModels.IrminAPIResponse, error) {
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
