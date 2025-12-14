package irmincore

import (
	"bytes"
	"context"
	"fmt"
	"net/http"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// MoveObjectRequest represents the JSON request body for moving/copying repository objects.
type MoveObjectRequest struct {
	NewPath string `json:"new_path" validate:"required" example:"path/to/new/location"`
}

// UploadObjectFromURLRequest represents the JSON request body for uploading objects from URLs.
type UploadObjectFromURLRequest struct {
	URL     string            `json:"url"            validate:"required"                      example:"https://example.com/file.json"`
	Headers map[string]string `json:"headers"        validate:"omitempty"                     example:"Authorization: Bearer <token>"`
	Tags    []string          `json:"tags,omitempty" validate:"omitempty,dive,validsqid=tags" example:"tag_7k3m9x2n5q8p"`
}

// GetObjectAtPath fetches the object at the given path and ref.
func (c *Client) GetObjectAtPath(
	ctx context.Context,
	workspace, repository, path, ref string,
) (*irminmodels.Object, *irminmodels.IrminAPIResponse, error) {
	var objects irminmodels.Object
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method: http.MethodGet,
		Endpoint: fmt.Sprintf(
			"/v1/workspaces/%s/repositories/%s/objects?ref=%s&path=%s",
			workspace,
			repository,
			ref,
			path,
		),
	}, &objects)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch objects error: %w", err)
	}
	return &objects, apiResp, nil
}

// GetObjectHistory fetches the history of an object at the given path and ref.
func (c *Client) GetObjectHistory(
	ctx context.Context,
	workspace, repository, path, ref string,
) ([]irminmodels.Commit, *irminmodels.IrminAPIResponse, error) {
	var commits []irminmodels.Commit
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method: http.MethodGet,
		Endpoint: fmt.Sprintf(
			"/v1/workspaces/%s/repositories/%s/objects/history?ref=%s&path=%s",
			workspace,
			repository,
			ref,
			path,
		),
	}, &commits)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch object history error: %w", err)
	}
	return commits, apiResp, nil
}

// GetObjectSchema fetches the schema of an object at the given path and ref.
func (c *Client) GetObjectSchema(
	ctx context.Context,
	workspace, repository, path, ref string,
) (*irminmodels.ObjectSchema, *irminmodels.IrminAPIResponse, error) {
	var schema irminmodels.ObjectSchema
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method: http.MethodGet,
		Endpoint: fmt.Sprintf(
			"/v1/workspaces/%s/repositories/%s/objects/schema?ref=%s&path=%s",
			workspace,
			repository,
			ref,
			path,
		),
	}, &schema)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch object schema error: %w", err)
	}
	return &schema, apiResp, nil
}

// UploadObject uploads a file to the given path and ref.
func (c *Client) UploadObject(
	ctx context.Context,
	workspace, repository, ref, path string,
	files map[string][]byte,
) (*irminmodels.Object, *irminmodels.IrminAPIResponse, error) {
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

	var object irminmodels.Object
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method: http.MethodPost,
		Endpoint: fmt.Sprintf(
			"/v1/workspaces/%s/repositories/%s/objects?ref=%s&path=%s",
			workspace,
			repository,
			ref,
			path,
		),
		Files:       formFiles,
		ContentType: "multipart/form-data",
	}, &object)
	if err != nil {
		return nil, nil, fmt.Errorf("upload object error: %w", err)
	}

	return &object, apiResp, nil
}

// UploadObjectFromURL uploads an object from a URL to the given path and ref.
func (c *Client) UploadObjectFromURL(
	ctx context.Context,
	workspace, repository, ref, path string,
	req UploadObjectFromURLRequest,
) (*irminmodels.Object, *irminmodels.IrminAPIResponse, error) {
	var object irminmodels.Object
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method: http.MethodPost,
		Endpoint: fmt.Sprintf(
			"/v1/workspaces/%s/repositories/%s/objects/upload-from-url?ref=%s&path=%s",
			workspace,
			repository,
			ref,
			path,
		),
		ContentType: "application/json",
		Body:        req,
	}, &object)
	if err != nil {
		return nil, nil, fmt.Errorf("upload object from URL error: %w", err)
	}
	return &object, apiResp, nil
}

