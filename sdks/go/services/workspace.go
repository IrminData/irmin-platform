package services

import (
	"encoding/json"
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
func (s *WorkspaceService) FetchWorkspaces() ([]models.Workspace, error) {
	resp, err := s.client.Request(client.RequestOptions{
		Method:   http.MethodGet,
		Endpoint: "/v1/workspaces",
	})
	if err != nil {
		return nil, fmt.Errorf("fetch workspaces error: %w", err)
	}

	var workspaces []models.Workspace
	if err := json.Unmarshal(resp, &workspaces); err != nil {
		return nil, fmt.Errorf("parse workspaces error: %w", err)
	}
	return workspaces, nil
}

// FetchWorkspace retrieves a single workspace by slug
func (s *WorkspaceService) FetchWorkspace(slug string) (*models.Workspace, error) {
	endpoint := fmt.Sprintf("/v1/workspaces/%s", slug)

	resp, err := s.client.Request(client.RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	})
	if err != nil {
		return nil, fmt.Errorf("fetch workspace error: %w", err)
	}

	var workspace models.Workspace
	if err := json.Unmarshal(resp, &workspace); err != nil {
		return nil, fmt.Errorf("parse workspace error: %w", err)
	}
	return &workspace, nil
}

// TransferWorkspaceOwnership reassigns ownership of a workspace
func (s *WorkspaceService) TransferWorkspaceOwnership(slug, userID string) error {
	endpoint := fmt.Sprintf("/v1/workspaces/%s/reassign", slug)
	body := map[string]string{"user": userID}

	_, err := s.client.Request(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    endpoint,
		ContentType: "application/json",
		Body:        body,
	})
	if err != nil {
		return fmt.Errorf("transfer workspace ownership error: %w", err)
	}
	return nil
}

// CreateWorkspace creates a new workspace
func (s *WorkspaceService) CreateWorkspace(name, description string) (*models.Workspace, error) {
	body := map[string]string{
		"name":        name,
		"description": description,
	}

	resp, err := s.client.Request(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/v1/workspaces",
		ContentType: "application/json",
		Body:        body,
	})
	if err != nil {
		return nil, fmt.Errorf("create workspace error: %w", err)
	}

	var workspace models.Workspace
	if err := json.Unmarshal(resp, &workspace); err != nil {
		return nil, fmt.Errorf("parse workspace error: %w", err)
	}
	return &workspace, nil
}

// UpdateWorkspace updates an existing workspace
func (s *WorkspaceService) UpdateWorkspace(slug, name, description string) (*models.Workspace, error) {
	endpoint := fmt.Sprintf("/v1/workspaces/%s", slug)
	body := map[string]string{
		"_method":     "PATCH",
		"name":        name,
		"description": description,
	}

	resp, err := s.client.Request(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    endpoint,
		ContentType: "application/json",
		Body:        body,
	})
	if err != nil {
		return nil, fmt.Errorf("update workspace error: %w", err)
	}

	var workspace models.Workspace
	if err := json.Unmarshal(resp, &workspace); err != nil {
		return nil, fmt.Errorf("parse workspace error: %w", err)
	}
	return &workspace, nil
}

// DeleteWorkspace deletes a workspace
func (s *WorkspaceService) DeleteWorkspace(slug string) error {
	endpoint := fmt.Sprintf("/v1/workspaces/%s", slug)
	body := map[string]string{"_method": "DELETE"}

	_, err := s.client.Request(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    endpoint,
		ContentType: "application/json",
		Body:        body,
	})
	if err != nil {
		return fmt.Errorf("delete workspace error: %w", err)
	}
	return nil
}

// SwitchWorkspace switches to the specified workspace
func (s *WorkspaceService) SwitchWorkspace(slug string) error {
	endpoint := fmt.Sprintf("/v1/workspaces/%s/switch", slug)

	_, err := s.client.Request(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    endpoint,
		ContentType: "application/json",
	})
	if err != nil {
		return fmt.Errorf("switch workspace error: %w", err)
	}
	return nil
}

// LeaveWorkspace lets the user leave the specified workspace
func (s *WorkspaceService) LeaveWorkspace(slug string) error {
	endpoint := fmt.Sprintf("/v1/workspaces/%s/leave", slug)

	_, err := s.client.Request(client.RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	})
	if err != nil {
		return fmt.Errorf("leave workspace error: %w", err)
	}
	return nil
}
