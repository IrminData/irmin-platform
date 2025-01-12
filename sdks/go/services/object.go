package services

import (
	"bytes"
	"fmt"
	"irmin-sdk/client"
	"irmin-sdk/models"
	"mime/multipart"
	"net/http"
)

// ObjectService handles repository object-related API calls
type ObjectService struct {
	client *client.Client
}

// NewObjectService creates a new ObjectService
func NewObjectService(client *client.Client) *ObjectService {
	return &ObjectService{
		client: client,
	}
}

// FetchObjects retrieves objects at a given path in a repository and ref
func (s *ObjectService) FetchObjects(repository, path, ref string) ([]models.Object, *client.IrminAPIResponse, error) {
	endpoint := fmt.Sprintf("/v1/repositories/%s/objects/%s", repository, path)
	if ref != "" {
		endpoint += fmt.Sprintf("?ref=%s", ref)
	}

	var objects []models.Object
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &objects)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch objects error: %w", err)
	}
	return objects, apiResp, nil
}

// FetchObject retrieves a single object by its name and path in a repository
func (s *ObjectService) FetchObject(repository, path, ref string) (*models.Object, *client.IrminAPIResponse, error) {
	endpoint := fmt.Sprintf("/v1/repositories/%s/objects/%s", repository, path)
	if ref != "" {
		endpoint += fmt.Sprintf("?ref=%s", ref)
	}

	var object models.Object
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &object)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch object error: %w", err)
	}
	return &object, apiResp, nil
}

// FetchObjectSchema retrieves the schema of an object in a repository
func (s *ObjectService) FetchObjectSchema(repository, path, ref string) (*models.ObjectSchema, *client.IrminAPIResponse, error) {
	endpoint := fmt.Sprintf("/v1/repositories/%s/objects/schema/%s", repository, path)
	if ref != "" {
		endpoint += fmt.Sprintf("?ref=%s", ref)
	}

	var schema models.ObjectSchema
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
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

	apiResp, err := s.client.FetchBinary(client.RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	})
	if err != nil {
		return nil, fmt.Errorf("fetch content error: %w", err)
	}
	return apiResp, nil
}

// UploadObject creates or updates an object in the repository
func (s *ObjectService) UploadObject(repository, ref, path, name string, files map[string][]byte) (*models.Object, *client.IrminAPIResponse, error) {
	endpoint := fmt.Sprintf("/v1/repositories/%s/objects/%s/%s", repository, path, name)
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	// Add ref field
	if err := writer.WriteField("ref", ref); err != nil {
		return nil, nil, fmt.Errorf("write ref field error: %w", err)
	}

	// Add files
	for fileName, fileContent := range files {
		part, err := writer.CreateFormFile("file", fileName)
		if err != nil {
			return nil, nil, fmt.Errorf("create form file error: %w", err)
		}
		if _, err := part.Write(fileContent); err != nil {
			return nil, nil, fmt.Errorf("write file content error: %w", err)
		}
	}

	if err := writer.Close(); err != nil {
		return nil, nil, fmt.Errorf("close writer error: %w", err)
	}

	var object models.Object
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    endpoint,
		ContentType: writer.FormDataContentType(),
		Body:        body,
	}, &object)
	if err != nil {
		return nil, nil, fmt.Errorf("upload object error: %w", err)
	}
	return &object, apiResp, nil
}

// MoveObject moves or renames an object in the repository
func (s *ObjectService) MoveObject(repository, ref, path, newPath, newName string) (*models.Object, *client.IrminAPIResponse, error) {
	form := map[string]string{
		"_method":  "MOVE",
		"ref":      ref,
		"new_path": newPath,
		"new_name": newName,
	}

	var object models.Object
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/repositories/%s/objects/%s", repository, path),
		ContentType: "application/x-www-form-urlencoded",
		FormFields:  form,
	}, &object)
	if err != nil {
		return nil, nil, fmt.Errorf("move object error: %w", err)
	}
	return &object, apiResp, nil
}

// DeleteObject deletes an object from the repository
func (s *ObjectService) DeleteObject(repository, ref, path, name string) (*client.IrminAPIResponse, error) {
	form := map[string]string{
		"_method": "DELETE",
		"ref":     ref,
	}

	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/repositories/%s/objects/%s/%s", repository, path, name),
		ContentType: "application/x-www-form-urlencoded",
		FormFields:  form,
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete object error: %w", err)
	}
	return apiResp, nil
}
