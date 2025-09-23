package irmincore

import (
	"fmt"
	"net/http"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// CreateCommitRequest represents the JSON request body for creating a commit.
type CreateCommitRequest struct {
	Branch  string `json:"branch"  validate:"required" example:"main"`
	Message string `json:"message" validate:"required" example:"Add customer data"`
}

// RevertUncommittedChangesRequest represents the JSON request body for reverting uncommitted changes.
type RevertUncommittedChangesRequest struct {
	Branch   string `json:"branch"              validate:"required" example:"main"`
	Path     string `json:"path,omitempty"                          example:"path/to/file.txt"`
	PathType string `json:"path_type,omitempty"                     example:"file"`
}

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
	workspace, repository string,
	req CreateCommitRequest,
) (*irminmodels.Commit, *irminmodels.IrminAPIResponse, error) {
	var commit irminmodels.Commit
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/repositories/%s/commits", workspace, repository),
		ContentType: "application/json",
		Body:        req,
	}, &commit)
	if err != nil {
		return nil, nil, fmt.Errorf("create commit error: %w", err)
	}
	return &commit, apiResp, nil
}

func (c *Client) RevertChanges(
	workspace, repository string,
	req RevertUncommittedChangesRequest,
) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/repositories/%s/commits/revert", workspace, repository),
		ContentType: "application/json",
		Body:        req,
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("revert uncommitted changes error: %w", err)
	}
	return apiResp, nil
}
