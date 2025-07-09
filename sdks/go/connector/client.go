package irminconnectorclient

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"slices"
	"strings"

	irminsdkgo "github.com/IrminData/irmin-sdk-go"
)

// Timeout constants are now defined in the root constants.go file

// Client represents the Connector API client.
type Client struct {
	// BaseURL is your Connector's API base: e.g. "https://connectors.irmin.dev/postgres"
	BaseURL string

	// Token is the operation or system token for the Connector, depending on what you're doing.
	Token string

	// Locale is used to request localised messages from the Connector API.
	Locale string

	// HTTPClient is a customisable HTTP client. You can set timeouts, proxies, etc.
	HTTPClient *http.Client
}

// NewClient creates a new Connector API client with default settings.
func NewClient(baseURL, token, locale string) *Client {
	return &Client{
		BaseURL: baseURL,
		Token:   token,
		Locale:  locale,
		HTTPClient: &http.Client{
			Timeout: irminsdkgo.DefaultConnectorTimeout,
		},
	}
}

// RequestOptions allows you to specify how you'd like to send data in the request.
type RequestOptions struct {
	Method        string
	Endpoint      string
	AllowedStatus []int             // Status codes that are considered successful. If none provided, all 2xx codes are considered successful.
	Body          any               // For JSON, this can be a struct or map to JSON-encode.
	FormFields    map[string]string // Key-value form fields (for multipart/form-data or URL-encoded).
	Files         []FormFile        // Files to attach (for multipart/form-data).
	Headers       map[string]string // Extra headers, if needed.
	ContentType   string            // e.g. "application/json", "multipart/form-data", etc.
}

// FormFile holds information about a file you want to upload with multipart/form-data.
type FormFile struct {
	FieldName string    // The form field name.
	FilePath  string    // Local path to the file on disk.
	Reader    io.Reader // Use if you already have a stream (os.Open, bytes.Buffer, etc.).
	FileName  string    // Optional override for the actual filename.
}

// PulledFile represents a file returned with a stream request.
type PulledFile struct {
	// Filename is the name extracted from the Content-Disposition header.
	Filename string
	// Content holds the file's content.
	Content []byte
}

// prepareJSONBody prepares a JSON request body and sets appropriate headers.
func prepareJSONBody(body any, headers map[string]string) (io.Reader, error) {
	if body == nil {
		return bytes.NewReader(nil), nil
	}
	jsonData, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal JSON body: %w", err)
	}
	headers["Content-Type"] = "application/json"
	return bytes.NewReader(jsonData), nil
}

// prepareMultipartBody prepares a multipart/form-data request body and sets appropriate headers.
func prepareMultipartBody(
	formFields map[string]string,
	files []FormFile,
	headers map[string]string,
) (io.Reader, error) {
	var b bytes.Buffer
	writer := multipart.NewWriter(&b)

	// Write form fields
	for key, val := range formFields {
		if err := writer.WriteField(key, val); err != nil {
			return nil, fmt.Errorf("failed to write form field %q: %w", key, err)
		}
	}

	// Write files
	for _, file := range files {
		if err := writeFormFile(writer, file); err != nil {
			return nil, err
		}
	}

	if err := writer.Close(); err != nil {
		return nil, fmt.Errorf("failed to close multipart writer: %w", err)
	}

	headers["Content-Type"] = writer.FormDataContentType()
	return &b, nil
}

// writeFormFile writes a single file to the multipart writer.
func writeFormFile(writer *multipart.Writer, file FormFile) error {
	fileName := file.FileName
	if fileName == "" {
		fileName = filepath.Base(file.FilePath)
	}

	var r io.Reader
	switch {
	case file.Reader != nil:
		r = file.Reader
	case file.FilePath != "":
		f, err := os.Open(file.FilePath)
		if err != nil {
			return fmt.Errorf("failed to open file %q: %w", file.FilePath, err)
		}
		r = f
	default:
		return nil
	}

	part, err := writer.CreateFormFile(file.FieldName, fileName)
	if err != nil {
		return fmt.Errorf("failed to create form file for field %q: %w", file.FieldName, err)
	}
	if _, err = io.Copy(part, r); err != nil {
		return fmt.Errorf("failed to copy file data: %w", err)
	}
	return nil
}

