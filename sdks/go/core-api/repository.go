package irminCore

import (
	"fmt"
	"net/http"
	"strconv"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

// RepositoryService handles repository-related API calls
type RepositoryService struct {
	client *Client
}

// NewRepositoryService creates a new RepositoryService
func NewRepositoryService(client *Client) *RepositoryService {
	return &RepositoryService{
		client: client,
	}
}

func (s *RepositoryService) ListRepositories(workspace string) ([]irminModels.Repository, *irminModels.IrminAPIResponse, error) {
	var repositories []irminModels.Repository
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/repositories", workspace),
	}, &repositories)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch repositories error: %w", err)
	}
	return repositories, apiResp, nil
}

func (s *RepositoryService) GetRepository(workspace, slug string) (*irminModels.Repository, *irminModels.IrminAPIResponse, error) {
	var repository irminModels.Repository
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/repositories/%s", workspace, slug),
	}, &repository)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch repository error: %w", err)
	}
	return &repository, apiResp, nil
}

func (s *RepositoryService) CreateRepository(workspace, name, description, documentation, default_branch string, isImmutable bool, garbageDefaultRetentionDays, garbadeDefaultBranchRetentionDays int) (*irminModels.Repository, *irminModels.IrminAPIResponse, error) {
	var repository irminModels.Repository
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/repositories", workspace),
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"name":                                  name,
			"description":                           description,
			"documentation":                         documentation,
			"default_branch":                        default_branch,
			"is_immutable":                          strconv.FormatBool(isImmutable),
			"garbage_default_retention_days":        strconv.Itoa(garbageDefaultRetentionDays),
			"garbage_default_branch_retention_days": strconv.Itoa(garbadeDefaultBranchRetentionDays),
		},
	}, &repository)
	if err != nil {
		return nil, nil, fmt.Errorf("create repository error: %w", err)
	}

	return &repository, apiResp, nil
}

func (s *RepositoryService) UpdateRepository(workspace, slug, name, description, documentation, default_branch string, isImmutable bool, garbageDefaultRetentionDays, garbadeDefaultBranchRetentionDays int) (*irminModels.Repository, *irminModels.IrminAPIResponse, error) {
	var repository irminModels.Repository
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:      http.MethodPatch,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/repositories/%s", workspace, slug),
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"name":                                  name,
			"description":                           description,
			"documentation":                         documentation,
			"default_branch":                        default_branch,
			"is_immutable":                          strconv.FormatBool(isImmutable),
			"garbage_default_retention_days":        strconv.Itoa(garbageDefaultRetentionDays),
			"garbage_default_branch_retention_days": strconv.Itoa(garbadeDefaultBranchRetentionDays),
		},
	}, &repository)
	if err != nil {
		return nil, nil, fmt.Errorf("update repository error: %w", err)
	}

	return &repository, apiResp, nil
}

func (s *RepositoryService) TransferRepository(workspace, slug, newOwnerID string) (*irminModels.Repository, *irminModels.IrminAPIResponse, error) {
	var repository irminModels.Repository
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:      http.MethodPatch,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/repositories/%s/transfer-ownership", workspace, slug),
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"new_owner_id": newOwnerID,
		},
	}, &repository)
	if err != nil {
		return nil, nil, fmt.Errorf("repository ownership transfer error: %w", err)
	}

	return &repository, apiResp, nil
}

func (s *RepositoryService) DeleteRepository(workspace, slug string) (*irminModels.IrminAPIResponse, error) {
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodDelete,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/repositories/%s", workspace, slug),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete repository error: %w", err)
	}

	return apiResp, nil
}

func (s *RepositoryService) GetRepositoryDownloadLink(slug, ref, path string) (*string, *irminModels.IrminAPIResponse, error) {
	var response string
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/repositories/%s/download", slug),
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"ref":  ref,
			"path": path,
		},
	}, &response)
	if err != nil {
		return nil, nil, fmt.Errorf("get repository download link error: %w", err)
	}
	return &response, apiResp, nil
}
