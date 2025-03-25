package dataEngine

import (
	"fmt"
	"net/http"
)

// ExecuteQuery executes a query in the specified workspace and returns the results.
func (c *Client) ExecuteQuery(workspace, query string) ([]map[string]any, error) {
	var results []map[string]any
	// Format the endpoint using the workspace path parameter.
	endpoint := fmt.Sprintf("/workspace/%s/queries/execute", workspace)
	// Call the API endpoint with a POST request and form data containing the query.
	if err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    endpoint,
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"query": query,
		},
	}, &results); err != nil {
		return nil, err
	}
	return results, nil
}
