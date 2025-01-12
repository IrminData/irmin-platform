package services

import (
	"fmt"
	"irmin-sdk/client"
	"irmin-sdk/models"
	"net/http"
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
	form := map[string]string{
		"name":      file.Name,
		"path":      file.Path,
		"contents":  file.Contents,
		"extension": string(file.Type),
		"is_draft":  fmt.Sprintf("%v", isDraft),
	}

	var createdFile models.EditorItemsFile
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/v1/editor-items/files",
		ContentType: "application/x-www-form-urlencoded",
		FormFields:  form,
	}, &createdFile)
	if err != nil {
		return nil, nil, fmt.Errorf("create file error: %w", err)
	}
	return &createdFile, apiResp, nil
}

// UpdateFile updates an existing file in the editor items
func (s *EditorItemsService) UpdateFile(
	name, path, contents, extension, owner, originalPath string, isDraft bool,
) (*models.EditorItemsFile, *client.IrminAPIResponse, error) {
	form := map[string]string{
		"_method":       "PATCH",
		"name":          name,
		"path":          path,
		"contents":      contents,
		"extension":     extension,
		"owner":         owner,
		"original_path": originalPath,
		"is_draft":      fmt.Sprintf("%v", isDraft),
	}

	var updatedFile models.EditorItemsFile
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/v1/editor-items/files",
		ContentType: "application/x-www-form-urlencoded",
		FormFields:  form,
	}, &updatedFile)
	if err != nil {
		return nil, nil, fmt.Errorf("create file error: %w", err)
	}
	return &updatedFile, apiResp, nil

}

// DeleteFile deletes a file from the editor items
func (s *EditorItemsService) DeleteFile(name, extension, path string) (*client.IrminAPIResponse, error) {
	form := map[string]string{
		"_method":   "DELETE",
		"name":      name,
		"extension": extension,
		"path":      path,
	}

	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/v1/editor-items/files",
		ContentType: "application/x-www-form-urlencoded",
		FormFields:  form,
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete file error: %w", err)
	}
	return apiResp, nil
}

// CreateFolder creates a new folder in the editor items
func (s *EditorItemsService) CreateFolder(folder *models.EditorItemsFolder) (*models.EditorItemsFolder, *client.IrminAPIResponse, error) {
	form := map[string]string{
		"name": folder.Name,
		"path": folder.Path,
	}

	var createdFolder models.EditorItemsFolder
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/v1/editor-items/folders",
		ContentType: "application/x-www-form-urlencoded",
		FormFields:  form,
	}, &createdFolder)
	if err != nil {
		return nil, nil, fmt.Errorf("create folder error: %w", err)
	}
	return &createdFolder, apiResp, nil
}

// DeleteFolder deletes a folder from the editor items
func (s *EditorItemsService) DeleteFolder(name, path string) (*client.IrminAPIResponse, error) {
	form := map[string]string{
		"_method": "DELETE",
		"name":    name,
		"path":    path,
	}

	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/v1/editor-items/folders",
		ContentType: "application/x-www-form-urlencoded",
		FormFields:  form,
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete folder error: %w", err)
	}
	return apiResp, nil
}
