package services

import (
	"fmt"
	"net/http"

	"github.com/IrminData/irmin-sdk-go/client"
	"github.com/IrminData/irmin-sdk-go/models"
)

// RepositoryService handles repository-related API calls
type RepositoryService struct {
	client *client.Client
}

// NewRepositoryService creates a new RepositoryService
func NewRepositoryService(client *client.Client) *RepositoryService {
	return &RepositoryService{
		client: client,
	}
}

// FetchRepositories retrieves all repositories
func (s *RepositoryService) FetchRepositories() ([]models.Repository, *client.IrminAPIResponse, error) {
	endpoint := "/v1/repositories"
	var repositories []models.Repository

	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &repositories)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch repositories error: %w", err)
	}
	return repositories, apiResp, nil
}

// FetchRepository retrieves a single repository by its slug
func (s *RepositoryService) FetchRepository(slug string) (*models.Repository, *client.IrminAPIResponse, error) {
	endpoint := fmt.Sprintf("/v1/repositories/%s", slug)
	var repository models.Repository

	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &repository)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch repository error: %w", err)
	}
	return &repository, apiResp, nil
}

// CreateRepository creates a new repository
func (s *RepositoryService) CreateRepository(
	name,
	description,
	documentation string,
) (*models.Repository, *client.IrminAPIResponse, error) {
	form := map[string]string{
		"name":          name,
		"description":   description,
		"documentation": documentation,
	}

	var repository models.Repository
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/v1/repositories",
		ContentType: "application/x-www-form-urlencoded",
		FormFields:  form,
	}, &repository)
	if err != nil {
		return nil, nil, fmt.Errorf("create repository error: %w", err)
	}

	return &repository, apiResp, nil
}

// ReassignRepository reassigns ownership of a repository
func (s *RepositoryService) ReassignRepository(slug, ownerID string) (*client.IrminAPIResponse, error) {
	form := map[string]string{
		"owner": ownerID,
	}

	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/repositories/%s/reassign", slug),
		ContentType: "application/x-www-form-urlencoded",
		FormFields:  form,
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("reassign repository error: %w", err)
	}
	return apiResp, nil
}

// DeleteRepository deletes a repository by its slug
func (s *RepositoryService) DeleteRepository(slug string) (*client.IrminAPIResponse, error) {
	form := map[string]string{
		"_method": "DELETE",
	}

	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/repositories/%s", slug),
		ContentType: "application/x-www-form-urlencoded",
		FormFields:  form,
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete repository error: %w", err)
	}
	return apiResp, nil
}

// UpdateRepository updates a repository's details
func (s *RepositoryService) UpdateRepository(
	slug,
	name,
	description,
	documentation string,
) (*client.IrminAPIResponse, error) {
	form := map[string]string{
		"_method":       "PATCH",
		"name":          name,
		"description":   description,
		"documentation": documentation,
	}

	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/repositories/%s", slug),
		ContentType: "application/x-www-form-urlencoded",
		FormFields:  form,
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("update repository error: %w", err)
	}
	return apiResp, nil
}

// GetRepositoryDownloadLink retrieves a download link for a repository
func (s *RepositoryService) GetRepositoryDownloadLink(slug, ref, path string) (*string, *client.IrminAPIResponse, error) {
	form := map[string]string{
		"ref":  ref,
		"path": path,
	}

	var response struct {
		DownloadURL string `json:"download_url"`
	}

	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/repositories/%s/download", slug),
		ContentType: "application/x-www-form-urlencoded",
		FormFields:  form,
	}, &response)
	if err != nil {
		return nil, nil, fmt.Errorf("get repository download link error: %w", err)
	}
	return &response.DownloadURL, apiResp, nil
}
