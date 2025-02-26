package irminCore

import (
	"fmt"
	"net/http"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

// EditorItemsService handles editor item-related operations
type EditorItemsService struct {
	client *Client
}

// NewEditorItemsService creates a new instance of EditorItemsService
func NewEditorItemsService(client *Client) *EditorItemsService {
	return &EditorItemsService{
		client: client,
	}
}

// FetchEditorItems retrieves all editor items
func (s *EditorItemsService) FetchEditorItems() (*irminModels.EditorItems, *irminModels.IrminAPIResponse, error) {
	endpoint := "/v1/editor-items"
	var editorItems irminModels.EditorItems

	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &editorItems)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch editor items error: %w", err)
	}
	return &editorItems, apiResp, nil
}

// CreateFile creates a new file in the editor items
func (s *EditorItemsService) CreateFile(file *irminModels.EditorItemsFile, isDraft bool) (*irminModels.EditorItemsFile, *irminModels.IrminAPIResponse, error) {
	form := map[string]string{
		"name":      file.Name,
		"path":      file.Path,
		"contents":  file.Contents,
		"extension": string(file.Type),
		"is_draft":  fmt.Sprintf("%v", isDraft),
	}

	var createdFile irminModels.EditorItemsFile
	apiResp, err := s.client.FetchAPI(RequestOptions{
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
) (*irminModels.EditorItemsFile, *irminModels.IrminAPIResponse, error) {
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

	var updatedFile irminModels.EditorItemsFile
	apiResp, err := s.client.FetchAPI(RequestOptions{
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
func (s *EditorItemsService) DeleteFile(name, extension, path string) (*irminModels.IrminAPIResponse, error) {
	form := map[string]string{
		"_method":   "DELETE",
		"name":      name,
		"extension": extension,
		"path":      path,
	}

	apiResp, err := s.client.FetchAPI(RequestOptions{
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
func (s *EditorItemsService) CreateFolder(folder *irminModels.EditorItemsFolder) (*irminModels.EditorItemsFolder, *irminModels.IrminAPIResponse, error) {
	form := map[string]string{
		"name": folder.Name,
		"path": folder.Path,
	}

	var createdFolder irminModels.EditorItemsFolder
	apiResp, err := s.client.FetchAPI(RequestOptions{
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
func (s *EditorItemsService) DeleteFolder(name, path string) (*irminModels.IrminAPIResponse, error) {
	form := map[string]string{
		"_method": "DELETE",
		"name":    name,
		"path":    path,
	}

	apiResp, err := s.client.FetchAPI(RequestOptions{
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
