package client

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"slices"
	"strconv"
	"strings"
	"time"

	"irmin-connectors/db"
	"log/slog"

	irminutils "github.com/IrminData/irmin-sdk-go/utils"
)

// HTTPClient represents an HTTP client for making requests.
// Note: HTTPClient instances should not be shared across goroutines.
// The Headers map is not protected by synchronization. For concurrent use,
// create separate HTTPClient instances (the underlying http.Client can be shared).
type HTTPClient struct {
	URL                 string
	Method              string
	Headers             map[string]string // Not safe for concurrent map iteration
	Body                []byte
	Timeout             int
	VerifySSL           bool
	AcceptedStatusCodes []int
	Client              *http.Client // Safe for concurrent use
}

// InitHTTPClient initializes an HTTP client from operation configuration.
func InitHTTPClient(c any, logger *slog.Logger, operation *db.Operation) (*HTTPClient, error) {
	// Parse configuration from operation
	var config map[string]any
	if err := json.Unmarshal(operation.Details, &config); err != nil {
		return nil, fmt.Errorf("failed to unmarshal operation details: %w", err)
	}

	// Validate configuration before proceeding
	if err := ValidateConfiguration(config); err != nil {
		return nil, fmt.Errorf("invalid configuration: %w", err)
	}

	// Extract required fields
	url, ok := config["url"].(string)
	if !ok || url == "" {
		return nil, errors.New("url is required")
	}

	method, ok := config["method"].(string)
	if !ok || method == "" {
		return nil, errors.New("method is required")
	}

	// Extract optional fields
	headers := extractHeaders(config)
	body := extractBody(config)
	timeout := extractTimeout(config)
	verifySSL := extractVerifySSL(config)
	acceptedStatusCodes := extractAcceptedStatusCodes(config)

	// Create HTTP client with SSL verification control
	transport := &http.Transport{}

	if !verifySSL {
		transport.TLSClientConfig = &tls.Config{
			InsecureSkipVerify: true, //nolint:gosec // G402: User-controlled setting for self-signed certificates
		}
	}

	client := &http.Client{
		Timeout:   time.Duration(timeout) * time.Second,
		Transport: transport,
	}

	httpClient := &HTTPClient{
		URL:                 url,
		Method:              method,
		Headers:             headers,
		Body:                body,
		Timeout:             timeout,
		VerifySSL:           verifySSL,
		AcceptedStatusCodes: acceptedStatusCodes,
		Client:              client,
	}

	logger.Info("HTTP client initialized",
		"url", url,
		"method", method,
		"timeout", timeout,
		"verify_ssl", verifySSL)

	return httpClient, nil
}

// MakeRequest makes an HTTP request and returns the response.
// This method is not safe for concurrent use on the same HTTPClient instance.
func (h *HTTPClient) MakeRequest() (*http.Response, error) {
	var bodyReader io.Reader
	if len(h.Body) > 0 {
		bodyReader = bytes.NewReader(h.Body)
	}

	req, err := http.NewRequestWithContext(context.Background(), h.Method, h.URL, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers (note: map iteration is not safe for concurrent use)
	for key, value := range h.Headers {
		req.Header.Set(key, value)
	}

	// Set default Content-Type for methods that typically have a body,
	// if not already set by user
	if req.Header.Get("Content-Type") == "" {
		method := strings.ToUpper(h.Method)
		if method == "POST" || method == "PUT" || method == "PATCH" {
			req.Header.Set("Content-Type", "application/json")
		}
	}

	resp, err := h.Client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %w", err)
	}

	return resp, nil
}

// GetResponseBody reads and returns the response body as bytes.
// Note: The caller is responsible for closing the response body.
func (h *HTTPClient) GetResponseBody(resp *http.Response) ([]byte, error) {
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	return body, nil
}

// GetContentType returns the content type from response headers.
func (h *HTTPClient) GetContentType(resp *http.Response) string {
	return resp.Header.Get("Content-Type")
}

