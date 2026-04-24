package httpcontrollers

import (
	"context"
	"errors"
	"fmt"
	"irmin-connectors/connectors/common"
	httpclient "irmin-connectors/connectors/http/client"
	"irmin-connectors/db"
	"log/slog"

	"github.com/gofiber/fiber/v3"
)

// HTTPPullProvider implements the PullOperationProvider interface for HTTP.
type HTTPPullProvider struct {
	dbInstance *db.Database
	logger     *slog.Logger
}

// ProgressHandler returns nil — a single HTTP request bounded by the
// configured timeout (default 300s) can't produce a meaningful
// silent-window incident, and the common pull handler's baseline
// heartbeat covers what little exposure remains.
func (p *HTTPPullProvider) ProgressHandler(_ *db.Operation) common.ProgressHandler {
	return nil
}

// InitializeClient initializes the HTTP client for pull operations.
func (p *HTTPPullProvider) InitializeClient(
	ctx context.Context,
	logger *slog.Logger,
	operation *db.Operation,
) (any, *string, func(), error) {
	client, err := httpclient.InitHTTPClient(ctx, logger, operation)
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
//
//nolint:gocognit // Complex? Maybe, but it's okay for now
func (p *HTTPPullProvider) GetAllFiles(
	_ context.Context, client any, operation *db.Operation,
) ([]string, [][]byte, error) {
	httpClient, ok := client.(*httpclient.HTTPClient)
	if !ok {
		return nil, nil, errors.New("invalid client type for HTTP pull provider")
	}

	// Make the HTTP request
	resp, err := httpClient.MakeRequest()
	if err != nil {
		if operation != nil && p.dbInstance != nil && p.logger != nil {
			common.LogOperationEvent(
				p.dbInstance,
				p.logger,
				operation.ID,
				db.LogEventTypeError,
				"HTTP request failed during pull operation",
				map[string]any{
					"error":  err.Error(),
					"url":    httpClient.URL,
					"method": httpClient.Method,
				},
			)
		}
		return nil, nil, fmt.Errorf("failed to make HTTP request: %w", err)
	}
	defer resp.Body.Close()

	// Check if status code is accepted
	if !httpClient.IsAcceptedStatusCode(resp.StatusCode) {
		errorBody, errorBodyErr := httpClient.GetResponseBody(resp)
		if errorBodyErr != nil {
			if operation != nil && p.dbInstance != nil && p.logger != nil {
				common.LogOperationEvent(
					p.dbInstance,
					p.logger,
					operation.ID,
					db.LogEventTypeError,
					"HTTP request returned unaccepted status code",
					map[string]any{
						"status_code": resp.StatusCode,
						"status":      resp.Status,
						"url":         httpClient.URL,
						"method":      httpClient.Method,
					},
				)
			}
			return nil, nil, fmt.Errorf(
				"HTTP request returned unaccepted status %d: %s, failed to read error response: %w",
				resp.StatusCode,
				resp.Status,
				errorBodyErr,
			)
		}

		if operation != nil && p.dbInstance != nil && p.logger != nil {
			common.LogOperationEvent(
				p.dbInstance,
				p.logger,
				operation.ID,
				db.LogEventTypeError,
				"HTTP request returned unaccepted status code",
				map[string]any{
					"status_code":   resp.StatusCode,
					"status":        resp.Status,
					"url":           httpClient.URL,
					"method":        httpClient.Method,
					"response_body": string(errorBody),
				},
			)
		}
		return nil, nil, fmt.Errorf("HTTP request returned unaccepted status %d: %s, response: %s",
			resp.StatusCode, resp.Status, string(errorBody))
	}

	// Read response body
	body, err := httpClient.GetResponseBody(resp)
	if err != nil {
		if operation != nil && p.dbInstance != nil && p.logger != nil {
			common.LogOperationEvent(
				p.dbInstance,
				p.logger,
				operation.ID,
				db.LogEventTypeError,
				"Failed to read HTTP response body",
				map[string]any{
					"error": err.Error(),
					"url":   httpClient.URL,
				},
			)
		}
		return nil, nil, fmt.Errorf("failed to read response body: %w", err)
	}

	// Generate filename based on content type and URL
	fileName := httpClient.GetFileNameFromResponse(resp)

	// Log successful HTTP request
	if operation != nil && p.dbInstance != nil && p.logger != nil {
		common.LogOperationEvent(
			p.dbInstance,
			p.logger,
			operation.ID,
			db.LogEventTypeInfo,
			"HTTP pull request completed successfully",
			map[string]any{
				"status_code":    resp.StatusCode,
				"content_type":   resp.Header.Get("Content-Type"),
				"content_length": len(body),
				"url":            httpClient.URL,
				"method":         httpClient.Method,
				"filename":       fileName,
			},
		)
	}

	return []string{fileName}, [][]byte{body}, nil
}

// GetFileByPath makes a request to the configured endpoint with an optional path modification.
// The path parameter is used to modify the request URL (absolute path replaces, relative path appends).
//
//nolint:gocognit // Complex? Maybe, but it's okay for now
func (p *HTTPPullProvider) GetFileByPath(
	_ context.Context, client any, operation *db.Operation, path string,
) (string, []byte, error) {
	httpClient, ok := client.(*httpclient.HTTPClient)
	if !ok {
		return "", nil, errors.New("invalid client type for HTTP pull provider")
	}

	// If a path is provided, use it to modify the request URL
	if path != "" {
		httpClient = httpClient.WithPath(path)
	}

	// Make the HTTP request
	resp, err := httpClient.MakeRequest()
	if err != nil {
		if operation != nil && p.dbInstance != nil && p.logger != nil {
			common.LogOperationEvent(
				p.dbInstance,
				p.logger,
				operation.ID,
				db.LogEventTypeError,
				"HTTP request failed during pull operation with specific path",
				map[string]any{
					"error":  err.Error(),
					"url":    httpClient.URL,
					"method": httpClient.Method,
					"path":   path,
				},
			)
		}
		return "", nil, fmt.Errorf("failed to make HTTP request: %w", err)
	}
	defer resp.Body.Close()

	// Check if status code is accepted
	if !httpClient.IsAcceptedStatusCode(resp.StatusCode) {
		errorBody, errorBodyErr := httpClient.GetResponseBody(resp)
		if errorBodyErr != nil {
			if operation != nil && p.dbInstance != nil && p.logger != nil {
				common.LogOperationEvent(
					p.dbInstance,
					p.logger,
					operation.ID,
					db.LogEventTypeError,
					"HTTP request returned unaccepted status code with specific path",
					map[string]any{
						"status_code": resp.StatusCode,
						"status":      resp.Status,
						"url":         httpClient.URL,
						"method":      httpClient.Method,
						"path":        path,
					},
				)
			}
			return "", nil, fmt.Errorf(
				"HTTP request returned unaccepted status %d: %s, failed to read error response: %w",
				resp.StatusCode,
				resp.Status,
				errorBodyErr,
			)
		}

		if operation != nil && p.dbInstance != nil && p.logger != nil {
			common.LogOperationEvent(
				p.dbInstance,
				p.logger,
				operation.ID,
				db.LogEventTypeError,
				"HTTP request returned unaccepted status code with specific path",
				map[string]any{
					"status_code":   resp.StatusCode,
					"status":        resp.Status,
					"url":           httpClient.URL,
					"method":        httpClient.Method,
					"path":          path,
					"response_body": string(errorBody),
				},
			)
		}
		return "", nil, fmt.Errorf("HTTP request returned unaccepted status %d: %s, response: %s",
			resp.StatusCode, resp.Status, string(errorBody))
	}

	// Read response body
	body, err := httpClient.GetResponseBody(resp)
	if err != nil {
		if operation != nil && p.dbInstance != nil && p.logger != nil {
			common.LogOperationEvent(
				p.dbInstance,
				p.logger,
				operation.ID,
				db.LogEventTypeError,
				"Failed to read HTTP response body with specific path",
				map[string]any{
					"error": err.Error(),
					"url":   httpClient.URL,
					"path":  path,
				},
			)
		}
		return "", nil, fmt.Errorf("failed to read response body: %w", err)
	}

	// Generate filename based on content type and URL
	fileName := httpClient.GetFileNameFromResponse(resp)

	// Log successful HTTP request
	if operation != nil && p.dbInstance != nil && p.logger != nil {
		common.LogOperationEvent(
			p.dbInstance,
			p.logger,
			operation.ID,
			db.LogEventTypeInfo,
			"HTTP pull request with specific path completed successfully",
			map[string]any{
				"status_code":    resp.StatusCode,
				"content_type":   resp.Header.Get("Content-Type"),
				"content_length": len(body),
				"url":            httpClient.URL,
				"method":         httpClient.Method,
				"path":           path,
				"filename":       fileName,
			},
		)
	}

	return fileName, body, nil
}

// OperationPull godoc
// @Summary Pull data from HTTP endpoint
// @Description Make a request to the configured HTTP endpoint and return the response as a file. Use the path parameter to modify the request URL (absolute path replaces, relative path appends).
// @Tags http
// @Security OperationTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param operation_token formData string true "Operation token received from operation/init"
// @Param path formData string false "Path to append/replace in the request URL (e.g., /api/users or customers)"
// @Success 200 {object} fiber.Map "Data pulled successfully"
// @Failure 400 {object} fiber.Map "Bad request - invalid operation token"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} fiber.Map "HTTP endpoint not found"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /http/operation/pull [post]
func (cs *Controllers) OperationPull(c fiber.Ctx) error {
	provider := &HTTPPullProvider{
		dbInstance: cs.DB,
		logger:     cs.Logger,
	}
	return common.HandleOperationPull(c, provider, cs.Logger, cs.DB, cs.App)
}
