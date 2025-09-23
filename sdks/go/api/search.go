package irmincore

import (
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// Search performs a workspace-wide search using the provided filters.
func (c *Client) Search(
	workspace string,
	params irminmodels.SearchFilters,
) (*irminmodels.SearchResponse, *irminmodels.IrminAPIResponse, error) {
	// Build query parameters
	queryParams := url.Values{}
	if params.Query != "" {
		queryParams.Add("q", params.Query)
	}
	if len(params.Types) > 0 {
		queryParams.Add("types", strings.Join(params.Types, ","))
	}
	if len(params.Tags) > 0 {
		queryParams.Add("tags", strings.Join(params.Tags, ","))
	}
	if params.OwnerID != nil {
		queryParams.Add("owner_id", *params.OwnerID)
	}
	if params.DateFrom != nil {
		queryParams.Add("date_from", *params.DateFrom)
	}
	if params.DateTo != nil {
		queryParams.Add("date_to", *params.DateTo)
	}
	if params.Limit > 0 {
		queryParams.Add("limit", strconv.Itoa(params.Limit))
	}
	if params.Offset > 0 {
		queryParams.Add("offset", strconv.Itoa(params.Offset))
	}

	// Fetch search results
	var searchResponse irminmodels.SearchResponse
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/search?%s", workspace, queryParams.Encode()),
	}, &searchResponse)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch search results error: %w", err)
	}
	return &searchResponse, apiResp, nil
}
