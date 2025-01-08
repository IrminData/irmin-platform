package services

import (
	"fmt"
	"irmin-sdk/client"
	"irmin-sdk/models"
	"net/http"
	"net/url"
	"strings"
)

// EditorItemsService handles editor item-related operations
type EditorItemsService struct {
	client *client.Client
}

// NewEditorItemsService creates a new instance of EditorItemsService
func NewEditorItemsService(client *client.Client) *EditorItemsService {
	return &EditorItemsService{
		client: client,
	}
}

// FetchEditorItems retrieves all editor items
func (s *EditorItemsService) FetchEditorItems() (*models.EditorItems, *client.IrminAPIResponse, error) {
	endpoint := "/v1/editor-items"
	var editorItems models.EditorItems

	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &editorItems)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch editor items error: %w", err)
	}
	return &editorItems, apiResp, nil
}

// CreateFile creates a new file in the editor items
func (s *EditorItemsService) CreateFile(file *models.EditorItemsFile, isDraft bool) (*models.EditorItemsFile, *client.IrminAPIResponse, error) {
	form := url.Values{}
	form.Set("name", file.Name)
	form.Set("path", file.Path)
	form.Set("contents", file.Contents)
	form.Set("extension", string(file.Type))
	form.Set("is_draft", fmt.Sprintf("%v", isDraft))

	var createdFile models.EditorItemsFile
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/v1/editor-items/files",
		ContentType: "application/x-www-form-urlencoded",
		Body:        strings.NewReader(form.Encode()),
	}, &createdFile)
	if err != nil {
		return nil, nil, fmt.Errorf("create file error: %w", err)
	}
	return &createdFile, apiResp, nil
}

// DeleteFile deletes a file from the editor items
func (s *EditorItemsService) DeleteFile(path string) (*client.IrminAPIResponse, error) {
	form := url.Values{}
	form.Set("_method", "DELETE")
	form.Set("path", path)

	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/v1/editor-items/files",
		ContentType: "application/x-www-form-urlencoded",
		Body:        strings.NewReader(form.Encode()),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete file error: %w", err)
	}
	return apiResp, nil
}

// CreateFolder creates a new folder in the editor items
func (s *EditorItemsService) CreateFolder(folder *models.EditorItemsFolder) (*models.EditorItemsFolder, *client.IrminAPIResponse, error) {
	form := url.Values{}
	form.Set("name", folder.Name)
	form.Set("path", folder.Path)

	var createdFolder models.EditorItemsFolder
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/v1/editor-items/folders",
		ContentType: "application/x-www-form-urlencoded",
		Body:        strings.NewReader(form.Encode()),
	}, &createdFolder)
	if err != nil {
		return nil, nil, fmt.Errorf("create folder error: %w", err)
	}
	return &createdFolder, apiResp, nil
}

// DeleteFolder deletes a folder from the editor items
func (s *EditorItemsService) DeleteFolder(path string) (*client.IrminAPIResponse, error) {
	form := url.Values{}
	form.Set("_method", "DELETE")
	form.Set("path", path)

	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/v1/editor-items/folders",
		ContentType: "application/x-www-form-urlencoded",
		Body:        strings.NewReader(form.Encode()),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete folder error: %w", err)
	}
	return apiResp, nil
}
