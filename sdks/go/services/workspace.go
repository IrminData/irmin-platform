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
