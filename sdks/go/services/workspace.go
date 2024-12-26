package services

import (
	"encoding/json"
	"fmt"
	"irmin-sdk/client"
	"irmin-sdk/models"
)

type WorkspaceService struct {
	client *client.Client
}

func NewWorkspaceService(client *client.Client) *WorkspaceService {
	return &WorkspaceService{
		client: client,
	}
}

func (s *WorkspaceService) FetchWorkspaces() ([]models.Workspace, error) {
	response, err := s.client.Request("GET", "/v1/workspaces", nil)
	if err != nil {
		return nil, fmt.Errorf("fetch workspaces error: %w", err)
	}

	var workspaces []models.Workspace
	err = json.Unmarshal(response, &workspaces)
	if err != nil {
		return nil, fmt.Errorf("parse workspaces error: %w", err)
	}

	return workspaces, nil
}

func (s *WorkspaceService) FetchWorkspace(slug string) (*models.Workspace, error) {
	endpoint := fmt.Sprintf("/v1/workspaces/%s", slug)
	response, err := s.client.Request("GET", endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("fetch workspace error: %w", err)
	}

	var workspace models.Workspace
	err = json.Unmarshal(response, &workspace)
	if err != nil {
		return nil, fmt.Errorf("parse workspace error: %w", err)
	}

	return &workspace, nil
}

func (s *WorkspaceService) TransferWorkspaceOwnership(slug, userID string) error {
	endpoint := fmt.Sprintf("/v1/workspaces/%s/reassign", slug)
	body := map[string]string{"user": userID}
	_, err := s.client.Request("POST", endpoint, body)
	if err != nil {
		return fmt.Errorf("transfer workspace ownership error: %w", err)
	}

	return nil
}

func (s *WorkspaceService) CreateWorkspace(name, description string) (*models.Workspace, error) {
	body := map[string]string{"name": name, "description": description}
	response, err := s.client.Request("POST", "/v1/workspaces", body)
	if err != nil {
		return nil, fmt.Errorf("create workspace error: %w", err)
	}

	var workspace models.Workspace
	err = json.Unmarshal(response, &workspace)
	if err != nil {
		return nil, fmt.Errorf("parse workspace error: %w", err)
	}

	return &workspace, nil
}

func (s *WorkspaceService) UpdateWorkspace(slug, name, description string) (*models.Workspace, error) {
	endpoint := fmt.Sprintf("/v1/workspaces/%s", slug)
	body := map[string]string{"_method": "PATCH", "name": name, "description": description}
	response, err := s.client.Request("POST", endpoint, body)
	if err != nil {
		return nil, fmt.Errorf("update workspace error: %w", err)
	}

	var workspace models.Workspace
	err = json.Unmarshal(response, &workspace)
	if err != nil {
		return nil, fmt.Errorf("parse workspace error: %w", err)
	}

	return &workspace, nil
}

func (s *WorkspaceService) DeleteWorkspace(slug string) error {
	endpoint := fmt.Sprintf("/v1/workspaces/%s", slug)
	body := map[string]string{"_method": "DELETE"}
	_, err := s.client.Request("POST", endpoint, body)
	if err != nil {
		return fmt.Errorf("delete workspace error: %w", err)
	}

	return nil
}

func (s *WorkspaceService) SwitchWorkspace(slug string) error {
	endpoint := fmt.Sprintf("/v1/workspaces/%s/switch", slug)
	_, err := s.client.Request("POST", endpoint, nil)
	if err != nil {
		return fmt.Errorf("switch workspace error: %w", err)
	}

	return nil
}

func (s *WorkspaceService) LeaveWorkspace(slug string) error {
	endpoint := fmt.Sprintf("/v1/workspaces/%s/leave", slug)
	_, err := s.client.Request("GET", endpoint, nil)
	if err != nil {
		return fmt.Errorf("leave workspace error: %w", err)
	}

	return nil
}
