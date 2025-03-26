package irminCore

import (
	"fmt"
	"net/http"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

// WorkspaceService wraps operations on workspaces
type WorkspaceService struct {
	client *Client
}

// NewWorkspaceService creates a new WorkspaceService
func NewWorkspaceService(client *Client) *WorkspaceService {
	return &WorkspaceService{
		client: client,
	}
}

func (s *WorkspaceService) ListWorkspaces() ([]irminModels.Workspace, *irminModels.IrminAPIResponse, error) {
	var workspaces []irminModels.Workspace
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: "/v1/workspaces",
	}, &workspaces)
	if err != nil {
		return nil, nil, fmt.Errorf("list workspaces error: %w", err)
	}
	return workspaces, apiResp, nil
}

func (s *WorkspaceService) GetWorkspace(slug string) (*irminModels.Workspace, *irminModels.IrminAPIResponse, error) {
	var workspace irminModels.Workspace
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s", slug),
	}, &workspace)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch workspace error: %w", err)
	}
	return &workspace, apiResp, nil
}

func (s *WorkspaceService) CreateWorkspace(name, description string) (*irminModels.Workspace, *irminModels.IrminAPIResponse, error) {
	var workspace irminModels.Workspace
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/v1/workspaces",
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"name":        name,
			"description": description,
		},
	}, &workspace)
	if err != nil {
		return nil, nil, fmt.Errorf("create workspace error: %w", err)
	}
	return &workspace, apiResp, nil
}

func (s *WorkspaceService) UpdateWorkspace(slug, name, description string) (*irminModels.Workspace, *irminModels.IrminAPIResponse, error) {
	var workspace irminModels.Workspace
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:      http.MethodPut,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s", slug),
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"name":        name,
			"description": description,
		},
	}, &workspace)
	if err != nil {
		return nil, nil, fmt.Errorf("update workspace error: %w", err)
	}
	return &workspace, apiResp, nil
}

func (s *WorkspaceService) DeleteWorkspace(slug string) (*irminModels.IrminAPIResponse, error) {
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodDelete,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s", slug),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete workspace error: %w", err)
	}
	return apiResp, nil
}

func (s *WorkspaceService) TransferWorkspace(slug, newOwnerID string) (*irminModels.Workspace, *irminModels.IrminAPIResponse, error) {
	var workspace irminModels.Workspace
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:      http.MethodPatch,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s", slug),
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"new_owner_id": newOwnerID,
		},
	}, &workspace)
	if err != nil {
		return nil, nil, fmt.Errorf("transfer workspace error: %w", err)
	}
	return &workspace, apiResp, nil
}

func (s *WorkspaceService) LeaveWorkspace(slug string) (*irminModels.IrminAPIResponse, error) {
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodPatch,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/leave", slug),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("leave workspace error: %w", err)
	}
	return apiResp, nil
}
