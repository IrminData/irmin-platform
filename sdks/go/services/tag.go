package services

import (
	"fmt"
	"irmin-sdk/client"
	"irmin-sdk/models"
	"net/http"
	"net/url"
	"strings"
)

// TagService handles repository tag-related API calls
type TagService struct {
	client *client.Client
}

// NewTagService creates a new TagService
func NewTagService(client *client.Client) *TagService {
	return &TagService{
		client: client,
	}
}

// FetchTags retrieves all tags for a specific repository
func (s *TagService) FetchTags(repository string) ([]models.Tag, *client.IrminAPIResponse, error) {
	endpoint := fmt.Sprintf("/v1/repositories/%s/tags", repository)
	var tags []models.Tag

	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &tags)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch tags error: %w", err)
	}
	return tags, apiResp, nil
}

// FetchTag retrieves a single tag by its ID
func (s *TagService) FetchTag(repository, tag string) (*models.Tag, *client.IrminAPIResponse, error) {
	endpoint := fmt.Sprintf("/v1/repositories/%s/tags/%s", repository, tag)
	var tagDetails models.Tag

	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &tagDetails)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch tag error: %w", err)
	}
	return &tagDetails, apiResp, nil
}

// CreateTag creates a new tag in the specified repository
func (s *TagService) CreateTag(repository, name, ref string) (*models.Tag, *client.IrminAPIResponse, error) {
	endpoint := fmt.Sprintf("/v1/repositories/%s/tags", repository)
	form := url.Values{}
	form.Set("name", name)
	form.Set("ref", ref)
	var newTag models.Tag

	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    endpoint,
		ContentType: "application/x-www-form-urlencoded",
		Body:        strings.NewReader(form.Encode()),
	}, &newTag)
	if err != nil {
		return nil, nil, fmt.Errorf("create tag error: %w", err)
	}
	return &newTag, apiResp, nil
}

// UpdateTag updates the name or ref of an existing tag
func (s *TagService) UpdateTag(repository, tag, name, ref string) (*models.Tag, *client.IrminAPIResponse, error) {
	endpoint := fmt.Sprintf("/v1/repositories/%s/tags/%s", repository, tag)
	form := url.Values{}
	form.Set("_method", "PATCH")
	if name != "" {
		form.Set("name", name)
	}
	if ref != "" {
		form.Set("ref", ref)
	}
	var updatedTag models.Tag

	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    endpoint,
		ContentType: "application/x-www-form-urlencoded",
		Body:        strings.NewReader(form.Encode()),
	}, &updatedTag)
	if err != nil {
		return nil, nil, fmt.Errorf("update tag error: %w", err)
	}
	return &updatedTag, apiResp, nil
}

// DeleteTag deletes a tag from the repository
func (s *TagService) DeleteTag(repository, tag string) (*client.IrminAPIResponse, error) {
	endpoint := fmt.Sprintf("/v1/repositories/%s/tags/%s", repository, tag)
	form := url.Values{}
	form.Set("_method", "DELETE")

	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    endpoint,
		ContentType: "application/x-www-form-urlencoded",
		Body:        strings.NewReader(form.Encode()),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete tag error: %w", err)
	}
	return apiResp, nil
}