// prepareURLEncodedBody prepares an application/x-www-form-urlencoded request body and sets appropriate headers.
func prepareURLEncodedBody(formFields map[string]string, headers map[string]string) io.Reader {
	var buf bytes.Buffer
	firstField := true
	for key, val := range formFields {
		if !firstField {
			buf.WriteByte('&')
		}
		encodedKey := url.QueryEscape(key)
		encodedVal := url.QueryEscape(val)
		buf.WriteString(fmt.Sprintf("%s=%s", encodedKey, encodedVal))
		firstField = false
	}
	headers["Content-Type"] = "application/x-www-form-urlencoded"
	return bytes.NewReader(buf.Bytes())
}

// prepareRawBody prepares a raw request body for other content types.
func prepareRawBody(body any, contentType string) (io.Reader, error) {
	if body == nil {
		return bytes.NewReader(nil), nil
	}
	switch data := body.(type) {
	case []byte:
		return bytes.NewReader(data), nil
	case string:
		return bytes.NewReader([]byte(data)), nil
	default:
		return nil, fmt.Errorf("unsupported body type for content type %q", contentType)
	}
}

func (c *Client) prepareBodyAndHeaders(opts RequestOptions) (io.Reader, map[string]string, error) {
	// Initialize header map and copy extra headers if provided
	headers := make(map[string]string)
	if opts.Headers != nil {
		for k, v := range opts.Headers {
			headers[k] = v
		}
	}

	var bodyReader io.Reader
	var err error

	switch opts.ContentType {
	case "application/json":
		bodyReader, err = prepareJSONBody(opts.Body, headers)
	case "multipart/form-data":
		bodyReader, err = prepareMultipartBody(opts.FormFields, opts.Files, headers)
	case "application/x-www-form-urlencoded":
		bodyReader = prepareURLEncodedBody(opts.FormFields, headers)
	default:
		bodyReader, err = prepareRawBody(opts.Body, opts.ContentType)
	}

	if err != nil {
		return nil, nil, err
	}

	return bodyReader, headers, nil
}

// doRequest executes the HTTP request and verifies that the response status is allowed.
// It returns the raw *http.Response. The caller is responsible for closing the response body.
func (c *Client) doRequest(req *http.Request, allowedStatus []int) (*http.Response, error) {
	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request to %s failed: %w", req.URL, err)
	}

	// Read response body for error reporting
	bodyBytes, _ := io.ReadAll(resp.Body)
	closeErr := resp.Body.Close()
	if closeErr != nil {
		return nil, fmt.Errorf("failed to close response body: %w", closeErr)
	}

	// Check if the response status code is allowed
	isAllowed := len(allowedStatus) == 0 && (resp.StatusCode >= 200 && resp.StatusCode < 300) ||
		len(allowedStatus) > 0 && slices.Contains(allowedStatus, resp.StatusCode)

	if !isAllowed {
		return nil, fmt.Errorf("API request failed with status %d. Body: %s", resp.StatusCode, bodyBytes)
	}

	// Recreate the response body since we consumed it for error reporting
	resp.Body = io.NopCloser(bytes.NewReader(bodyBytes))
	return resp, nil
}

// Request sends requests to the REST API of the connector and returns the raw response data.
// It utilises prepareBodyAndHeaders and doRequest to reduce code duplication.
func (c *Client) Request(opts RequestOptions) ([]byte, error) {
	// Create a context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), irminsdkgo.DefaultConnectorTimeout)
	defer cancel()

	// Construct the full URL.
	url := fmt.Sprintf("%s%s", c.BaseURL, opts.Endpoint)

	// Prepare the request body and headers.
	bodyReader, headers, err := c.prepareBodyAndHeaders(opts)
	if err != nil {
		return nil, err
	}

	// Build the HTTP request.
	req, err := http.NewRequestWithContext(ctx, opts.Method, url, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set default headers.
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.Token))
	req.Header.Set("Accept-Language", c.Locale)
	req.Header.Set("Accept", "application/json")

	// Add any extra headers.
	for k, v := range headers {
		req.Header.Set(k, v)
	}

	// Execute the request.
	resp, err := c.doRequest(req, opts.AllowedStatus)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// Read and return the response body.
	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	return responseBody, nil
}

