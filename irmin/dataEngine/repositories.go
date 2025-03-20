package dataEngine

import (
	"fmt"
	"net/http"
)

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

// Repository represents a returned by the data engine.
type Repository struct {
	// Repository ID
	ID string `json:"id"`
	// Name of the Repository
	Name string `json:"name"`
	// Workspace the Repository belongs to
	Workspace string `json:"workspace"`
	// Storage path of the Repository
	StorageNamespace string `json:"storage_namespace"`
	// If the Repository is immutable, it cannot be changed or updated
	IsImmutable bool `json:"is_immutable"`
	// Default branch of the Repository
	DefaultBranch string `json:"default_branch"`
	// Timestamp of the creation of the Repository
	CreatedAt string `json:"created_at"`
	// Garbage collection rules for the Repository
	GarbageCollectionRules *GarbageCollectionRules `json:"garbage_collection_rules,omitempty"`
}

func (c *Client) ListRepositories(workspace string) ([]Repository, error) {
	var data []Repository
	// Format the endpoint.
	endpoint := fmt.Sprintf("/workspace/%s/repositories", workspace)
	// Call the API endpoint.
	if err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &data); err != nil {
		return nil, err
	}
	return data, nil
}

func (c *Client) GetRepository(workspace, repository string) (*Repository, error) {
	var data Repository
	// Format the endpoint.
	endpoint := fmt.Sprintf("/workspace/%s/repositories/%s", workspace, repository)
	// Call the API endpoint.
	if err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &data); err != nil {
		return nil, err
	}
	return &data, nil
}

func (c *Client) CreateRepository(workspace, name, defaultBranch string, isImmutable bool, gcDefaultRetentionDays, gcDefaultBranchRetentionDays *int) (*Repository, error) {
	var data Repository
	// Format the endpoint.
	endpoint := fmt.Sprintf("/workspace/%s/repositories", workspace)
	// Call the API endpoint.
	if err := c.FetchAPI(RequestOptions{
		Method:   http.MethodPost,
		Endpoint: endpoint,
		FormFields: map[string]string{
			"name":                                  name,
			"default_branch":                        defaultBranch,
			"is_immutable":                          fmt.Sprintf("%t", isImmutable),
			"garbage_default_retention_days":        fmt.Sprintf("%d", gcDefaultRetentionDays),
			"garbage_default_branch_retention_days": fmt.Sprintf("%d", gcDefaultBranchRetentionDays),
		},
	}, &data); err != nil {
		return nil, err
	}
	return &data, nil
}

func (c *Client) UpdateRepository(workspace, repository string, gcDefaultRetentionDays, gcDefaultBranchRetentionDays *int) (*Repository, error) {
	var data Repository
	// Format the endpoint.
	endpoint := fmt.Sprintf("/workspace/%s/repositories/%s", workspace, repository)
	// Call the API endpoint.
	if err := c.FetchAPI(RequestOptions{
		Method:   http.MethodPost,
		Endpoint: endpoint,
		FormFields: map[string]string{
			"garbage_default_retention_days":        fmt.Sprintf("%d", gcDefaultRetentionDays),
			"garbage_default_branch_retention_days": fmt.Sprintf("%d", gcDefaultBranchRetentionDays),
		},
	}, &data); err != nil {
		return nil, err
	}
	return &data, nil
}

func (c *Client) DeleteRepository(workspace, repository string, keepObjects bool) error {
	// Format the endpoint.
	endpoint := fmt.Sprintf("/workspace/%s/repositories/%s", workspace, repository)
	// Call the API endpoint.
	if err := c.FetchAPI(RequestOptions{
		Method:   http.MethodDelete,
		Endpoint: endpoint,
		FormFields: map[string]string{
			"keep_objects": fmt.Sprintf("%t", keepObjects),
		},
	}, nil); err != nil {
		return err
	}
	return nil
}
