package dataEngine

import (
	"fmt"
	"net/http"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

func (c *Client) ListCommits(workspace, repository, ref string) ([]irminModels.Commit, error) {
	var data []irminModels.Commit
	// Format the endpoint.
	endpoint := fmt.Sprintf("/workspace/%s/repositories/%s/commits?ref=%s", workspace, repository, ref)
	// Call the API endpoint.
	if err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &data); err != nil {
		return nil, err
	}
	return data, nil
}

func (c *Client) GetCommit(workspace, repository, hash string) (*irminModels.Commit, error) {
	var data irminModels.Commit
	// Format the endpoint.
	endpoint := fmt.Sprintf("/workspace/%s/repositories/%s/commits/%s", workspace, repository, hash)
	// Call the API endpoint.
	if err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &data); err != nil {
		return nil, err
	}
	return &data, nil
}

func (c *Client) CommitChanges(workspace, repository, branch, message, author string, allow_empty bool) (*irminModels.Commit, error) {
	var data irminModels.Commit
	// Format the endpoint.
	endpoint := fmt.Sprintf("/workspace/%s/repositories/%s/commits", workspace, repository)
	// Call the API endpoint.
	if err := c.FetchAPI(RequestOptions{
		Method:        http.MethodPost,
		Endpoint:      endpoint,
		AllowedStatus: []int{http.StatusCreated, http.StatusOK},
		ContentType:   "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"branch":      branch,
			"message":     message,
			"author":      author,
			"allow_empty": fmt.Sprintf("%t", allow_empty),
		},
	}, &data); err != nil {
		return nil, err
	}
	return &data, nil
}

func (c *Client) RevertUncommitedChanges(workspace, repository, branch, path, pathType string) error {
	// Format the endpoint.
	endpoint := fmt.Sprintf("/workspace/%s/repositories/%s/commits/revert", workspace, repository)
	// Call the API endpoint.
	if err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    endpoint,
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"branch": branch,
			"path":   path,
			"type":   pathType,
		},
	}, nil); err != nil {
		return err
	}
	return nil
}