// FetchAPI sends a request and attempts to parse the JSON response into a struct if provided.
func (c *Client) FetchAPI(opts RequestOptions, out any) error {
	// Make the HTTP request using the Request method.
	body, err := c.Request(opts)
	if err != nil {
		return err
	}

	// If a destination was provided and the body is non-empty, unmarshal the JSON.
	if out != nil && len(body) > 0 {
		err = json.Unmarshal(body, out)
		if err != nil {
			return fmt.Errorf("failed to unmarshal Data field: %w", err)
		}
	}

	return nil
}

// FetchStreamFiles sends a request based on the provided RequestOptions and returns a slice of PulledFile.
// If the response is multipart, each part is parsed as a separate file. Otherwise, the response is treated as a single file.
func (c *Client) FetchStreamFiles(opts RequestOptions) ([]PulledFile, error) {
	// Create a context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), irminsdkgo.DefaultConnectorTimeout)
	defer cancel()

	// Construct full URL.
	url := fmt.Sprintf("%s%s", c.BaseURL, opts.Endpoint)

	// Prepare request body and headers.
	bodyReader, headers, err := c.prepareBodyAndHeaders(opts)
	if err != nil {
		return nil, err
	}

	// Build the HTTP request.
	req, err := http.NewRequestWithContext(ctx, opts.Method, url, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set default headers.
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.Token))
	req.Header.Set("Accept-Language", c.Locale)
	if _, exists := headers["Accept"]; !exists {
		req.Header.Set("Accept", "application/octet-stream")
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}

	// Execute the request.
	resp, err := c.doRequest(req, opts.AllowedStatus)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// Parse the Content-Type header.
	contentType := resp.Header.Get("Content-Type")
	mediaType, params, err := mime.ParseMediaType(contentType)
	if err != nil {
		return nil, fmt.Errorf("failed to parse Content-Type: %w", err)
	}

	if strings.HasPrefix(mediaType, "multipart/") {
		return c.handleMultipartResponse(resp, params)
	}
	return c.handleSingleFileResponse(resp)
}

// handleMultipartResponse processes a multipart response and returns a slice of PulledFile.
func (c *Client) handleMultipartResponse(resp *http.Response, params map[string]string) ([]PulledFile, error) {
	boundary, ok := params["boundary"]
	if !ok {
		return nil, errors.New("missing boundary in multipart response")
	}

	mr := multipart.NewReader(resp.Body, boundary)
	var files []PulledFile

	for {
		part, err := mr.NextPart()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("error reading multipart: %w", err)
		}

		filename := extractFilenameFromPart(part)
		content, err := io.ReadAll(part)
		if err != nil {
			return nil, fmt.Errorf("failed to read multipart part: %w", err)
		}

		files = append(files, PulledFile{
			Filename: filename,
			Content:  content,
		})
	}

	return files, nil
}

// handleSingleFileResponse processes a single file response and returns a slice of PulledFile.
func (c *Client) handleSingleFileResponse(resp *http.Response) ([]PulledFile, error) {
	filename := extractFilenameFromResponse(resp)
	content, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	return []PulledFile{{
		Filename: filename,
		Content:  content,
	}}, nil
}

// extractFilenameFromPart extracts the filename from a multipart part's Content-Disposition header.
func extractFilenameFromPart(part *multipart.Part) string {
	if disp := part.Header.Get("Content-Disposition"); disp != "" {
		_, dispParams, err := mime.ParseMediaType(disp)
		if err == nil {
			return dispParams["filename"]
		}
	}
	return ""
}

// extractFilenameFromResponse extracts the filename from a response's Content-Disposition header.
func extractFilenameFromResponse(resp *http.Response) string {
	if disp := resp.Header.Get("Content-Disposition"); disp != "" {
		_, dispParams, err := mime.ParseMediaType(disp)
		if err == nil {
			return dispParams["filename"]
		}
	}
	return ""
}
