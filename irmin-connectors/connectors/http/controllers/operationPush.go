package httpcontrollers

import (
	"errors"
	"fmt"
	"path/filepath"
	"strings"

	"irmin-connectors/connectors/common"
	httpclient "irmin-connectors/connectors/http/client"
	"irmin-connectors/db"
	"log/slog"

	irminutils "github.com/IrminData/irmin-sdk-go/utils"
	"github.com/gofiber/fiber/v3"
)

// HTTPPushProvider implements the PushOperationProvider interface for HTTP.
type HTTPPushProvider struct{}

// InitializeClient initializes the HTTP client for push operations.
func (p *HTTPPushProvider) InitializeClient(
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

// ProcessFiles processes the extracted files and sends them to the HTTP endpoint.
// The rawPath parameter is used to modify the request URL (absolute path replaces, relative path appends).
func (p *HTTPPushProvider) ProcessFiles(
	_ fiber.Ctx,
	client any,
	files map[string][]byte,
	rawPath string,
) error {
	httpClient, ok := client.(*httpclient.HTTPClient)
	if !ok {
		return errors.New("invalid client type for HTTP push provider")
	}

	// If a path is provided, use it to modify the request URL
	if rawPath != "" {
		httpClient = httpClient.WithPath(rawPath)
	}

	if len(files) == 0 {
		return errors.New("no files to send")
	}

	// HTTP connector limitation: only one file can be sent per request
	// Warn if multiple files are provided
	if len(files) > 1 {
		return fmt.Errorf(
			"HTTP connector only supports sending one file per request, received %d files. Please configure separate operations for each file",
			len(files),
		)
	}

	// Get the single file from the map
	var fileContent []byte
	var fileName string
	for name, content := range files {
		fileName = name
		fileContent = content
		break
	}

	// Create a normalized copy of headers to avoid mutating the original client
	// and prevent duplicate Content-Type headers with different casing
	headers := make(map[string]string)
	var existingContentTypeValue string

	for k, v := range httpClient.Headers {
		// Check if this is a Content-Type header (case-insensitive)
		if strings.EqualFold(k, "Content-Type") {
			// Store the value but don't add to headers yet
			// This prevents duplicate Content-Type headers
			existingContentTypeValue = v
		} else {
			// Add non-Content-Type headers normally
			headers[k] = v
		}
	}

	// Add Content-Type header with normalized casing
	if existingContentTypeValue != "" {
		// User has specified Content-Type, use their value with normalized key
		headers["Content-Type"] = existingContentTypeValue
	} else {
		// Set Content-Type based on file extension
		ext := strings.ToLower(filepath.Ext(fileName))
		contentType := getContentTypeForExtension(ext)
		headers["Content-Type"] = contentType
	}

	// Create a temporary client instance with the file content
	// to avoid mutating the original client
	// Note: http.Client is safe for concurrent use, so we can reuse it
	tempClient := &httpclient.HTTPClient{
		URL:                 httpClient.URL,
		Method:              httpClient.Method,
		Headers:             headers,
		Body:                fileContent,
		Timeout:             httpClient.Timeout,
		VerifySSL:           httpClient.VerifySSL,
		AcceptedStatusCodes: httpClient.AcceptedStatusCodes,
		Client:              httpClient.Client, // Reuse the original http.Client
	}

	// Make the HTTP request
	resp, err := tempClient.MakeRequest()
	if err != nil {
		return fmt.Errorf("failed to make HTTP request: %w", err)
	}
	defer resp.Body.Close()

	// Check if status code is accepted
	if !tempClient.IsAcceptedStatusCode(resp.StatusCode) {
		// Try to read error response body
		errorBody, errorBodyErr := tempClient.GetResponseBody(resp)
		if errorBodyErr != nil {
			return fmt.Errorf("HTTP request returned unaccepted status %d: %s, failed to read error response: %w",
				resp.StatusCode, resp.Status, errorBodyErr)
		}
		return fmt.Errorf("HTTP request returned unaccepted status %d: %s, response: %s",
			resp.StatusCode, resp.Status, string(errorBody))
	}

	return nil
}

// OperationPush godoc
// @Summary Push data to HTTP endpoint
// @Description Send file content to the configured HTTP endpoint using the specified method and headers. Use the path parameter to modify the request URL (absolute path replaces, relative path appends).
// @Tags http
// @Security OperationTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param operation_token formData string true "Operation token received from operation/init"
// @Param file formData file true "File to send to HTTP endpoint"
// @Param path formData string false "Path to append/replace in the request URL (e.g., /api/users or customers)"
// @Success 200 {object} fiber.Map "Data pushed successfully"
// @Failure 400 {object} fiber.Map "Bad request - invalid operation token or file"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} fiber.Map "Operation not found"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /http/operation/push [post]
func (cs *Controllers) OperationPush(c fiber.Ctx) error {
	provider := &HTTPPushProvider{}
	return common.HandleOperationPush(c, provider, cs.Logger, cs.DB)
}

// getContentTypeForExtension returns the appropriate Content-Type for a file extension using the SDK.
func getContentTypeForExtension(ext string) string {
	// Use the SDK's hybrid content type detection
	contentType := irminutils.AutoDetectMimeType("file" + ext)

	// Strip parameters to get the base content type
	if idx := strings.Index(contentType, ";"); idx != -1 {
		contentType = strings.TrimSpace(contentType[:idx])
	}

	// If no content type detected, fall back to binary
	if contentType == "" || contentType == "application/octet-stream" {
		return "application/octet-stream"
	}

	return contentType
}
