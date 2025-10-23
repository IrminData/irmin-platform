package client

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"maps"
	"net/http"
	"net/url"
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

// GetFileNameFromResponse generates a filename based on response headers, URL, and content type.
func (h *HTTPClient) GetFileNameFromResponse(resp *http.Response) string {
	contentType := h.GetContentType(resp)
	extension := getExtensionFromContentType(contentType)

	// 1. Try to get filename from Content-Disposition header
	if filename := extractFilenameFromContentDisposition(resp.Header.Get("Content-Disposition")); filename != "" {
		// If the filename already has an extension, use it as-is
		if hasExtension(filename) {
			return filename
		}
		// Otherwise, add the detected extension
		return fmt.Sprintf("%s.%s", filename, extension)
	}

	// 2. Try to extract a meaningful filename from the URL path
	if filename := extractFilenameFromURL(h.URL); filename != "" {
		// If the filename already has an extension, use it as-is
		if hasExtension(filename) {
			return filename
		}
		// Otherwise, add the detected extension
		return fmt.Sprintf("%s.%s", filename, extension)
	}

	// 3. Fall back to generic filename
	return fmt.Sprintf("response.%s", extension)
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

// extractFilenameFromContentDisposition parses the Content-Disposition header and extracts the filename.
func extractFilenameFromContentDisposition(contentDisposition string) string {
	if contentDisposition == "" {
		return ""
	}

	// Content-Disposition header format examples:
	// attachment; filename="example.json"
	// attachment; filename*=UTF-8''example.json
	// inline; filename="data.csv"

	// Look for filename= or filename*=
	parts := strings.Split(contentDisposition, ";")
	for _, part := range parts {
		part = strings.TrimSpace(part)

		// Handle filename="..."
		if strings.HasPrefix(part, "filename=") {
			filename := strings.TrimPrefix(part, "filename=")
			// Remove quotes
			filename = strings.Trim(filename, `"`)
			return sanitizeFilename(filename)
		}

		// Handle filename*=UTF-8''... (RFC 5987)
		if strings.HasPrefix(part, "filename*=") {
			filename := strings.TrimPrefix(part, "filename*=")
			// Remove encoding prefix (e.g., "UTF-8''")
			if idx := strings.Index(filename, "''"); idx != -1 {
				filename = filename[idx+2:]
			}
			// Remove quotes
			filename = strings.Trim(filename, `"`)
			return sanitizeFilename(filename)
		}
	}

	return ""
}

// extractFilenameFromURL extracts a meaningful filename from the URL path.
func extractFilenameFromURL(urlStr string) string {
	if urlStr == "" {
		return ""
	}

	// Parse the URL
	parsedURL, err := url.Parse(urlStr)
	if err != nil {
		return ""
	}

	// Get the path
	path := parsedURL.Path

	// Remove trailing slash
	path = strings.TrimSuffix(path, "/")

	// Get the last segment of the path
	segments := strings.Split(path, "/")
	if len(segments) == 0 {
		return ""
	}

	filename := segments[len(segments)-1]

	// Skip if it's empty or looks like a generic endpoint
	if filename == "" {
		return ""
	}

	// Sanitize the filename
	return sanitizeFilename(filename)
}

// sanitizeFilename removes or replaces invalid characters from a filename.
func sanitizeFilename(filename string) string {
	if filename == "" {
		return ""
	}

	// Remove or replace characters that are invalid in filenames
	// Keep alphanumeric, dots, hyphens, underscores
	var result strings.Builder
	for _, char := range filename {
		switch {
		case char >= 'a' && char <= 'z',
			char >= 'A' && char <= 'Z',
			char >= '0' && char <= '9',
			char == '.',
			char == '-',
			char == '_':
			result.WriteRune(char)
		case char == ' ':
			result.WriteRune('_')
		}
	}

	sanitized := result.String()

	// Limit length to reasonable size
	const maxLength = 255
	if len(sanitized) > maxLength {
		sanitized = sanitized[:maxLength]
	}

	return sanitized
}

// hasExtension checks if a filename has a file extension.
func hasExtension(filename string) bool {
	if filename == "" {
		return false
	}

	// Find the last dot
	lastDot := strings.LastIndex(filename, ".")
	if lastDot == -1 || lastDot == 0 || lastDot == len(filename)-1 {
		return false
	}

	// Check if there's at least one character after the dot
	// and no slashes after the dot (which would indicate a directory path)
	afterDot := filename[lastDot+1:]
	return len(afterDot) > 0 && !strings.Contains(afterDot, "/")
}

// ValidateConfiguration validates the HTTP client configuration.
func ValidateConfiguration(config map[string]any) error {
	if err := validateRequiredFields(config); err != nil {
		return err
	}

	if err := validateHeaders(config); err != nil {
		return err
	}

	if err := validateTimeout(config); err != nil {
		return err
	}

	if err := validateAcceptedStatusCodes(config); err != nil {
		return err
	}

	return nil
}

// validateRequiredFields validates the required URL and method fields.
func validateRequiredFields(config map[string]any) error {
	if url, ok := config["url"].(string); !ok || url == "" {
		return errors.New("url is required")
	}

	method, ok := config["method"].(string)
	if !ok || method == "" {
		return errors.New("method is required")
	}

	return validateHTTPMethod(method)
}

// validateHTTPMethod validates that the HTTP method is supported.
func validateHTTPMethod(method string) error {
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

	return nil
}

// validateHeaders validates the headers configuration if provided.
func validateHeaders(config map[string]any) error {
	headersRaw, exists := config["headers"]
	if !exists || headersRaw == nil {
		return nil
	}

	return validateHeadersFormat(headersRaw)
}

// validateHeadersFormat validates the format of headers configuration.
func validateHeadersFormat(headersRaw any) error {
	headersStr, isString := headersRaw.(string)
	if isString {
		return validateHeadersString(headersStr)
	}

	if _, isMap := headersRaw.(map[string]any); !isMap {
		return errors.New("headers must be a JSON object")
	}

	return nil
}

// validateHeadersString validates headers when provided as a JSON string.
func validateHeadersString(headersStr string) error {
	// Skip validation for empty strings (already handled by BuildDetailsFromFields)
	if headersStr == "" {
		return nil
	}

	// Try to parse as JSON to validate format
	var headersMap map[string]any
	if err := json.Unmarshal([]byte(headersStr), &headersMap); err != nil {
		return errors.New("headers must be a valid JSON object")
	}

	return nil
}

// validateTimeout validates the timeout configuration if provided.
func validateTimeout(config map[string]any) error {
	timeoutRaw, exists := config["timeout"]
	if !exists || timeoutRaw == nil {
		return nil
	}

	timeoutValue, err := parseTimeoutValue(timeoutRaw)
	if err != nil {
		return err
	}

	return validateTimeoutRange(timeoutValue)
}

// parseTimeoutValue parses the timeout value from various types.
func parseTimeoutValue(timeoutRaw any) (int, error) {
	switch v := timeoutRaw.(type) {
	case string:
		parsed, err := strconv.Atoi(v)
		if err != nil {
			return 0, fmt.Errorf("timeout must be a valid integer: %w", err)
		}
		return parsed, nil
	case float64:
		// JSON numbers are parsed as float64
		return int(v), nil
	case int:
		return v, nil
	default:
		return 0, errors.New("timeout must be a string or number")
	}
}

// validateTimeoutRange validates that the timeout is within acceptable range.
func validateTimeoutRange(timeoutValue int) error {
	if timeoutValue < 1 || timeoutValue > 300 {
		return errors.New("timeout must be between 1 and 300 seconds")
	}

	return nil
}

// extractHeaders extracts headers from config map.
func extractHeaders(config map[string]any) map[string]string {
	headers := make(map[string]string)
	headersRaw, exists := config["headers"]
	if !exists || headersRaw == nil {
		return headers
	}

	// Handle string representation of JSON that needs parsing
	if headersStr, ok := headersRaw.(string); ok {
		// Try to parse as JSON
		var headersMap map[string]any
		if err := json.Unmarshal([]byte(headersStr), &headersMap); err == nil {
			extractHeaderStrings(headersMap, headers)
		}
		return headers
	}

	// Handle map representation
	if headersMap, ok := headersRaw.(map[string]any); ok {
		extractHeaderStrings(headersMap, headers)
	}

	return headers
}

// extractHeaderStrings extracts string values from headers map into the target map.
func extractHeaderStrings(source map[string]any, target map[string]string) {
	for k, v := range source {
		if str, ok := v.(string); ok {
			target[k] = str
		}
	}
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

// WithPath creates a new HTTPClient with the URL path replaced or appended.
// If the path is absolute (starts with /), it replaces the URL path entirely.
// If the path is relative, it appends it to the existing URL path.
// If the path is empty, the URL remains unchanged but a new client is still returned.
// This method always returns a new client instance with deep copies of all mutable fields.
// Exception: If URL parsing fails, returns the original client as an error condition.
func (h *HTTPClient) WithPath(newPath string) *HTTPClient {
	// Parse the original URL
	parsedURL, err := url.Parse(h.URL)
	if err != nil {
		// If URL parsing fails, return the original client as an error condition
		// This is an exceptional case and should not happen with valid HTTPClient instances
		return h
	}

	// Modify the path only if newPath is not empty
	if newPath != "" {
		// If newPath starts with /, replace the entire path
		// Otherwise, append it to the existing path
		if strings.HasPrefix(newPath, "/") {
			parsedURL.Path = newPath
		} else {
			// Join paths properly
			parsedURL.Path = strings.TrimSuffix(parsedURL.Path, "/") + "/" + newPath
		}
	}

	// Create a deep copy of the Headers map
	headersCopy := make(map[string]string, len(h.Headers))
	maps.Copy(headersCopy, h.Headers)

	// Create a deep copy of the AcceptedStatusCodes slice
	statusCodesCopy := make([]int, len(h.AcceptedStatusCodes))
	copy(statusCodesCopy, h.AcceptedStatusCodes)

	// Create a deep copy of the Body slice
	var bodyCopy []byte
	if h.Body != nil {
		bodyCopy = make([]byte, len(h.Body))
		copy(bodyCopy, h.Body)
	}

	// Create a new client with the modified URL and deep copies of mutable fields
	// Note: Client (*http.Client) is safe to share as it's documented to be concurrent-safe
	return &HTTPClient{
		URL:                 parsedURL.String(),
		Method:              h.Method,
		Headers:             headersCopy,
		Body:                bodyCopy,
		Timeout:             h.Timeout,
		VerifySSL:           h.VerifySSL,
		AcceptedStatusCodes: statusCodesCopy,
		Client:              h.Client, // Safe to share - http.Client is concurrent-safe
	}
}
