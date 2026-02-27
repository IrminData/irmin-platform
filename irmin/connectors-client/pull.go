package connectorsclient

import (
	"context"
	"io"
	"net/http"
)

// OperationPull sends a POST request to the /operation/pull endpoint, retrieves the full streamed content,
// extracts the filename from the Content-Disposition header (if available), and returns both.
//
// Note: Operation token is required for this operation.
//
// Parameters:
// - ctx: Context for request cancellation and timeout control.
// - path: The path in the connector to pull data for.
//
// Returns:
// - A slice of PulledFile objects containing the following:
//   - Byte map containing the full streamed content.
//   - String containing the filename extracted from the Content-Disposition header (if present).
//
// - An error if the request fails.
func (c *Client) OperationPull(ctx context.Context, path string) ([]PulledFile, error) {
	opts := RequestOptions{
		Method:   http.MethodPost,
		Endpoint: "/operation/pull",
		FormFields: map[string]string{
			"path": path,
		},
		ContentType: "application/x-www-form-urlencoded",
	}

	return c.FetchStreamFiles(ctx, opts)
}

// OperationPullStream sends a POST request to the /operation/pull endpoint and returns
// a streaming reader for the response body. The caller is responsible for closing the reader.
// The response is expected to be a zip archive.
func (c *Client) OperationPullStream(ctx context.Context, path string) (io.ReadCloser, error) {
	opts := RequestOptions{
		Method:   http.MethodPost,
		Endpoint: "/operation/pull",
		FormFields: map[string]string{
			"path": path,
		},
		ContentType: "application/x-www-form-urlencoded",
	}

	return c.FetchStreamFilesReader(ctx, opts)
}
