package irminCore

import (
	"fmt"
	"net/http"
	"strconv"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

// CompareRefs compares two refs in a repository and returns the differences
func (c *Client) CompareRefs(workspace, repository, baseRef, compareRef string) (*irminModels.Diff, *irminModels.IrminAPIResponse, error) {
	var diff irminModels.Diff
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/repositories/%s/compare?base_ref=%s&compare_ref=%s", workspace, repository, baseRef, compareRef),
	}, &diff)
	if err != nil {
		return nil, nil, fmt.Errorf("compare refs error: %w", err)
	}
	return &diff, apiResp, nil
}

// MergeRefs merges one ref into another
func (c *Client) MergeRefs(workspace, repository, baseRef, compareRef, description, strategy string, squash, allowEmpty bool) (*irminModels.Commit, *irminModels.IrminAPIResponse, error) {
	var mergeCommit irminModels.Commit
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/repositories/%s/merge", workspace, repository),
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"base_ref":    baseRef,
			"compare_ref": compareRef,
			"description": description,
			"strategy":    strategy, // The merge strategy (default, source-wins, dest-wins)
			"squash":      strconv.FormatBool(squash),
			"allow_empty": strconv.FormatBool(allowEmpty),
		},
	}, &mergeCommit)
	if err != nil {
		return nil, nil, fmt.Errorf("merge refs error: %w", err)
	}
	return &mergeCommit, apiResp, nil
}
