package services

import (
	"fmt"
	"net/http"

	"github.com/IrminData/irmin-sdk-go/client"
	"github.com/IrminData/irmin-sdk-go/models"
)

// BranchService handles branch-related API operations.
type BranchService struct {
	client *client.Client
}

// NewBranchService creates a new BranchService
func NewBranchService(client *client.Client) *BranchService {
	return &BranchService{
		client: client,
	}
}

// FetchBranches fetches all branches for a given repository.
func (s *BranchService) FetchBranches(repository string) ([]models.Branch, *client.IrminAPIResponse, error) {
	var branches []models.Branch
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/repositories/%s/branches", repository),
	}, &branches)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch branches error: %w", err)
	}
	return branches, apiResp, nil
}

// FetchBranch fetches a specific branch by name.
func (s *BranchService) FetchBranch(branchName, repository string) (models.Branch, *client.IrminAPIResponse, error) {
	var branch models.Branch
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/repositories/%s/branches/%s", repository, branchName),
	}, &branch)
	if err != nil {
		return branch, nil, fmt.Errorf("fetch branch error: %w", err)
	}
	return branch, apiResp, nil
}

// CreateBranch creates a new branch in the repository.
func (s *BranchService) CreateBranch(repository, name, from string) (*client.IrminAPIResponse, error) {
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/repositories/%s/branches", repository),
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"name": name,
			"from": from,
		},
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("create branch error: %w", err)
	}

	return apiResp, nil
}

// DeleteBranch deletes a branch in the repository.
func (s *BranchService) DeleteBranch(repository, branch string) (*client.IrminAPIResponse, error) {
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/repositories/%s/branches/%s", repository, branch),
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"_method": "DELETE",
		},
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete branch error: %w", err)
	}

	return apiResp, nil
}

// UpdateBranch updates a branch name in the repository.
func (s *BranchService) UpdateBranch(repository, oldName, newName string) (*client.IrminAPIResponse, error) {
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/repositories/%s/branches/%s", repository, oldName),
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"_method": "DELETE",
			"name":    newName,
		},
	}, nil)

	if err != nil {
		return nil, fmt.Errorf("failed to update branch, status code: %d", err)
	}

	return apiResp, nil
}
