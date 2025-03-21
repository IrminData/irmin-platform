package dataEngine

import (
	"fmt"
	"net/http"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

func (c *Client) ListBranches(workspace, repository string) ([]irminModels.Branch, error) {
	var data []irminModels.Branch
	// Format the endpoint.
	endpoint := fmt.Sprintf("/workspace/%s/repositories/%s/branches", workspace, repository)
	// Call the API endpoint.
	if err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &data); err != nil {
		return nil, err
	}
	return data, nil
}

func (c *Client) GetBranch(workspace, repository, branch string) (*irminModels.Branch, error) {
	var data irminModels.Branch
	// Format the endpoint.
	endpoint := fmt.Sprintf("/workspace/%s/repositories/%s/branches/%s", workspace, repository, branch)
	// Call the API endpoint.
	if err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &data); err != nil {
		return nil, err
	}
	return &data, nil
}

func (c *Client) CreateBranch(workspace, repository, name, from string, is_immutable bool) (*irminModels.Branch, error) {
	var data irminModels.Branch
	// Format the endpoint.
	endpoint := fmt.Sprintf("/workspace/%s/repositories/%s/branches", workspace, repository)
	// Call the API endpoint.
	if err := c.FetchAPI(RequestOptions{
		Method:        http.MethodPost,
		Endpoint:      endpoint,
		AllowedStatus: []int{http.StatusCreated, http.StatusOK},
		ContentType:   "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"name":         name,
			"from":         from,
			"is_immutable": fmt.Sprintf("%t", is_immutable),
		},
	}, &data); err != nil {
		return nil, err
	}
	return &data, nil
}

func (c *Client) UpdateBranch(workspace, repository, branch, name string, is_immutable bool) (*irminModels.Branch, error) {
	var data irminModels.Branch
	// Format the endpoint.
	endpoint := fmt.Sprintf("/workspace/%s/repositories/%s/branches/%s", workspace, repository, branch)
	// Call the API endpoint.
	if err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    endpoint,
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"name":         name,
			"is_immutable": fmt.Sprintf("%t", is_immutable),
		},
	}, &data); err != nil {
		return nil, err
	}
	return &data, nil
}

func (c *Client) DeleteBranch(workspace, repository, branch string) (*string, error) {
	var message string
	// Format the endpoint.
	endpoint := fmt.Sprintf("/workspace/%s/repositories/%s/branches/%s", workspace, repository, branch)
	// Call the API endpoint.
	if err := c.FetchAPI(RequestOptions{
		Method:   http.MethodDelete,
		Endpoint: endpoint,
	}, &message); err != nil {
		return nil, err
	}
	return &message, nil
}
