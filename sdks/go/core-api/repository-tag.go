package irmincore

import (
	"fmt"
	"net/http"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

func (c *Client) ListTags(workspace, repository string) ([]irminmodels.GitTag, *irminmodels.IrminAPIResponse, error) {
	var tags []irminmodels.GitTag
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/repositories/%s/tags", workspace, repository),
	}, &tags)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch tags error: %w", err)
	}
	return tags, apiResp, nil
}

func (c *Client) GetTag(workspace, repository, tag string) (*irminmodels.GitTag, *irminmodels.IrminAPIResponse, error) {
	var tagObj irminmodels.GitTag
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/repositories/%s/tags/%s", workspace, repository, tag),
	}, &tagObj)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch tag error: %w", err)
	}
	return &tagObj, apiResp, nil
}

func (c *Client) CreateTag(
	workspace, repository, tag, ref string,
) (*irminmodels.GitTag, *irminmodels.IrminAPIResponse, error) {
	var tagObj irminmodels.GitTag
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/repositories/%s/tags", workspace, repository),
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"name": tag,
			"ref":  ref,
		},
	}, &tagObj)
	if err != nil {
		return nil, nil, fmt.Errorf("create tag error: %w", err)
	}
	return &tagObj, apiResp, nil
}

func (c *Client) DeleteTag(workspace, repository, tag string) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodDelete,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/repositories/%s/tags/%s", workspace, repository, tag),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete tag error: %w", err)
	}
	return apiResp, nil
}