// GetFileNameFromResponse generates a filename based on response content type and URL.
func (h *HTTPClient) GetFileNameFromResponse(resp *http.Response) string {
	contentType := h.GetContentType(resp)

	// Use the SDK's content type detection to get the appropriate extension
	// Create a temporary filename with the detected content type
	tempFilename := "response"

	// Try to find a matching extension for the content type
	extension := getExtensionFromContentType(contentType)

	// For single endpoint configurations, use a generic filename
	return fmt.Sprintf("%s.%s", tempFilename, extension)
}

// getExtensionFromContentType maps content types to file extensions using the SDK's logic
func getExtensionFromContentType(contentType string) string {
	// Use the SDK's hybrid content type detection by testing common extensions
	commonExtensions := []string{
		".json", ".xml", ".html", ".txt", ".csv", ".pdf", ".jpg", ".png", ".gif",
		".parquet", ".avro", ".orc", ".delta", ".iceberg", ".jsonl", ".ndjson",
		".tsv", ".tab", ".yaml", ".yml", ".xlsx", ".xls", ".xlsm", ".xlsb",
		".heic", ".heif", ".avif", ".webp", ".opus", ".flac", ".woff", ".woff2",
		".otf", ".ttf", ".js",
		// Archive formats
		".zip", ".tar", ".tar.gz", ".tgz", ".tar.bz2", ".tbz2", ".tar.xz", ".txz",
		".rar", ".7z", ".gz", ".bz2", ".xz", ".lz", ".lzma", ".z", ".cab", ".deb",
		".rpm", ".dmg", ".iso", ".img",
	}

	// Test each extension to see if it matches the content type
	for _, ext := range commonExtensions {
		// Use the SDK's content type detection
		detectedType := irminutils.AutoDetectMimeType("file" + ext)
		// Strip parameters for comparison
		baseDetectedType := strings.Split(detectedType, ";")[0]
		baseContentType := strings.Split(contentType, ";")[0]

		if baseDetectedType == baseContentType {
			return strings.TrimPrefix(ext, ".")
		}
	}

	// Fallback to generic binary extension
	return "bin"
}

// ValidateConfiguration validates the HTTP client configuration.
//

func ValidateConfiguration(config map[string]any) error {
	// Check required fields
	if url, ok := config["url"].(string); !ok || url == "" {
		return errors.New("url is required")
	}

	method, ok := config["method"].(string)
	if !ok || method == "" {
		return errors.New("method is required")
	}

	// Validate method
	validMethods := map[string]bool{
		"GET":    true,
		"POST":   true,
		"PUT":    true,
		"PATCH":  true,
		"DELETE": true,
	}

	if !validMethods[method] {
		return fmt.Errorf("invalid method: %s", method)
	}

	// Validate headers if provided
	if headersRaw, exists := config["headers"]; exists && headersRaw != nil {
		if _, isMap := headersRaw.(map[string]any); !isMap {
			return errors.New("headers must be a JSON object")
		}
	}

	// Validate timeout if provided
	if timeoutRaw, exists := config["timeout"]; exists && timeoutRaw != nil {
		var timeoutValue int

		switch v := timeoutRaw.(type) {
		case string:
			parsed, err := strconv.Atoi(v)
			if err != nil {
				return fmt.Errorf("timeout must be a valid integer: %w", err)
			}
			timeoutValue = parsed
		case float64:
			// JSON numbers are parsed as float64
			timeoutValue = int(v)
		case int:
			timeoutValue = v
		default:
			return errors.New("timeout must be a string or number")
		}

		if timeoutValue < 1 || timeoutValue > 300 {
			return errors.New("timeout must be between 1 and 300 seconds")
		}
	}

	// Validate accepted_status_codes if provided
	if err := validateAcceptedStatusCodes(config); err != nil {
		return err
	}

	return nil
}

// extractHeaders extracts headers from config map.
func extractHeaders(config map[string]any) map[string]string {
	headers := make(map[string]string)
	if headersRaw, exists := config["headers"]; exists && headersRaw != nil {
		if headersMap, isMap := headersRaw.(map[string]any); isMap {
			for k, v := range headersMap {
				if str, isString := v.(string); isString {
					headers[k] = str
				}
			}
		}
	}
	return headers
}

