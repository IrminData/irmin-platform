package irmincore

import (
	"fmt"
	"net/http"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// TagCreateRequest represents the request payload to create a workspace tag.
type TagCreateRequest struct {
	Name        string `json:"name"`
	Color       string `json:"color"`
	Description string `json:"description"`
}

// TagUpdateRequest represents the request payload to update a workspace tag.
type TagUpdateRequest struct {
	Name        string `json:"name"`
	Color       string `json:"color"`
	Description string `json:"description"`
}

// TagEntityRequest represents the request payload to add a tag to an entity.
type TagEntityRequest struct {
	TagID string `json:"tag_id"`
}

// ListWorkspaceTags retrieves all workspace tags for a workspace.
func (c *Client) ListWorkspaceTags(workspace string) ([]irminmodels.Tag, *irminmodels.IrminAPIResponse, error) {
	var tags []irminmodels.Tag
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/tags", workspace),
	}, &tags)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch workspace tags error: %w", err)
	}
	return tags, apiResp, nil
}

// GetWorkspaceTag retrieves a specific workspace tag with all its associated assets.
func (c *Client) GetWorkspaceTag(
	workspace, tagID string,
) (*irminmodels.TagWithAssets, *irminmodels.IrminAPIResponse, error) {
	var tagWithAssets irminmodels.TagWithAssets
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/tags/%s", workspace, tagID),
	}, &tagWithAssets)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch workspace tag error: %w", err)
	}
	return &tagWithAssets, apiResp, nil
}

// CreateWorkspaceTag creates a new workspace tag.
func (c *Client) CreateWorkspaceTag(
	workspace string,
	request TagCreateRequest,
) (*irminmodels.Tag, *irminmodels.IrminAPIResponse, error) {
	var tag irminmodels.Tag
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/tags", workspace),
		ContentType: "application/json",
		Body:        request,
	}, &tag)
	if err != nil {
		return nil, nil, fmt.Errorf("create workspace tag error: %w", err)
	}
	return &tag, apiResp, nil
}

// UpdateWorkspaceTag updates an existing workspace tag.
func (c *Client) UpdateWorkspaceTag(
	workspace, tagID string,
	request TagUpdateRequest,
) (*irminmodels.Tag, *irminmodels.IrminAPIResponse, error) {
	var tag irminmodels.Tag
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPatch,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/tags/%s", workspace, tagID),
		ContentType: "application/json",
		Body:        request,
	}, &tag)
	if err != nil {
		return nil, nil, fmt.Errorf("update workspace tag error: %w", err)
	}
	return &tag, apiResp, nil
}

// DeleteWorkspaceTag deletes a workspace tag.
func (c *Client) DeleteWorkspaceTag(workspace, tagID string) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodDelete,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/tags/%s", workspace, tagID),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete workspace tag error: %w", err)
	}
	return apiResp, nil
}

// AddTagToEntity adds an entity to a tag using the workspace tag route.
func (c *Client) AddTagToEntity(
	workspace, tagID string,
	entityType irminmodels.TagEntityType,
	entityID string,
) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodPost,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/tags/%s/entities/%s/%s", workspace, tagID, entityType, entityID),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("add %s to tag error: %w", entityType, err)
	}
	return apiResp, nil
}

// RemoveTagFromEntity removes an entity from a tag using the workspace tag route.
func (c *Client) RemoveTagFromEntity(
	workspace, tagID string, entityType irminmodels.TagEntityType, entityID string,
) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodDelete,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/tags/%s/entities/%s/%s", workspace, tagID, entityType, entityID),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("remove %s from tag error: %w", entityType, err)
	}
	return apiResp, nil
}
