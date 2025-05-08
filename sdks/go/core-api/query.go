package irmincore

import (
	"fmt"
	"net/http"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

func (c *Client) ListStoredQueries(workspace string) ([]irminmodels.StoredQuery, *irminmodels.IrminAPIResponse, error) {
	var storedQueries []irminmodels.StoredQuery
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/queries", workspace),
	}, &storedQueries)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch stored queries error: %w", err)
	}
	return storedQueries, apiResp, nil
}

func (c *Client) GetStoredQuery(
	workspace, queryID string,
) (*irminmodels.StoredQuery, *irminmodels.IrminAPIResponse, error) {
	var storedQuery irminmodels.StoredQuery
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/queries/%s", workspace, queryID),
	}, &storedQuery)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch stored query error: %w", err)
	}
	return &storedQuery, apiResp, nil
}

func (c *Client) CreateStoredQuery(
	workspace, name, description, sql string,
) (*irminmodels.StoredQuery, *irminmodels.IrminAPIResponse, error) {
	var storedQuery irminmodels.StoredQuery
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/queries", workspace),
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"name":        name,
			"description": description,
			"sql":         sql,
		},
	}, &storedQuery)
	if err != nil {
		return nil, nil, fmt.Errorf("create stored query error: %w", err)
	}
	return &storedQuery, apiResp, nil
}

func (c *Client) UpdateStoredQuery(
	workspace, queryID, name, description, sql string,
) (*irminmodels.StoredQuery, *irminmodels.IrminAPIResponse, error) {
	var storedQuery irminmodels.StoredQuery
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPatch,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/queries/%s", workspace, queryID),
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"name":        name,
			"description": description,
			"sql":         sql,
		},
	}, &storedQuery)
	if err != nil {
		return nil, nil, fmt.Errorf("update stored query error: %w", err)
	}
	return &storedQuery, apiResp, nil
}

func (c *Client) DeleteStoredQuery(workspace, queryID string) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodDelete,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/queries/%s", workspace, queryID),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete stored query error: %w", err)
	}
	return apiResp, nil
}

func (c *Client) TransferStoredQuery(
	workspace, queryID, newOwnerID string,
) (*irminmodels.StoredQuery, *irminmodels.IrminAPIResponse, error) {
	var storedQuery irminmodels.StoredQuery
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/queries/%s/transfer-ownership", workspace, queryID),
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"new_owner_id": newOwnerID,
		},
	}, &storedQuery)
	if err != nil {
		return nil, nil, fmt.Errorf("stored query ownership transfer error: %w", err)
	}
	return &storedQuery, apiResp, nil
}

func (c *Client) ExecuteStoredQuery(
	workspace, queryID string,
) (*irminmodels.QueryResult, *irminmodels.IrminAPIResponse, error) {
	var result irminmodels.QueryResult
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/queries/%s/execute", workspace, queryID),
		ContentType: "application/x-www-form-urlencoded",
	}, &result)
	if err != nil {
		return nil, nil, fmt.Errorf("execute stored query error: %w", err)
	}
	return &result, apiResp, nil
}

func (c *Client) ExecuteSQL(workspace, sql string) (*irminmodels.QueryResult, *irminmodels.IrminAPIResponse, error) {
	var result irminmodels.QueryResult
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/sql", workspace),
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"sql": sql,
		},
	}, &result)
	if err != nil {
		return nil, nil, fmt.Errorf("execute script error: %w", err)
	}
	return &result, apiResp, nil
}
