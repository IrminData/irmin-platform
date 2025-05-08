package lakefs

import (
	"fmt"
	"net/http"
)

// Commit represents a commit in a lakeFS repository.
type Commit struct {
	ID           string            `json:"id"`
	Parents      []string          `json:"parents"`
	Committer    string            `json:"committer"`
	Message      string            `json:"message"`
	CreationDate int               `json:"creation_date"` // Unix Epoch in seconds
	MetaRangeID  string            `json:"meta_range_id"`
	Metadata     map[string]string `json:"metadata"`
	Generation   int               `json:"generation"`
	Version      int               `json:"version"`
}

// CommitCreateRequest represents the request payload to create a commit.
type CommitCreateRequest struct {
	Message    string            `json:"message"`
	Metadata   map[string]string `json:"metadata"`
	Date       int64             `json:"date,omitempty"`        // Set date to override creation date in the commit (Unix Epoch in seconds)
	AllowEmpty bool              `json:"allow_empty,omitempty"` // Sets whether a commit can contain no changes
	Force      bool              `json:"force,omitempty"`       // Sets whether to force the commit
}

// CreateCommit creates a new commit in a repository.
func (c *Client) CreateCommit(
	repositoryID, branchID, sourceMetarange string,
	reqData CommitCreateRequest,
) (*Commit, error) {
	var commit Commit
	endpoint := fmt.Sprintf("/repositories/%s/branches/%s/commits", repositoryID, branchID)
	if sourceMetarange != "" {
		endpoint = fmt.Sprintf("%s?source_metarange=%s", endpoint, sourceMetarange)
	}
	if err := c.doRequest("POST", endpoint, reqData, []int{http.StatusCreated, http.StatusOK}, &commit); err != nil {
		return nil, err
	}
	return &commit, nil
}

// GetCommit fetches a single commit by its ID.
func (c *Client) GetCommit(repositoryID, commitID string) (*Commit, error) {
	var commit Commit
	endpoint := fmt.Sprintf("/repositories/%s/commits/%s", repositoryID, commitID)
	if err := c.doRequest("GET", endpoint, nil, []int{http.StatusOK}, &commit); err != nil {
		return nil, err
	}
	return &commit, nil
}

// ListCommits retrieves a single page of commits for a given ref.
func (c *Client) ListCommits(
	repositoryID, ref, after, since, stop_at string,
	amount int,
	objects, prefixes []string,
) (*CommitList, error) {
	var commits CommitList
	endpoint := fmt.Sprintf(
		"/repositories/%s/refs/%s/commits?after=%s&since=%s&stop_at=%s&amount=%d",
		repositoryID,
		ref,
		after,
		since,
		stop_at,
		amount,
	)
	if len(objects) > 0 {
		for _, obj := range objects {
			endpoint += "&objects=" + obj
		}
	}
	if len(prefixes) > 0 {
		for _, prefix := range prefixes {
			endpoint += "&prefixes=" + prefix
		}
	}
	if err := c.doRequest("GET", endpoint, nil, []int{http.StatusOK}, &commits); err != nil {
		return nil, err
	}
	return &commits, nil
}

// ListAllCommits handles pagination automatically and returns all commits for a ref.
func (c *Client) ListAllCommits(
	repositoryID, ref, after, since, stop_at string,
	objects, prefixes []string,
) ([]Commit, error) {
	var allCommits []Commit
	for {
		commits, err := c.ListCommits(repositoryID, ref, after, since, stop_at, 100, objects, prefixes)
		if err != nil {
			return nil, err
		}
		allCommits = append(allCommits, commits.Results...)
		if !commits.Pagination.HasMore {
			break
		}
		after = commits.Pagination.NextOffset
	}
	return allCommits, nil
}
