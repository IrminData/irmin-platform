package irmincore

import (
	"context"
	"fmt"
	"net/http"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// CreateScriptRequest represents the JSON request body for creating a script.
type CreateScriptRequest struct {
	Name        string   `json:"name"                  validate:"required,max=255"    example:"data-processor.py"`
	Description *string  `json:"description,omitempty" validate:"max=500"             example:"Data processor for the project"`
	Content     *string  `json:"content,omitempty"                                    example:"print('Hello, World!')"`
	Language    *string  `json:"language,omitempty"                                   example:"py"`
	Tags        []string `json:"tags,omitempty"        validate:"dive,validsqid=tags" example:"tag_7k3m9x2n5q8p"`
}

// UpdateScriptRequest represents the JSON request body for updating a script.
type UpdateScriptRequest struct {
	Name        *string `json:"name,omitempty"        validate:"max=255" example:"data-processor.py"`
	Description *string `json:"description,omitempty" validate:"max=500" example:"Data processor for the project"`
	Content     *string `json:"content,omitempty"                        example:"print('Hello, World!')"`
	Language    *string `json:"language,omitempty"                       example:"py"`
}

// TransferScriptOwnershipRequest represents the JSON request body for transferring script ownership.
type TransferScriptOwnershipRequest struct {
	NewOwnerID string `json:"new_owner_id" validate:"required,validsqid=users" example:"usr_2k8n9q1m7p3x4z"`
}

// ExecuteScriptRequest represents the JSON request body for executing a script.
type ExecuteScriptRequest struct {
	Input []irminmodels.ActionInputData `json:"input,omitempty"`
}

func (c *Client) ListStoredScripts(
	ctx context.Context,
	workspace string,
) ([]irminmodels.StoredScript, *irminmodels.IrminAPIResponse, error) {
	var storedScripts []irminmodels.StoredScript
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/scripts", workspace),
	}, &storedScripts)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch stored scripts error: %w", err)
	}
	return storedScripts, apiResp, nil
}

func (c *Client) GetStoredScript(
	ctx context.Context,
	workspace, scriptID string,
) (*irminmodels.StoredScript, *irminmodels.IrminAPIResponse, error) {
	var storedScript irminmodels.StoredScript
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/scripts/%s", workspace, scriptID),
	}, &storedScript)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch stored script error: %w", err)
	}
	return &storedScript, apiResp, nil
}

func (c *Client) CreateStoredScript(
	ctx context.Context,
	workspace string,
	req CreateScriptRequest,
) (*irminmodels.StoredScript, *irminmodels.IrminAPIResponse, error) {
	var storedScript irminmodels.StoredScript
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/scripts", workspace),
		ContentType: "application/json",
		Body:        req,
	}, &storedScript)
	if err != nil {
		return nil, nil, fmt.Errorf("create stored script error: %w", err)
	}
	return &storedScript, apiResp, nil
}

func (c *Client) UpdateStoredScript(
	ctx context.Context,
	workspace, scriptID string,
	req UpdateScriptRequest,
) (*irminmodels.StoredScript, *irminmodels.IrminAPIResponse, error) {
	var storedScript irminmodels.StoredScript
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPatch,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/scripts/%s", workspace, scriptID),
		ContentType: "application/json",
		Body:        req,
	}, &storedScript)
	if err != nil {
		return nil, nil, fmt.Errorf("update stored script error: %w", err)
	}
	return &storedScript, apiResp, nil
}

func (c *Client) DeleteStoredScript(
	ctx context.Context,
	workspace, scriptID string,
) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodDelete,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/scripts/%s", workspace, scriptID),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete stored script error: %w", err)
	}
	return apiResp, nil
}

func (c *Client) TransferStoredScript(
	ctx context.Context,
	workspace, scriptID string,
	req TransferScriptOwnershipRequest,
) (*irminmodels.StoredScript, *irminmodels.IrminAPIResponse, error) {
	var storedScript irminmodels.StoredScript
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/scripts/%s/transfer-ownership", workspace, scriptID),
		ContentType: "application/json",
		Body:        req,
	}, &storedScript)
	if err != nil {
		return nil, nil, fmt.Errorf("stored script ownership transfer error: %w", err)
	}
	return &storedScript, apiResp, nil
}

func (c *Client) ExecuteStoredScript(
	ctx context.Context,
	workspace, scriptID string,
	req ExecuteScriptRequest,
) (*irminmodels.ScriptResult, *irminmodels.IrminAPIResponse, error) {
	var result irminmodels.ScriptResult
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/scripts/%s/execute", workspace, scriptID),
		ContentType: "application/json",
		Body:        req,
	}, &result)
	if err != nil {
		return nil, nil, fmt.Errorf("execute stored script error: %w", err)
	}
	return &result, apiResp, nil
}
