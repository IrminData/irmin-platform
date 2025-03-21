package dataEngine

import (
	"fmt"
	"net/http"
)

// DataImport imports data into a workspace repository from an external source using a connector.
func (c *Client) DataImport(workspace, connector_token, connector_url, repository, branch, path string) (*string, error) {
	var message string
	// Format the endpoint.
	endpoint := fmt.Sprintf("/workspace/%s/data-movement/import", workspace)
	// Call the API endpoint.
	if err := c.FetchAPI(RequestOptions{
		Method:        http.MethodPost,
		Endpoint:      endpoint,
		AllowedStatus: []int{http.StatusCreated, http.StatusOK},
		ContentType:   "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"connector_token": connector_token,
			"connector_url":   connector_url,
			"repository":      repository,
			"branch":          branch,
			"path":            path,
		},
	}, &message); err != nil {
		return nil, err
	}
	return &message, nil
}

// DataExport exports data from a workspace repository to an external source using a connector.
func (c *Client) DataExport(workspace, connector_token, connector_url, repository, branch, path string) (*string, error) {
	var message string
	endpoint := fmt.Sprintf("/workspace/%s/data-movement/export", workspace)
	if err := c.FetchAPI(RequestOptions{
		Method:        http.MethodPost,
		Endpoint:      endpoint,
		AllowedStatus: []int{http.StatusCreated, http.StatusOK},
		ContentType:   "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"connector_token": connector_token,
			"connector_url":   connector_url,
			"repository":      repository,
			"branch":          branch,
			"path":            path,
		},
	}, &message); err != nil {
		return nil, err
	}
	return &message, nil
}
