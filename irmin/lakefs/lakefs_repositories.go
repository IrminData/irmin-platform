package lakefs

import (
	"fmt"
	"net/http"
)

// Repository represents a  repository.
type Repository struct {
	ID               string `json:"id"`
	CreationDate     int64  `json:"creation_date"`
	DefaultBranch    string `json:"default_branch"`
	StorageID        string `json:"storage_id"`
	StorageNamespace string `json:"storage_namespace"`
	ReadOnly         bool   `json:"read_only"`
}

// RepositoryList represents the response when listing repositories.
type RepositoryList struct {
	Pagination Pagination   `json:"pagination"`
	Results    []Repository `json:"results"`
}

// RepositoryCreateRequest represents the request payload to create a repository.
type RepositoryCreateRequest struct {
	Name             string `json:"name"`                 // pattern: ^[a-z0-9][a-z0-9-]{2,62}$, example: my-repo
	StorageID        string `json:"storage_id,omitempty"` // Unique identifier of the underlying data store.
	StorageNamespace string `json:"storage_namespace"`    // Filesystem URI to store the underlying data in (e.g. "s3://my-bucket/some/path/")
	DefaultBranch    string `json:"default_branch"`
	SampleData       bool   `json:"sample_data,omitempty"`
	ReadOnly         bool   `json:"read_only,omitempty"`
}

// BranchGarbageCollectionRules represents the garbage collection rules for a branch.
type BranchGarbageCollectionRules struct {
	BranchID      string `json:"branch_id"`
	RetentionDays int    `json:"retention_days"`
}

// GarbageCollectionRules represents the garbage collection rules for a repository.
type GarbageCollectionRules struct {
	DefaultRetentionDays int                            `json:"default_retention_days,omitempty"`
	Branches             []BranchGarbageCollectionRules `json:"branches,omitempty"`
}

// GetRepository fetches a single repository by its ID.
func (c *Client) GetRepository(repositoryID string) (*Repository, error) {
	var repo Repository
	endpoint := fmt.Sprintf("/repositories/%s", repositoryID)
	if err := c.doRequest("GET", endpoint, nil, []int{http.StatusOK}, &repo); err != nil {
		return nil, err
	}
	return &repo, nil
}

// ListRepositories retrieves a single page of repositories.
func (c *Client) ListRepositories(prefix, after, search string, amount int) (*RepositoryList, error) {
	endpoint := fmt.Sprintf("/repositories?prefix=%s&after=%s&search=%s&amount=%d", prefix, after, search, amount)
	var listResp RepositoryList
	if err := c.doRequest("GET", endpoint, nil, []int{http.StatusOK}, &listResp); err != nil {
		return nil, err
	}
	return &listResp, nil
}

// ListAllRepositories handles pagination automatically and returns all repositories.
func (c *Client) ListAllRepositories(prefix, search string) ([]Repository, error) {
	var allRepos []Repository
	after := ""
	for {
		listResp, err := c.ListRepositories(prefix, after, search, DefaultListAmountLimit)
		if err != nil {
			return nil, err
		}
		allRepos = append(allRepos, listResp.Results...)
		if !listResp.Pagination.HasMore {
			break
		}
		after = listResp.Pagination.NextOffset
	}
	return allRepos, nil
}

// CreateRepository creates a new repository using the provided request data.
// If bare is true, create a bare repository with no initial commit and branch.
func (c *Client) CreateRepository(bare bool, reqData RepositoryCreateRequest) (*Repository, error) {
	var repo Repository
	endpoint := "/repositories"
	if bare {
		endpoint += "?bare=true"
	}
	if err := c.doRequest("POST", endpoint, reqData, []int{http.StatusCreated}, &repo); err != nil {
		return nil, err
	}
	return &repo, nil
}

// DeleteRepository deletes the repository identified by repositoryID.
func (c *Client) DeleteRepository(repositoryID string) error {
	endpoint := fmt.Sprintf("/repositories/%s", repositoryID)
	return c.doRequest("DELETE", endpoint, nil, []int{http.StatusOK, http.StatusNoContent}, nil)
}

// GetGarbageCollectionRules fetches the garbage collection rules for a repository.
func (c *Client) GetGarbageCollectionRules(repositoryID string) (*GarbageCollectionRules, error) {
	var rules GarbageCollectionRules
	endpoint := fmt.Sprintf("/repositories/%s/settings/gc_rules", repositoryID)
	// Allow 404 so that an empty GarbageCollectionRules is returned when no rules are defined.
	if err := c.doRequest("GET", endpoint, nil, []int{http.StatusOK, http.StatusNotFound}, &rules); err != nil {
		return nil, err
	}
	return &rules, nil
}

// SetGarbageCollectionRules sets the garbage collection rules for a repository.
func (c *Client) SetGarbageCollectionRules(repositoryID string, rules GarbageCollectionRules) error {
	endpoint := fmt.Sprintf("/repositories/%s/settings/gc_rules", repositoryID)
	return c.doRequest("PUT", endpoint, rules, []int{http.StatusOK, http.StatusNoContent}, nil)
}

// DeleteGarbageCollectionRules deletes the garbage collection rules for a repository.
func (c *Client) DeleteGarbageCollectionRules(repositoryID string) error {
	endpoint := fmt.Sprintf("/repositories/%s/settings/gc_rules", repositoryID)
	return c.doRequest("DELETE", endpoint, nil, []int{http.StatusOK, http.StatusNoContent}, nil)
}
