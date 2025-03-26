package irminCore

import (
	"fmt"
	"net/http"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

// QueryService handles query-related API calls
type QueryService struct {
	client *Client
}

// NewQueryService creates a new QueryService
func NewQueryService(client *Client) *QueryService {
	return &QueryService{
		client: client,
	}
}

func (s *QueryService) ListStoredQueries(workspace string) ([]irminModels.StoredQuery, *irminModels.IrminAPIResponse, error) {
	var storedQueries []irminModels.StoredQuery
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/queries", workspace),
	}, &storedQueries)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch stored queries error: %w", err)
	}
	return storedQueries, apiResp, nil
}

func (s *QueryService) GetStoredQuery(workspace, queryID string) (*irminModels.StoredQuery, *irminModels.IrminAPIResponse, error) {
	var storedQuery irminModels.StoredQuery
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/queries/%s", workspace, queryID),
	}, &storedQuery)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch stored query error: %w", err)
	}
	return &storedQuery, apiResp, nil
}

func (s *QueryService) CreateStoredQuery(workspace, name, description, sql string) (*irminModels.StoredQuery, *irminModels.IrminAPIResponse, error) {
	var storedQuery irminModels.StoredQuery
	apiResp, err := s.client.FetchAPI(RequestOptions{
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

func (s *QueryService) UpdateStoredQuery(workspace, queryID, name, description, sql string) (*irminModels.StoredQuery, *irminModels.IrminAPIResponse, error) {
	var storedQuery irminModels.StoredQuery
	apiResp, err := s.client.FetchAPI(RequestOptions{
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

func (s *QueryService) DeleteStoredQuery(workspace, queryID string) (*irminModels.IrminAPIResponse, error) {
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodDelete,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/queries/%s", workspace, queryID),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete stored query error: %w", err)
	}
	return apiResp, nil
}

func (s *QueryService) TransferStoredQuery(workspace, queryID, newOwnerID string) (*irminModels.StoredQuery, *irminModels.IrminAPIResponse, error) {
	var storedQuery irminModels.StoredQuery
	apiResp, err := s.client.FetchAPI(RequestOptions{
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

func (s *QueryService) ExecuteStoredQuery(workspace, queryID string) ([]map[string]any, *irminModels.IrminAPIResponse, error) {
	var result []map[string]any
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/queries/%s/execute", workspace, queryID),
		ContentType: "application/x-www-form-urlencoded",
	}, &result)
	if err != nil {
		return nil, nil, fmt.Errorf("execute stored query error: %w", err)
	}
	return result, apiResp, nil
}

func (s *QueryService) ExecuteSQL(workspace, sql string) ([]map[string]any, *irminModels.IrminAPIResponse, error) {
	var result []map[string]any
	apiResp, err := s.client.FetchAPI(RequestOptions{
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
	return result, apiResp, nil
}
