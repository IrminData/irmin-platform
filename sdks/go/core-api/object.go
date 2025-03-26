package irminCore

import (
	"bytes"
	"fmt"
	"net/http"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

// ObjectService handles repository object-related API calls
type ObjectService struct {
	client *Client
}

// NewObjectService creates a new ObjectService
func NewObjectService(client *Client) *ObjectService {
	return &ObjectService{
		client: client,
	}
}

func (s *ObjectService) GetObjectAtPath(workspace, repository, path, ref string) (*irminModels.Object, *irminModels.IrminAPIResponse, error) {
	var objects irminModels.Object
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/repositories/%s/objects?ref=%s&path=%s", workspace, repository, ref, path),
	}, &objects)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch objects error: %w", err)
	}
	return &objects, apiResp, nil
}

func (s *ObjectService) GetObjectHistory(workspace, repository, path, ref string) ([]irminModels.Commit, *irminModels.IrminAPIResponse, error) {
	var commits []irminModels.Commit
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/repositories/%s/objects/history?ref=%s&path=%s", workspace, repository, ref, path),
	}, &commits)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch object history error: %w", err)
	}
	return commits, apiResp, nil
}

func (s *ObjectService) GetObjectSchema(workspace, repository, path, ref string) (*irminModels.ObjectSchema, *irminModels.IrminAPIResponse, error) {
	var schema irminModels.ObjectSchema
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/repositories/%s/objects/schema?ref=%s&path=%s", workspace, repository, ref, path),
	}, &schema)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch object schema error: %w", err)
	}
	return &schema, apiResp, nil
}

func (s *ObjectService) UploadObject(workspace, repository, ref, path, name string, files map[string][]byte) (*irminModels.Object, *irminModels.IrminAPIResponse, error) {
	var formFiles []FormFile
	for fileName, fileContent := range files {
		// Use bytes.NewReader for in-memory file data
		reader := bytes.NewReader(fileContent)
		formFiles = append(formFiles, FormFile{
			FieldName: "file",   // The multipart form field name
			FileName:  fileName, // The filename to send in the multipart
			Reader:    reader,   // The file contents
		})
	}

	var object irminModels.Object
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/repositories/%s/objects?ref=%s&path=%s", workspace, repository, ref, path),
		Files:       formFiles,
		ContentType: "multipart/form-data",
	}, &object)
	if err != nil {
		return nil, nil, fmt.Errorf("upload object error: %w", err)
	}

	return &object, apiResp, nil
}

func (s *ObjectService) GetObjectContent(workspace, repository, path, ref string) ([]byte, error) {
	apiResp, err := s.client.FetchBinary(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/repositories/%s/objects/content?ref=%s&path=%s", workspace, repository, ref, path),
	})
	if err != nil {
		return nil, fmt.Errorf("fetch content error: %w", err)
	}
	return apiResp, nil
}

func (s *ObjectService) MoveObject(workspace, repository, path, ref, newPath string) (*irminModels.Object, *irminModels.IrminAPIResponse, error) {
	var object irminModels.Object
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/repositories/%s/objects/move?ref=%s&path=%s", workspace, repository, ref, path),
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"new_path": newPath,
		},
	}, &object)
	if err != nil {
		return nil, nil, fmt.Errorf("move object error: %w", err)
	}
	return &object, apiResp, nil
}

func (s *ObjectService) CopyObject(workspace, repository, path, ref, newPath string) (*irminModels.Object, *irminModels.IrminAPIResponse, error) {
	var object irminModels.Object
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/repositories/%s/objects/copy?ref=%s&path=%s", workspace, repository, ref, path),
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"new_path": newPath,
		},
	}, &object)
	if err != nil {
		return nil, nil, fmt.Errorf("copy object error: %w", err)
	}
	return &object, apiResp, nil
}

func (s *ObjectService) DeleteObject(workspace, repository, ref, path string) (*irminModels.IrminAPIResponse, error) {
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodDelete,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/repositories/%s/objects?ref=%s&path=%s", workspace, repository, ref, path),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete object error: %w", err)
	}
	return apiResp, nil
}
