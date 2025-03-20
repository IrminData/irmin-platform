package dataEngine

import (
	"fmt"
	"net/http"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

func (c *Client) ListTags(workspace, repository string) ([]irminModels.Tag, error) {
	var data []irminModels.Tag
	// Format the endpoint.
	endpoint := fmt.Sprintf("/workspace/%s/repositories/%s/tags", workspace, repository)
	// Call the API endpoint.
	if err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &data); err != nil {
		return nil, err
	}
	return data, nil
}

func (c *Client) GetTag(workspace, repository, tag string) (*irminModels.Tag, error) {
	var data irminModels.Tag
	// Format the endpoint.
	endpoint := fmt.Sprintf("/workspace/%s/repositories/%s/tags/%s", workspace, repository, tag)
	// Call the API endpoint.
	if err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &data); err != nil {
		return nil, err
	}
	return &data, nil
}

func (c *Client) CreateTag(workspace, repository, name, ref string) (*irminModels.Tag, error) {
	var data irminModels.Tag
	// Format the endpoint.
	endpoint := fmt.Sprintf("/workspace/%s/repositories/%s/tags", workspace, repository)
	// Call the API endpoint.
	if err := c.FetchAPI(RequestOptions{
		Method:   http.MethodPost,
		Endpoint: endpoint,
		FormFields: map[string]string{
			"name": name,
			"ref":  ref,
		},
	}, &data); err != nil {
		return nil, err
	}
	return &data, nil
}

func (c *Client) DeleteTag(workspace, repository, tag string) error {
	// Format the endpoint.
	endpoint := fmt.Sprintf("/workspace/%s/repositories/%s/tags/%s", workspace, repository, tag)
	// Call the API endpoint.
	if err := c.FetchAPI(RequestOptions{
		Method:   http.MethodDelete,
		Endpoint: endpoint,
	}, nil); err != nil {
		return err
	}
	return nil
}
