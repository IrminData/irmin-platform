package irminCore

import (
	"fmt"
	"net/http"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

// TagService handles repository tag-related API calls
type TagService struct {
	client *Client
}

// NewTagService creates a new TagService
func NewTagService(client *Client) *TagService {
	return &TagService{
		client: client,
	}
}

func (s *TagService) ListTags(workspace, repository string) ([]irminModels.Tag, *irminModels.IrminAPIResponse, error) {
	var tags []irminModels.Tag
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/repositories/%s/tags", workspace, repository),
	}, &tags)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch tags error: %w", err)
	}
	return tags, apiResp, nil
}

func (s *TagService) GetTag(workspace, repository, tag string) (*irminModels.Tag, *irminModels.IrminAPIResponse, error) {
	var tagObj irminModels.Tag
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/repositories/%s/tags/%s", workspace, repository, tag),
	}, &tagObj)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch tag error: %w", err)
	}
	return &tagObj, apiResp, nil
}

func (s *TagService) CreateTag(workspace, repository, tag, ref string) (*irminModels.Tag, *irminModels.IrminAPIResponse, error) {
	var tagObj irminModels.Tag
	apiResp, err := s.client.FetchAPI(RequestOptions{
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

func (s *TagService) DeleteTag(workspace, repository, tag string) (*irminModels.IrminAPIResponse, error) {
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodDelete,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/repositories/%s/tags/%s", workspace, repository, tag),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete tag error: %w", err)
	}
	return apiResp, nil
}
