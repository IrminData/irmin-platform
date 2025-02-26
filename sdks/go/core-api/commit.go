package irminCore

import (
	"fmt"
	"net/http"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

// CommitService handles operations related to repository commits
type CommitService struct {
	client *Client
}

// NewCommitService creates a new instance of CommitService
func NewCommitService(client *Client) *CommitService {
	return &CommitService{client: client}
}

// FetchCommits retrieves all commits for a repository and optionally a ref
func (s *CommitService) FetchCommits(repository, ref string) ([]irminModels.Commit, *irminModels.IrminAPIResponse, error) {
	var commits []irminModels.Commit
	endpoint := fmt.Sprintf("/v1/repositories/%s/commits", repository)
	if ref != "" {
		endpoint += fmt.Sprintf("?ref=%s", ref)
	}

	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &commits)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch commits error: %w", err)
	}
	return commits, apiResp, nil
}

// FetchCommit retrieves a commit by its hash
func (s *CommitService) FetchCommit(repository, hash string) (*irminModels.Commit, *irminModels.IrminAPIResponse, error) {
	var commit irminModels.Commit
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/repositories/%s/commits/%s", repository, hash),
	}, &commit)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch commit error: %w", err)
	}
	return &commit, apiResp, nil
}

// CreateCommit creates a new commit in a repository for the specified branch
func (s *CommitService) CreateCommit(repository, branch, message string) (*irminModels.IrminAPIResponse, error) {
	apiResp, err := s.client.FetchAPI(RequestOptions{
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
func (s *CommitService) RevertUncommittedChanges(repository, branch string) (*irminModels.IrminAPIResponse, error) {
	apiResp, err := s.client.FetchAPI(RequestOptions{
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
func (s *CommitService) FetchLastModification(repository, branch, objectPath string) (*irminModels.Commit, *irminModels.IrminAPIResponse, error) {
	var commit irminModels.Commit
	urlParams := fmt.Sprintf("?branch=%s", branch)
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/repositories/%s/objects/%s/last-commit%s", repository, objectPath, urlParams),
	}, &commit)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch last modification error: %w", err)
	}
	return &commit, apiResp, nil
}
