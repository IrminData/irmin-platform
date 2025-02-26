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

// FetchObjects retrieves objects at a given path in a repository and ref
func (s *ObjectService) FetchObjects(repository, path, ref string) ([]irminModels.Object, *irminModels.IrminAPIResponse, error) {
	// Build the endpoint: /v1/repositories/:repository/objects/:path removing the first / from path if it exists
	if len(path) > 0 && path[0] == '/' {
		path = path[1:]
	}
	endpoint := fmt.Sprintf("/v1/repositories/%s/objects/%s", repository, path)

	// Add ref query parameter if provided
	if ref != "" {
		endpoint += fmt.Sprintf("?ref=%s", ref)
	}

	var objects []irminModels.Object
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &objects)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch objects error: %w", err)
	}
	return objects, apiResp, nil
}

// FetchObject retrieves a single object by its name and path in a repository
func (s *ObjectService) FetchObject(repository, path, ref string) (*irminModels.Object, *irminModels.IrminAPIResponse, error) {
	// Build the endpoint: /v1/repositories/:repository/objects/:path removing the first / from path if it exists
	if len(path) > 0 && path[0] == '/' {
		path = path[1:]
	}
	endpoint := fmt.Sprintf("/v1/repositories/%s/objects/%s", repository, path)

	// Add ref query parameter if provided
	if ref != "" {
		endpoint += fmt.Sprintf("?ref=%s", ref)
	}

	var object irminModels.Object
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &object)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch object error: %w", err)
	}
	return &object, apiResp, nil
}

// FetchObjectSchema retrieves the schema of an object in a repository
func (s *ObjectService) FetchObjectSchema(repository, path, ref string) (*irminModels.ObjectSchema, *irminModels.IrminAPIResponse, error) {
	endpoint := fmt.Sprintf("/v1/repositories/%s/objects/schema/%s", repository, path)
	if ref != "" {
		endpoint += fmt.Sprintf("?ref=%s", ref)
	}

	var schema irminModels.ObjectSchema
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &schema)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch object schema error: %w", err)
	}
	return &schema, apiResp, nil
}

// FetchContent retrieves the content of an object at a given path
func (s *ObjectService) FetchContent(repository, path, ref string, raw bool) ([]byte, error) {
	endpoint := fmt.Sprintf("/v1/repositories/%s/objects/content/%s", repository, path)
	if ref != "" {
		endpoint += fmt.Sprintf("?ref=%s", ref)
	}
	if raw {
		endpoint += "&raw=true"
	}

	apiResp, err := s.client.FetchBinary(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	})
	if err != nil {
		return nil, fmt.Errorf("fetch content error: %w", err)
	}
	return apiResp, nil
}

// UploadObject creates or updates an object in the repository
func (s *ObjectService) UploadObject(
	repository string,
	ref string,
	path string,
	name string,
	files map[string][]byte,
) (*irminModels.Object, *irminModels.IrminAPIResponse, error) {

	// Build the endpoint: /v1/repositories/:repository/objects/:path removing the first / from path if it exists
	if len(path) > 0 && path[0] == '/' {
		path = path[1:]
	}
	endpoint := fmt.Sprintf("/v1/repositories/%s/objects/%s", repository, path)

	// Convert files map into []FormFile
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

	// Build form fields for non-file data
	formFields := map[string]string{
		"ref": ref,
	}

	// Construct your RequestOptions for a multipart form upload
	reqOpts := RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    endpoint,
		FormFields:  formFields,
		Files:       formFiles,
		ContentType: "multipart/form-data",
	}

	// Prepare an object to hold the response data
	var object irminModels.Object

	// FetchAPI will also parse the IrminAPIResponse
	apiResp, err := s.client.FetchAPI(reqOpts, &object)
	if err != nil {
		return nil, nil, fmt.Errorf("upload object error: %w", err)
	}

	return &object, apiResp, nil
}

// MoveObject moves or renames an object in the repository
func (s *ObjectService) MoveObject(repository, ref, path, newPath, newName string) (*irminModels.Object, *irminModels.IrminAPIResponse, error) {
	form := map[string]string{
		"_method":  "MOVE",
		"ref":      ref,
		"new_path": newPath,
		"new_name": newName,
	}

	// Build the endpoint: /v1/repositories/:repository/objects/:path removing the first / from path if it exists
	if len(path) > 0 && path[0] == '/' {
		path = path[1:]
	}
	endpoint := fmt.Sprintf("/v1/repositories/%s/objects/%s", repository, path)

	var object irminModels.Object
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    endpoint,
		ContentType: "application/x-www-form-urlencoded",
		FormFields:  form,
	}, &object)
	if err != nil {
		return nil, nil, fmt.Errorf("move object error: %w", err)
	}
	return &object, apiResp, nil
}

// DeleteObject deletes an object from the repository
func (s *ObjectService) DeleteObject(repository, ref, path, name string) (*irminModels.IrminAPIResponse, error) {
	form := map[string]string{
		"_method": "DELETE",
		"ref":     ref,
	}

	// Build the endpoint: /v1/repositories/:repository/objects/:path removing the first / from path if it exists
	if len(path) > 0 && path[0] == '/' {
		path = path[1:]
	}
	endpoint := fmt.Sprintf("/v1/repositories/%s/objects/%s", repository, path)

	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    endpoint,
		ContentType: "application/x-www-form-urlencoded",
		FormFields:  form,
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete object error: %w", err)
	}
	return apiResp, nil
}
