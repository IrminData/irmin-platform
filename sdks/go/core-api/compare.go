package irmincore

import (
	"fmt"
	"net/http"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// MergeRefsRequest represents the JSON request body for merging refs.
type MergeRefsRequest struct {
	BaseRef     string `json:"base_ref"              validate:"required"`
	CompareRef  string `json:"compare_ref"           validate:"required"`
	Description string `json:"description,omitempty"`
	Strategy    string `json:"strategy,omitempty"`
	Squash      bool   `json:"squash,omitempty"`
	AllowEmpty  bool   `json:"allow_empty,omitempty"`
}

// CompareRefs compares two refs in a repository and returns the differences.
func (c *Client) CompareRefs(
	workspace, repository, baseRef, compareRef string,
) (*irminmodels.Diff, *irminmodels.IrminAPIResponse, error) {
	var diff irminmodels.Diff
	apiResp, err := c.FetchAPI(RequestOptions{
		Method: http.MethodGet,
		Endpoint: fmt.Sprintf(
			"/v1/workspaces/%s/repositories/%s/compare?base_ref=%s&compare_ref=%s",
			workspace,
			repository,
			baseRef,
			compareRef,
		),
	}, &diff)
	if err != nil {
		return nil, nil, fmt.Errorf("compare refs error: %w", err)
	}
	return &diff, apiResp, nil
}

// MergeRefs merges one ref into another.
func (c *Client) MergeRefs(
	workspace, repository string,
	req MergeRefsRequest,
) (*irminmodels.Commit, *irminmodels.IrminAPIResponse, error) {
	var mergeCommit irminmodels.Commit
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/repositories/%s/merge", workspace, repository),
		ContentType: "application/json",
		Body:        req,
	}, &mergeCommit)
	if err != nil {
		return nil, nil, fmt.Errorf("merge refs error: %w", err)
	}
	return &mergeCommit, apiResp, nil
}