// extractBody extracts body from config map.
func extractBody(config map[string]any) []byte {
	if bodyRaw, exists := config["body"]; exists && bodyRaw != nil {
		if str, isString := bodyRaw.(string); isString {
			return []byte(str)
		}
	}
	return nil
}

// extractTimeout extracts timeout from config map.
func extractTimeout(config map[string]any) int {
	if timeoutRaw, exists := config["timeout"]; exists && timeoutRaw != nil {
		switch v := timeoutRaw.(type) {
		case string:
			if parsed, err := strconv.Atoi(v); err == nil {
				return parsed
			}
		case float64:
			// JSON numbers are parsed as float64
			return int(v)
		case int:
			return v
		}
	}
	return 30 //nolint:mnd // default timeout
}

// extractVerifySSL extracts verify_ssl from config map.
func extractVerifySSL(config map[string]any) bool {
	if verifySSLRaw, exists := config["verify_ssl"]; exists && verifySSLRaw != nil {
		switch v := verifySSLRaw.(type) {
		case bool:
			return v
		case string:
			return v == "true"
		}
	}
	return true // default to true
}

// extractAcceptedStatusCodes extracts accepted_status_codes from config map.
// This assumes validation has already been performed, so it uses the strict parser.
func extractAcceptedStatusCodes(config map[string]any) []int {
	defaultCodes := []int{200, 201, 202, 203, 204}

	codesRaw, exists := config["accepted_status_codes"]
	if !exists || codesRaw == nil {
		return defaultCodes
	}

	str, isString := codesRaw.(string)
	if !isString || str == "" {
		return defaultCodes
	}

	// Use strict validation since extraction happens after validation
	codes, _ := parseStatusCodesStrict(str)
	if len(codes) == 0 {
		// This shouldn't happen if validation ran, but fallback to defaults
		return defaultCodes
	}

	return codes
}

// validateAcceptedStatusCodes validates the accepted_status_codes configuration.
func validateAcceptedStatusCodes(config map[string]any) error {
	codesRaw, exists := config["accepted_status_codes"]
	if !exists || codesRaw == nil {
		return nil
	}

	str, isString := codesRaw.(string)
	if !isString {
		return errors.New("accepted_status_codes must be a string")
	}

	// Empty string means use defaults, which is valid
	if str == "" {
		return nil
	}

	codes, invalidCodes := parseStatusCodesStrict(str)

	// Report invalid entries first (more specific error)
	if len(invalidCodes) > 0 {
		return fmt.Errorf(
			"accepted_status_codes contains invalid entries: %s (must be integers between 100-599)",
			strings.Join(invalidCodes, ", "),
		)
	}

	// Then check if we have at least one valid code
	if len(codes) == 0 {
		return errors.New("accepted_status_codes must contain at least one valid HTTP status code (100-599)")
	}

	return nil
}

// parseStatusCodesStrict parses a comma-separated string of status codes
// and returns valid codes and invalid entries. This is used for both validation
// and extraction to ensure consistency.
func parseStatusCodesStrict(input string) ([]int, []string) {
	parts := strings.Split(input, ",")
	codes := make([]int, 0, len(parts))
	invalidCodes := make([]string, 0)

	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue // Skip empty parts (e.g., trailing commas)
		}

		code, err := strconv.Atoi(part)
		if err != nil {
			// Not a valid integer
			invalidCodes = append(invalidCodes, part)
			continue
		}

		if code < 100 || code > 599 {
			// Valid integer but outside HTTP status code range
			invalidCodes = append(invalidCodes, part)
			continue
		}

		codes = append(codes, code)
	}

	return codes, invalidCodes
}

// IsAcceptedStatusCode checks if the given status code is in the accepted list.
func (h *HTTPClient) IsAcceptedStatusCode(statusCode int) bool {
	return slices.Contains(h.AcceptedStatusCodes, statusCode)
}
