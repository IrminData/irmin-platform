package irmincore

import (
	"context"
	"fmt"
	"net/http"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// CreateQueryRequest represents the JSON request body for creating a query.
type CreateQueryRequest struct {
	Name        string   `json:"name"                  validate:"required,max=100"    example:"Customer Analytics"`
	Description string   `json:"description,omitempty" validate:"max=500"             example:"Customer data analysis and reporting"`
	SQL         string   `json:"sql,omitempty"         validate:"validsql"            example:"select * from $['demo-data;Meteo.json@main'] WHERE 'Granularity' = 'Hour' LIMIT 2;"`
	Tags        []string `json:"tags,omitempty"        validate:"dive,validsqid=tags" example:"tag_7k3m9x2n5q8p"`
}

// UpdateQueryRequest represents the JSON request body for updating a query.
type UpdateQueryRequest struct {
	Name        *string `json:"name,omitempty"        validate:"max=100"  example:"Customer Analytics"`
	Description *string `json:"description,omitempty" validate:"max=500"  example:"Customer data analysis and reporting"`
	SQL         *string `json:"sql,omitempty"         validate:"validsql" example:"select * from $['demo-data;Meteo.json@main'] WHERE 'Granularity' = 'Hour' LIMIT 2;"`
}

// TransferQueryOwnershipRequest represents the JSON request body for transferring query ownership.
type TransferQueryOwnershipRequest struct {
	NewOwnerID string `json:"new_owner_id" validate:"required,validsqid=users" example:"usr_2k8n9q1m7p3x4z"`
}

// ExecuteSQLRequest represents the JSON request body for executing SQL.
type ExecuteSQLRequest struct {
	SQL string `json:"sql,omitempty" validate:"validsql" example:"select * from $['demo-data;Meteo.json@main'] WHERE 'Granularity' = 'Hour' LIMIT 2;"`
}

func (c *Client) ListStoredQueries(
	ctx context.Context,
	workspace string,
) ([]irminmodels.StoredQuery, *irminmodels.IrminAPIResponse, error) {
	var storedQueries []irminmodels.StoredQuery
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/queries", workspace),
	}, &storedQueries)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch stored queries error: %w", err)
	}
	return storedQueries, apiResp, nil
}

func (c *Client) GetStoredQuery(
	ctx context.Context,
	workspace, queryID string,
) (*irminmodels.StoredQuery, *irminmodels.IrminAPIResponse, error) {
	var storedQuery irminmodels.StoredQuery
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/queries/%s", workspace, queryID),
	}, &storedQuery)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch stored query error: %w", err)
	}
	return &storedQuery, apiResp, nil
}

func (c *Client) CreateStoredQuery(
	ctx context.Context,
	workspace string,
	req CreateQueryRequest,
) (*irminmodels.StoredQuery, *irminmodels.IrminAPIResponse, error) {
	var storedQuery irminmodels.StoredQuery
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/queries", workspace),
		ContentType: "application/json",
		Body:        req,
	}, &storedQuery)
	if err != nil {
		return nil, nil, fmt.Errorf("create stored query error: %w", err)
	}
	return &storedQuery, apiResp, nil
}

func (c *Client) UpdateStoredQuery(
	ctx context.Context,
	workspace, queryID string,
	req UpdateQueryRequest,
) (*irminmodels.StoredQuery, *irminmodels.IrminAPIResponse, error) {
	var storedQuery irminmodels.StoredQuery
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPatch,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/queries/%s", workspace, queryID),
		ContentType: "application/json",
		Body:        req,
	}, &storedQuery)
	if err != nil {
		return nil, nil, fmt.Errorf("update stored query error: %w", err)
	}
	return &storedQuery, apiResp, nil
}

func (c *Client) DeleteStoredQuery(
	ctx context.Context,
	workspace, queryID string,
) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodDelete,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/queries/%s", workspace, queryID),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete stored query error: %w", err)
	}
	return apiResp, nil
}

func (c *Client) TransferStoredQuery(
	ctx context.Context,
	workspace, queryID string,
	req TransferQueryOwnershipRequest,
) (*irminmodels.StoredQuery, *irminmodels.IrminAPIResponse, error) {
	var storedQuery irminmodels.StoredQuery
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/queries/%s/transfer-ownership", workspace, queryID),
		ContentType: "application/json",
		Body:        req,
	}, &storedQuery)
	if err != nil {
		return nil, nil, fmt.Errorf("stored query ownership transfer error: %w", err)
	}
	return &storedQuery, apiResp, nil
}

func (c *Client) ExecuteStoredQuery(
	ctx context.Context,
	workspace, queryID string,
) (*irminmodels.QueryResult, *irminmodels.IrminAPIResponse, error) {
	var result irminmodels.QueryResult
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/queries/%s/execute", workspace, queryID),
		ContentType: "application/x-www-form-urlencoded",
	}, &result)
	if err != nil {
		return nil, nil, fmt.Errorf("execute stored query error: %w", err)
	}
	return &result, apiResp, nil
}

func (c *Client) ExecuteSQL(
	ctx context.Context,
	workspace string,
	req ExecuteSQLRequest,
) (*irminmodels.QueryResult, *irminmodels.IrminAPIResponse, error) {
	var result irminmodels.QueryResult
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/sql", workspace),
		ContentType: "application/json",
		Body:        req,
	}, &result)
	if err != nil {
		return nil, nil, fmt.Errorf("execute script error: %w", err)
	}
	return &result, apiResp, nil
}
