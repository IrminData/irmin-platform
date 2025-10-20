package connectorsclient

import (
	"context"
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
