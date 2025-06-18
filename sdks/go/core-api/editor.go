package irmincore

import (
	"fmt"
	"net/http"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

type EditorItemType string

const (
	EditorItemTypeFile   EditorItemType = "file"
	EditorItemTypeFolder EditorItemType = "folder"
)

// CreateEditorItemRequest represents the JSON request body for creating an editor file.
type CreateEditorItemRequest struct {
	Content *string        `json:"content,omitempty"`
	Type    EditorItemType `json:"type"              validate:"required"`
}

// MoveEditorItemRequest represents the JSON request body for moving editor items.
type MoveEditorItemRequest struct {
	DestinationPath string `json:"destination_path" validate:"required"`
}

// ExecuteEditorItemRequest represents the JSON request body for executing editor items.
type ExecuteEditorItemRequest struct {
	Input []irminmodels.ActionInputData `json:"input,omitempty"`
}

func (c *Client) ListEditorItems(
	workspace, path string,
) ([]irminmodels.EditorItem, *irminmodels.IrminAPIResponse, error) {
	var editorItems []irminmodels.EditorItem
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/editor?path=%s", workspace, path),
	}, &editorItems)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch editor items error: %w", err)
	}
	return editorItems, apiResp, nil
}

func (c *Client) GetEditorItemContent(workspace, path string) (*string, *irminmodels.IrminAPIResponse, error) {
	var editorItemContent string
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/editor/content?path=%s", workspace, path),
	}, &editorItemContent)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch editor item content error: %w", err)
	}
	return &editorItemContent, apiResp, nil
}

func (c *Client) MoveEditorItem(
	workspace, path string,
	req MoveEditorItemRequest,
) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/editor/move?path=%s", workspace, path),
		ContentType: "application/json",
		Body:        req,
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("move editor item error: %w", err)
	}
	return apiResp, nil
}

func (c *Client) CopyEditorItem(
	workspace, path string,
	req MoveEditorItemRequest,
) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/editor/copy?path=%s", workspace, path),
		ContentType: "application/json",
		Body:        req,
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("copy editor item error: %w", err)
	}
	return apiResp, nil
}

func (c *Client) DeleteEditorItem(workspace, path string) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodDelete,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/editor?path=%s", workspace, path),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete editor item error: %w", err)
	}
	return apiResp, nil
}

func (c *Client) SaveEditorItem(
	workspace, path string,
	req CreateEditorItemRequest,
) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/editor?path=%s", workspace, path),
		ContentType: "application/json",
		Body:        req,
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("save editor item error: %w", err)
	}
	return apiResp, nil
}

func (c *Client) CreateEditorFolder(
	workspace, path string,
	req CreateEditorItemRequest,
) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/editor?path=%s", workspace, path),
		ContentType: "application/json",
		Body:        req,
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("create editor folder error: %w", err)
	}
	return apiResp, nil
}

func (c *Client) RunScript(
	workspace, path string,
	inputs []irminmodels.ActionInputData,
) (*irminmodels.ScriptResult, *irminmodels.IrminAPIResponse, error) {
	req := ExecuteEditorItemRequest{
		Input: inputs,
	}

	var scriptResult irminmodels.ScriptResult
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/editor/run?path=%s", workspace, path),
		ContentType: "application/json",
		Body:        req,
	}, &scriptResult)
	if err != nil {
		return nil, nil, fmt.Errorf("run script error: %w", err)
	}
	return &scriptResult, apiResp, nil
}
