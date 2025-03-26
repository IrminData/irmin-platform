package irminCore

import (
	"fmt"
	"net/http"
	"strconv"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

// BranchService handles branch-related API operations.
type BranchService struct {
	client *Client
}

// NewBranchService creates a new BranchService
func NewBranchService(client *Client) *BranchService {
	return &BranchService{
		client: client,
	}
}

func (s *BranchService) ListBranches(workspace, repository string) ([]irminModels.Branch, *irminModels.IrminAPIResponse, error) {
	var branches []irminModels.Branch
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/repositories/%s/branches", workspace, repository),
	}, &branches)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch branches error: %w", err)
	}
	return branches, apiResp, nil
}

func (s *BranchService) GetBranch(workspace, repository, branchName string) (*irminModels.Branch, *irminModels.IrminAPIResponse, error) {
	var branch irminModels.Branch
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/repositories/%s/branches/%s", workspace, repository, branchName),
	}, &branch)
	if err != nil {
		return &branch, nil, fmt.Errorf("fetch branch error: %w", err)
	}
	return &branch, apiResp, nil
}

// CreateBranch creates a new branch in the repository.
func (s *BranchService) CreateBranch(workspace, repository, name, from string, isImmutable bool) (*irminModels.Branch, *irminModels.IrminAPIResponse, error) {
	var branch irminModels.Branch
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/repositories/%s/branches", workspace, repository),
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"name":         name,
			"from":         from,
			"is_immutable": strconv.FormatBool(isImmutable),
		},
	}, &branch)
	if err != nil {
		return nil, nil, fmt.Errorf("create branch error: %w", err)
	}

	return &branch, apiResp, nil
}

// DeleteBranch deletes a branch in the repository.
func (s *BranchService) DeleteBranch(workspace, repository, branch string) (*irminModels.IrminAPIResponse, error) {
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:      http.MethodDelete,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/repositories/%s/branches/%s", workspace, repository, branch),
		ContentType: "application/x-www-form-urlencoded",
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete branch error: %w", err)
	}

	return apiResp, nil
}

// UpdateBranch updates a branch name in the repository.
func (s *BranchService) UpdateBranch(workspace, repository, oldName, newName string, isImmutable bool) (*irminModels.IrminAPIResponse, error) {
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:      http.MethodPatch,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/repositories/%s/branches/%s", workspace, repository, oldName),
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"name":         newName,
			"is_immutable": strconv.FormatBool(isImmutable),
		},
	}, nil)

	if err != nil {
		return nil, fmt.Errorf("failed to update branch, status code: %d", err)
	}

	return apiResp, nil
}
