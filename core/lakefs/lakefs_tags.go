package lakefs

import (
	"fmt"
	"net/http"
	"net/url"
)

// Tag represents a tag in a  repository.
type Tag struct {
	ID       string `json:"id"`
	CommitID string `json:"commit_id"`
}

// TagList represents the response when listing tags.
type TagList struct {
	Pagination Pagination `json:"pagination"`
	Results    []Tag      `json:"results"`
}

// TagCreateRequest represents the request payload to create a repository tag.
type TagCreateRequest struct {
	ID    string `json:"id"`
	Ref   string `json:"ref"`
	Force bool   `json:"force"`
}

// GetTag fetches a single repository tag by its ID.
func (c *Client) GetTag(repositoryID, tagID string) (*Tag, error) {
	var tag Tag
	endpoint := fmt.Sprintf("/repositories/%s/tags/%s", repositoryID, url.PathEscape(tagID))
	if err := c.doRequest("GET", endpoint, nil, []int{http.StatusOK}, &tag); err != nil {
		return nil, err
	}
	return &tag, nil
}

// ListTags retrieves a single page of tags for a given repository.
// If offset is provided, it is added as a query parameter.
func (c *Client) ListTags(repositoryID, prefix, after string, amount int) (*TagList, error) {
	endpoint := fmt.Sprintf("/repositories/%s/tags?prefix=%s&after=%s&amount=%d", repositoryID, prefix, after, amount)

	var listResp TagList
	if err := c.doRequest("GET", endpoint, nil, []int{http.StatusOK}, &listResp); err != nil {
		return nil, err
	}
	return &listResp, nil
}

// ListAllTags handles pagination automatically and returns all tags for a repository.
func (c *Client) ListAllTags(repositoryID, prefix string) ([]Tag, error) {
	var allTags []Tag
	after := ""
	for {
		tags, err := c.ListTags(repositoryID, prefix, after, DefaultListAmountLimit)
		if err != nil {
			return nil, err
		}
		allTags = append(allTags, tags.Results...)
		if !tags.Pagination.HasMore {
			break
		}
		after = tags.Pagination.NextOffset
	}
	return allTags, nil
}

// CreateTag creates a new repository tag using the provided request data.
func (c *Client) CreateTag(repositoryID string, reqData TagCreateRequest) (*Tag, error) {
	var tag Tag
	endpoint := fmt.Sprintf("/repositories/%s/tags", repositoryID)
	if err := c.doRequest("POST", endpoint, reqData, []int{http.StatusCreated, http.StatusOK}, &tag); err != nil {
		return nil, err
	}
	return &tag, nil
}

// DeleteTag deletes a repository tag by its ID.
func (c *Client) DeleteTag(repositoryID, tagID string) error {
	endpoint := fmt.Sprintf("/repositories/%s/tags/%s", repositoryID, url.PathEscape(tagID))
	return c.doRequest("DELETE", endpoint, nil, []int{http.StatusOK, http.StatusNoContent}, nil)
}
