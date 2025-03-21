package dataEngine

import (
	"fmt"
	"net/http"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

func (c *Client) CompareRefs(workspace, repository, baseRef, compareRef string) (*irminModels.Diff, error) {
	var data irminModels.Diff
	// Format the endpoint.
	endpoint := fmt.Sprintf("/workspace/%s/repositories/%s/compare?base_ref=%s&compare_ref=%s", workspace, repository, baseRef, compareRef)
	// Call the API endpoint.
	if err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &data); err != nil {
		return nil, err
	}
	return &data, nil
}

func (c *Client) MergeRefs(workspace, repository, baseRef, compareRef, message, author, strategy string, squash, allowEmpty bool) (*irminModels.Commit, error) {
	var data irminModels.Commit
	// Format the endpoint.
	endpoint := fmt.Sprintf("/workspace/%s/repositories/%s/merge?base_ref=%s&compare_ref=%s", workspace, repository, baseRef, compareRef)
	// Call the API endpoint.
	if err := c.FetchAPI(RequestOptions{
		Method:        http.MethodPost,
		Endpoint:      endpoint,
		AllowedStatus: []int{http.StatusCreated, http.StatusOK},
		ContentType:   "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"message":     message,
			"author":      author,
			"strategy":    strategy,
			"squash":      fmt.Sprintf("%t", squash),
			"allow_empty": fmt.Sprintf("%t", allowEmpty),
		},
	}, &data); err != nil {
		return nil, err
	}
	return &data, nil
}
