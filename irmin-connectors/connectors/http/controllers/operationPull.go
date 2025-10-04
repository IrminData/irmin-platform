package httpcontrollers

import (
	"errors"
	"fmt"
	"irmin-connectors/connectors/common"
	httpclient "irmin-connectors/connectors/http/client"
	"irmin-connectors/db"
	"log/slog"

	"github.com/gofiber/fiber/v3"
)

// HTTPPullProvider implements the PullOperationProvider interface for HTTP.
type HTTPPullProvider struct{}

// InitializeClient initializes the HTTP client for pull operations.
func (p *HTTPPullProvider) InitializeClient(
	c fiber.Ctx,
	logger *slog.Logger,
	operation *db.Operation,
) (any, *string, func(), error) {
	client, err := httpclient.InitHTTPClient(c, logger, operation)
	if err != nil {
		return nil, nil, func() {}, fmt.Errorf("failed to initialize HTTP client: %w", err)
	}

	cleanup := func() {
		// HTTP client doesn't need explicit cleanup
	}

	// HTTP doesn't have a "database name" concept, so return nil
	return client, nil, cleanup, nil
}

// GetAllFiles makes a request to the configured endpoint and returns the response as a file.
func (p *HTTPPullProvider) GetAllFiles(_ fiber.Ctx, client any) ([]string, [][]byte, error) {
	httpClient, ok := client.(*httpclient.HTTPClient)
	if !ok {
		return nil, nil, errors.New("invalid client type for HTTP pull provider")
	}

	// Make the HTTP request
	resp, err := httpClient.MakeRequest()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to make HTTP request: %w", err)
	}
	defer resp.Body.Close()

	// Check if status code is accepted
	if !httpClient.IsAcceptedStatusCode(resp.StatusCode) {
		errorBody, errorBodyErr := httpClient.GetResponseBody(resp)
		if errorBodyErr != nil {
			return nil, nil, fmt.Errorf(
				"HTTP request returned unaccepted status %d: %s, failed to read error response: %w",
				resp.StatusCode,
				resp.Status,
				errorBodyErr,
			)
		}
		return nil, nil, fmt.Errorf("HTTP request returned unaccepted status %d: %s, response: %s",
			resp.StatusCode, resp.Status, string(errorBody))
	}

	// Read response body
	body, err := httpClient.GetResponseBody(resp)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to read response body: %w", err)
	}

	// Generate filename based on content type and URL
	fileName := httpClient.GetFileNameFromResponse(resp)

	return []string{fileName}, [][]byte{body}, nil
}

// GetFileByPath makes a request to the configured endpoint and returns the response as a file.
// For HTTP connectors, the path parameter is ignored since we only support single endpoint configurations.
func (p *HTTPPullProvider) GetFileByPath(_ fiber.Ctx, client any, _ string) (string, []byte, error) {
	httpClient, ok := client.(*httpclient.HTTPClient)
	if !ok {
		return "", nil, errors.New("invalid client type for HTTP pull provider")
	}

	// Make the HTTP request
	resp, err := httpClient.MakeRequest()
	if err != nil {
		return "", nil, fmt.Errorf("failed to make HTTP request: %w", err)
	}
	defer resp.Body.Close()

	// Check if status code is accepted
	if !httpClient.IsAcceptedStatusCode(resp.StatusCode) {
		errorBody, errorBodyErr := httpClient.GetResponseBody(resp)
		if errorBodyErr != nil {
			return "", nil, fmt.Errorf(
				"HTTP request returned unaccepted status %d: %s, failed to read error response: %w",
				resp.StatusCode,
				resp.Status,
				errorBodyErr,
			)
		}
		return "", nil, fmt.Errorf("HTTP request returned unaccepted status %d: %s, response: %s",
			resp.StatusCode, resp.Status, string(errorBody))
	}

	// Read response body
	body, err := httpClient.GetResponseBody(resp)
	if err != nil {
		return "", nil, fmt.Errorf("failed to read response body: %w", err)
	}

	// Generate filename based on content type and URL
	fileName := httpClient.GetFileNameFromResponse(resp)

	return fileName, body, nil
}

// OperationPull godoc
// @Summary Pull data from HTTP endpoint
// @Description Make a request to the configured HTTP endpoint and return the response as a file
// @Tags http
// @Security OperationTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param operation_token formData string true "Operation token received from operation/init"
// @Param path formData string false "Path parameter (ignored for single endpoint configurations)"
// @Success 200 {object} fiber.Map "Data pulled successfully"
// @Failure 400 {object} fiber.Map "Bad request - invalid operation token"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} fiber.Map "HTTP endpoint not found"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /http/operation/pull [post]
func (cs *Controllers) OperationPull(c fiber.Ctx) error {
	provider := &HTTPPullProvider{}
	return common.HandleOperationPull(c, provider, cs.Logger)
}
