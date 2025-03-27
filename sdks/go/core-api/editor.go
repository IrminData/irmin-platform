package irminCore

import (
	"fmt"
	"net/http"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

func (c *Client) ListEditorItems(workspace, path string) ([]irminModels.EditorItem, *irminModels.IrminAPIResponse, error) {
	var editorItems []irminModels.EditorItem
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/editor?path=%s", workspace, path),
	}, &editorItems)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch editor items error: %w", err)
	}
	return editorItems, apiResp, nil
}

func (c *Client) GetEditorItemContent(workspace, path string) (*string, *irminModels.IrminAPIResponse, error) {
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

func (c *Client) MoveEditorItem(workspace, path, destinationPath string) (*irminModels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/editor/move?path=%s", workspace, path),
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"destination_path": destinationPath,
		},
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("move editor item error: %w", err)
	}
	return apiResp, nil
}

func (c *Client) CopyEditorItem(workspace, path, destinationPath string) (*irminModels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/editor/copy?path=%s", workspace, path),
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"destination_path": destinationPath,
		},
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("copy editor item error: %w", err)
	}
	return apiResp, nil
}

func (c *Client) DeleteEditorItem(workspace, path string) (*irminModels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodDelete,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/editor?path=%s", workspace, path),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete editor item error: %w", err)
	}
	return apiResp, nil
}

func (c *Client) SaveEditorItem(workspace, path, content string) (*irminModels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/editor?path=%s", workspace, path),
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"type":    "file",
			"content": content,
		},
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("save editor item error: %w", err)
	}
	return apiResp, nil
}

func (c *Client) CreateEditorFolder(workspace, path string) (*irminModels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/editor?path=%s", workspace, path),
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"type": "folder",
		},
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("create editor folder error: %w", err)
	}
	return apiResp, nil
}
