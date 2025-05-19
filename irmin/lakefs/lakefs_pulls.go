package lakefs

import (
	"fmt"
	"net/http"
)

// PullRequestStatus represents the status of a pull request.
type PullRequestStatus string

const (
	PullRequestStatusOpen   PullRequestStatus = "open"
	PullRequestStatusClosed PullRequestStatus = "closed"
	PullRequestStatusMerged PullRequestStatus = "merged"
)

// PullRequest represents a pull request in a repository.
type PullRequest struct {
	ID                string            `json:"id"`
	Status            PullRequestStatus `json:"status"`
	Title             string            `json:"title"`
	Description       string            `json:"description"`
	CreationDate      string            `json:"creation_date"`
	Author            string            `json:"author"`
	SourceBranch      string            `json:"source_branch"`
	DestinationBranch string            `json:"destination_branch"`
	MergedCommitID    string            `json:"merged_commit_id"` // The commit ID of merged PRs
	ClosedDate        string            `json:"closed_date"`
}

// PullRequestList represents the response when listing pull requests.
type PullRequestList struct {
	Pagination Pagination    `json:"pagination"`
	Results    []PullRequest `json:"results"`
}

// PullRequestCreateRequest represents the request payload to create a pull request.
type PullRequestCreateRequest struct {
	Title             string `json:"title"`
	Description       string `json:"description"`
	SourceBranch      string `json:"source_branch"`
	DestinationBranch string `json:"destination_branch"`
}

// PullRequestCreateResponse represents the response when creating a pull request.
type PullRequestCreateResponse struct {
	ID string `json:"id"` // The ID of the created pull request
}

// PullRequestUpdateRequest represents the request payload to update a pull request.
type PullRequestUpdateRequest struct {
	Status      PullRequestStatus `json:"status"`
	Title       string            `json:"title"`
	Description string            `json:"description"`
}

// GetPullRequest fetches a single pull request by its ID.
func (c *Client) GetPullRequest(repositoryID, pullRequestID string) (*PullRequest, error) {
	var pr PullRequest
	endpoint := fmt.Sprintf("/repositories/%s/pulls/%s", repositoryID, pullRequestID)
	if err := c.doRequest("GET", endpoint, nil, []int{http.StatusOK}, &pr); err != nil {
		return nil, err
	}
	return &pr, nil
}

// ListPullRequests retrieves a single page of pull requests.
func (c *Client) ListPullRequests(repositoryID, prefix, after, status string, amount int) (*PullRequestList, error) {
	endpoint := fmt.Sprintf(
		"/repositories/%s/pulls?prefix=%s&after=%s&status=%s&amount=%d",
		repositoryID,
		prefix,
		after,
		status,
		amount,
	)
	var prs PullRequestList
	if err := c.doRequest("GET", endpoint, nil, []int{http.StatusOK}, &prs); err != nil {
		return nil, err
	}
	return &prs, nil
}

// ListAllPullRequests handles pagination automatically and returns all pull requests.
func (c *Client) ListAllPullRequests(repositoryID, prefix, status string) ([]PullRequest, error) {
	var allPRs []PullRequest
	after := ""
	for {
		prs, err := c.ListPullRequests(repositoryID, prefix, after, status, DefaultListAmountLimit)
		if err != nil {
			return nil, err
		}
		allPRs = append(allPRs, prs.Results...)
		if !prs.Pagination.HasMore {
			break
		}
		after = prs.Pagination.NextOffset
	}
	return allPRs, nil
}

// CreatePullRequest creates a new pull request.
func (c *Client) CreatePullRequest(
	repositoryID string,
	reqData PullRequestCreateRequest,
) (*PullRequestCreateResponse, error) {
	var prResp PullRequestCreateResponse
	endpoint := fmt.Sprintf("/repositories/%s/pulls", repositoryID)
	if err := c.doRequest("POST", endpoint, reqData, []int{http.StatusCreated}, &prResp); err != nil {
		return nil, err
	}
	return &prResp, nil
}

// UpdatePullRequest updates an existing pull request.
func (c *Client) UpdatePullRequest(repositoryID, pullRequestID string, reqData PullRequestUpdateRequest) error {
	endpoint := fmt.Sprintf("/repositories/%s/pulls/%s", repositoryID, pullRequestID)
	return c.doRequest("PATCH", endpoint, reqData, []int{http.StatusOK}, nil)
}

// MergePullRequest merges a pull request.
func (c *Client) MergePullRequest(repositoryID, pullRequestID string) (*MergeResult, error) {
	var mergeRes MergeResult
	endpoint := fmt.Sprintf("/repositories/%s/pulls/%s/merge", repositoryID, pullRequestID)
	if err := c.doRequest("PUT", endpoint, nil, []int{http.StatusOK}, &mergeRes); err != nil {
		return nil, err
	}
	return &mergeRes, nil
}
