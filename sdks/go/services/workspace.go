package services

import (
	"fmt"
	"irmin-sdk/client"
	"irmin-sdk/models"
	"net/http"
)

// WorkspaceService wraps operations on workspaces
type WorkspaceService struct {
	client *client.Client
}

// NewWorkspaceService creates a new WorkspaceService
func NewWorkspaceService(client *client.Client) *WorkspaceService {
	return &WorkspaceService{
		client: client,
	}
}

// FetchWorkspaces retrieves a list of workspaces
func (s *WorkspaceService) FetchWorkspaces() ([]models.Workspace, *client.IrminAPIResponse, error) {
	var workspaces []models.Workspace

	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:   http.MethodGet,
		Endpoint: "/v1/workspaces",
	}, &workspaces)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch workspaces error: %w", err)
	}

	return workspaces, apiResp, nil
}

// FetchWorkspace retrieves a single workspace by slug
func (s *WorkspaceService) FetchWorkspace(slug string) (*models.Workspace, *client.IrminAPIResponse, error) {
	endpoint := fmt.Sprintf("/v1/workspaces/%s", slug)
	var workspace models.Workspace

	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &workspace)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch workspace error: %w", err)
	}

	return &workspace, apiResp, nil
}

// TransferWorkspaceOwnership reassigns ownership of a workspace
// This endpoint doesn't return a meaningful `Data` payload, so we just return the response object.
func (s *WorkspaceService) TransferWorkspaceOwnership(slug, userID string) (*client.IrminAPIResponse, error) {
	endpoint := fmt.Sprintf("/v1/workspaces/%s/reassign", slug)
	body := map[string]string{"user": userID}

	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    endpoint,
		ContentType: "application/json",
		Body:        body,
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("transfer workspace ownership error: %w", err)
	}
	return apiResp, nil
}

// CreateWorkspace creates a new workspace
func (s *WorkspaceService) CreateWorkspace(name, description string) (*models.Workspace, *client.IrminAPIResponse, error) {
	body := map[string]string{
		"name":        name,
		"description": description,
	}
	var workspace models.Workspace

	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/v1/workspaces",
		ContentType: "application/json",
		Body:        body,
	}, &workspace)
	if err != nil {
		return nil, nil, fmt.Errorf("create workspace error: %w", err)
	}

	return &workspace, apiResp, nil
}

// UpdateWorkspace updates an existing workspace
func (s *WorkspaceService) UpdateWorkspace(slug, name, description string) (*models.Workspace, *client.IrminAPIResponse, error) {
	endpoint := fmt.Sprintf("/v1/workspaces/%s", slug)
	body := map[string]string{
		"_method":     "PATCH",
		"name":        name,
		"description": description,
	}
	var workspace models.Workspace

	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    endpoint,
		ContentType: "application/json",
		Body:        body,
	}, &workspace)
	if err != nil {
		return nil, nil, fmt.Errorf("update workspace error: %w", err)
	}

	return &workspace, apiResp, nil
}

// DeleteWorkspace deletes a workspace
// Since there's no meaningful data, just return the response object.
func (s *WorkspaceService) DeleteWorkspace(slug string) (*client.IrminAPIResponse, error) {
	endpoint := fmt.Sprintf("/v1/workspaces/%s", slug)
	body := map[string]string{"_method": "DELETE"}

	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    endpoint,
		ContentType: "application/json",
		Body:        body,
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete workspace error: %w", err)
	}
	return apiResp, nil
}

// SwitchWorkspace switches to the specified workspace
func (s *WorkspaceService) SwitchWorkspace(slug string) (*client.IrminAPIResponse, error) {
	endpoint := fmt.Sprintf("/v1/workspaces/%s/switch", slug)

	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:   http.MethodPost,
		Endpoint: endpoint,
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("switch workspace error: %w", err)
	}
	return apiResp, nil
}

// LeaveWorkspace lets the user leave the specified workspace
func (s *WorkspaceService) LeaveWorkspace(slug string) (*client.IrminAPIResponse, error) {
	endpoint := fmt.Sprintf("/v1/workspaces/%s/leave", slug)

	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("leave workspace error: %w", err)
	}
	return apiResp, nil
}