// GetObjectContent fetches the content of an object at the given path and ref.
func (c *Client) GetObjectContent(
	ctx context.Context,
	workspace, repository, path, ref string,
	limitResponse bool,
) ([]byte, error) {
	endpoint := fmt.Sprintf(
		"/v1/workspaces/%s/repositories/%s/objects/content?ref=%s&path=%s",
		workspace,
		repository,
		ref,
		path,
	)
	if limitResponse {
		endpoint = AddLimitResponseParam(endpoint)
	}

	apiResp, err := c.FetchBinary(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	})
	if err != nil {
		return nil, fmt.Errorf("fetch content error: %w", err)
	}
	return apiResp, nil
}

// GetObjectStructuredContent fetches the parsed structured content of an object at the given path and ref.
func (c *Client) GetObjectStructuredContent(
	ctx context.Context,
	workspace, repository, path, ref string,
	limitResponse bool,
) (map[string]any, *irminmodels.IrminAPIResponse, error) {
	endpoint := fmt.Sprintf(
		"/v1/workspaces/%s/repositories/%s/objects/content/structured?ref=%s&path=%s",
		workspace,
		repository,
		ref,
		path,
	)
	if limitResponse {
		endpoint = AddLimitResponseParam(endpoint)
	}

	var structuredContent map[string]any
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &structuredContent)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch structured content error: %w", err)
	}
	return structuredContent, apiResp, nil
}

// DownloadObject creates a zip file of the object at the given path and ref and returns the binary data.
func (c *Client) DownloadObject(ctx context.Context, workspace, repository, path, ref string) ([]byte, error) {
	apiResp, err := c.FetchBinary(ctx, RequestOptions{
		Method: http.MethodGet,
		Endpoint: fmt.Sprintf(
			"/v1/workspaces/%s/repositories/%s/objects/download?ref=%s&path=%s",
			workspace,
			repository,
			ref,
			path,
		),
	})
	if err != nil {
		return nil, fmt.Errorf("fetch object download zip error: %w", err)
	}
	return apiResp, nil
}

func (c *Client) MoveObject(
	ctx context.Context,
	workspace, repository, path, ref string,
	req MoveObjectRequest,
) (*irminmodels.Object, *irminmodels.IrminAPIResponse, error) {
	var object irminmodels.Object
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method: http.MethodPost,
		Endpoint: fmt.Sprintf(
			"/v1/workspaces/%s/repositories/%s/objects/move?ref=%s&path=%s",
			workspace,
			repository,
			ref,
			path,
		),
		ContentType: "application/json",
		Body:        req,
	}, &object)
	if err != nil {
		return nil, nil, fmt.Errorf("move object error: %w", err)
	}
	return &object, apiResp, nil
}

func (c *Client) CopyObject(
	ctx context.Context,
	workspace, repository, path, ref string,
	req MoveObjectRequest,
) (*irminmodels.Object, *irminmodels.IrminAPIResponse, error) {
	var object irminmodels.Object
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method: http.MethodPost,
		Endpoint: fmt.Sprintf(
			"/v1/workspaces/%s/repositories/%s/objects/copy?ref=%s&path=%s",
			workspace,
			repository,
			ref,
			path,
		),
		ContentType: "application/json",
		Body:        req,
	}, &object)
	if err != nil {
		return nil, nil, fmt.Errorf("copy object error: %w", err)
	}
	return &object, apiResp, nil
}

func (c *Client) DeleteObject(
	ctx context.Context,
	workspace, repository, ref, path string,
) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method: http.MethodDelete,
		Endpoint: fmt.Sprintf(
			"/v1/workspaces/%s/repositories/%s/objects?ref=%s&path=%s",
			workspace,
			repository,
			ref,
			path,
		),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete object error: %w", err)
	}
	return apiResp, nil
}
