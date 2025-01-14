package services

import (
	"fmt"
	"net/http"

	"github.com/IrminData/irmin-sdk-go/client"
	"github.com/IrminData/irmin-sdk-go/models"
)

// CommitService handles operations related to repository commits
type CommitService struct {
	client *client.Client
}

// NewCommitService creates a new instance of CommitService
func NewCommitService(client *client.Client) *CommitService {
	return &CommitService{client: client}
}

// FetchCommits retrieves all commits for a repository and optionally a ref
func (s *CommitService) FetchCommits(repository, ref string) ([]models.Commit, *client.IrminAPIResponse, error) {
	var commits []models.Commit
	endpoint := fmt.Sprintf("/v1/repositories/%s/commits", repository)
	if ref != "" {
		endpoint += fmt.Sprintf("?ref=%s", ref)
	}

	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &commits)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch commits error: %w", err)
	}
	return commits, apiResp, nil
}

// FetchCommit retrieves a commit by its hash
func (s *CommitService) FetchCommit(repository, hash string) (*models.Commit, *client.IrminAPIResponse, error) {
	var commit models.Commit
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/repositories/%s/commits/%s", repository, hash),
	}, &commit)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch commit error: %w", err)
	}
	return &commit, apiResp, nil
}

// CreateCommit creates a new commit in a repository for the specified branch
func (s *CommitService) CreateCommit(repository, branch, message string) (*client.IrminAPIResponse, error) {
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/repositories/%s/commits", repository),
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"branch":  branch,
			"message": message,
		},
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("create commit error: %w", err)
	}
	return apiResp, nil
}

// RevertUncommittedChanges reverts uncommitted changes in a branch
func (s *CommitService) RevertUncommittedChanges(repository, branch string) (*client.IrminAPIResponse, error) {
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/repositories/%s/commits/revert", repository),
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"branch": branch,
		},
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("revert uncommitted changes error: %w", err)
	}
	return apiResp, nil
}

// FetchLastModification retrieves the last commit modifying a specific object
func (s *CommitService) FetchLastModification(repository, branch, objectPath string) (*models.Commit, *client.IrminAPIResponse, error) {
	var commit models.Commit
	urlParams := fmt.Sprintf("?branch=%s", branch)
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/repositories/%s/objects/%s/last-commit%s", repository, objectPath, urlParams),
	}, &commit)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch last modification error: %w", err)
	}
	return &commit, apiResp, nil
}
