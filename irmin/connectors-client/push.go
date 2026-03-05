package connectorsclient

import (
	"context"
	"net/http"
)

// OperationPush sends a file to the /operation/push endpoint along with a target path.
//
// Note: Operation token is required for this operation.
//
// Parameters:
// - ctx: Context for request cancellation and timeout control.
// - path: A form field "path" with the provided path value.
// - file: A form file "file" containing the file to push.
//
// Returns:
// - A string containing the response message from the push operation.
// - An error if the request fails.
func (c *Client) OperationPush(ctx context.Context, path string, file FormFile) (string, error) {
	file.FieldName = "file" // Set the field name for the file.
	// Set up the request options for the push operation.
	opts := RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/operation/push",
		ContentType: "multipart/form-data",
		FormFields: map[string]string{
			"path": path,
		},
		Files: []FormFile{file},
	}

	// Send the request and get the raw response.
	data, err := c.Request(ctx, opts)
	if err != nil {
		return "", err
	}

	// Return the response message as a string.
	return string(data), nil
}

// OperationPushPresigned sends a presigned URL to the /operation/push endpoint
// instead of uploading the file directly. The connector downloads the file from
// the presigned URL, avoiding in-memory buffering of large payloads.
func (c *Client) OperationPushPresigned(ctx context.Context, path, presignedURL string) (string, error) {
	opts := RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/operation/push",
		ContentType: "multipart/form-data",
		FormFields: map[string]string{
			"path":          path,
			"presigned_url": presignedURL,
		},
	}

	data, err := c.Request(ctx, opts)
	if err != nil {
		return "", err
	}

	return string(data), nil
}
