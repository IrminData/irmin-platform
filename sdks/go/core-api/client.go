package irmincore

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"slices"
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

const (
	defaultTimeout = 10 * time.Second
)

// Client represents the Irmin API client.
type Client struct {
	// BaseURL is your Irmin Core API base: e.g. "https://api.irmin.co/api"
	BaseURL string

	// Token is your Irmin Core API token.
	Token string

	// Locale is used to request localised messages from the Irmin Core API.
	Locale string

	// HTTPClient is a customisable HTTP client. You can set timeouts, proxies, etc.
	HTTPClient *http.Client
}

// NewClient creates a new Irmin API client with default settings.
func NewClient(baseURL, token, locale string) *Client {
	return &Client{
		BaseURL: baseURL,
		Token:   token,
		Locale:  locale,
		HTTPClient: &http.Client{
			Timeout: defaultTimeout,
		},
	}
}

// RequestOptions allows you to specify how you'd like to send data in the request.
type RequestOptions struct {
	Method        string
	Endpoint      string
	AllowedStatus []int             // Status codes that are considered successful, e.g. 200, 201, 204
	Body          any               // For JSON, this can be a struct or map to JSON-encode
	FormFields    map[string]string // Key-value form fields (for multipart/form-data)
	Files         []FormFile        // Files to attach (for multipart/form-data)
	Headers       map[string]string // Extra headers, if needed
	ContentType   string            // e.g. "application/json", "multipart/form-data", etc.
}

// FormFile holds information about a file you want to upload with multipart/form-data.
type FormFile struct {
	FieldName string    // The form field name
	FilePath  string    // Local path to the file on disk
	Reader    io.Reader // Use if you already have a stream (os.Open, bytes.Buffer, etc.)
	FileName  string    // Optional override for the actual filename
}

// prepareJSONBody prepares the request body for JSON content type.
func (c *Client) prepareJSONBody(opts RequestOptions) (io.Reader, map[string]string, error) {
	if opts.Body == nil {
		return nil, nil, nil
	}

	jsonData, err := json.Marshal(opts.Body)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to marshal JSON body: %w", err)
	}

	headers := map[string]string{"Content-Type": "application/json"}
	return bytes.NewReader(jsonData), headers, nil
}

// prepareMultipartBody prepares the request body for multipart/form-data content type.
func (c *Client) prepareMultipartBody(opts RequestOptions) (io.Reader, map[string]string, error) {
	var b bytes.Buffer
	writer := multipart.NewWriter(&b)

	// Write form fields
	for key, val := range opts.FormFields {
		if err := writer.WriteField(key, val); err != nil {
			return nil, nil, fmt.Errorf("failed to write form field %q: %w", key, err)
		}
	}

	// Write files
	for _, file := range opts.Files {
		if err := c.writeFormFile(writer, file); err != nil {
			return nil, nil, err
		}
	}

	if err := writer.Close(); err != nil {
		return nil, nil, fmt.Errorf("failed to close multipart writer: %w", err)
	}

	headers := map[string]string{"Content-Type": writer.FormDataContentType()}
	return &b, headers, nil
}

// writeFormFile writes a single file to the multipart form.
func (c *Client) writeFormFile(writer *multipart.Writer, file FormFile) error {
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
		defer f.Close()
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

// prepareFormURLEncodedBody prepares the request body for application/x-www-form-urlencoded content type.
func (c *Client) prepareFormURLEncodedBody(opts RequestOptions) (io.Reader, map[string]string, error) {
	var buf bytes.Buffer
	firstField := true
	for key, val := range opts.FormFields {
		if !firstField {
			buf.WriteByte('&')
		}
		buf.WriteString(fmt.Sprintf("%s=%s", key, val))
		firstField = false
	}

	headers := map[string]string{"Content-Type": "application/x-www-form-urlencoded"}
	return bytes.NewReader(buf.Bytes()), headers, nil
}

// prepareDefaultBody prepares the request body for other content types.
func (c *Client) prepareDefaultBody(opts RequestOptions) (io.Reader, map[string]string, error) {
	if opts.Body == nil {
		return nil, nil, nil
	}

	switch data := opts.Body.(type) {
	case []byte:
		return bytes.NewReader(data), nil, nil
	case string:
		return bytes.NewReader([]byte(data)), nil, nil
	default:
		return nil, nil, fmt.Errorf("unsupported body type for content type %q", opts.ContentType)
	}
}

// prepareRequestBody prepares the request body based on content type.
func (c *Client) prepareRequestBody(opts RequestOptions) (io.Reader, map[string]string, error) {
	switch opts.ContentType {
	case "application/json":
		return c.prepareJSONBody(opts)
	case "multipart/form-data":
		return c.prepareMultipartBody(opts)
	case "application/x-www-form-urlencoded":
		return c.prepareFormURLEncodedBody(opts)
	default:
		return c.prepareDefaultBody(opts)
	}
}

// Request is the main method that sends requests to the Irmin API and returns raw response data.
func (c *Client) Request(opts RequestOptions) ([]byte, error) {
	ctx, cancel := context.WithTimeout(context.Background(), defaultTimeout)
	defer cancel()

	url := fmt.Sprintf("%s%s", c.BaseURL, opts.Endpoint)

	bodyReader, headers, err := c.prepareRequestBody(opts)
	if err != nil {
		return nil, err
	}

	// Add any extra headers from options
	if opts.Headers != nil {
		for k, v := range opts.Headers {
			headers[k] = v
		}
	}

	// Build the HTTP request
	req, err := http.NewRequestWithContext(ctx, opts.Method, url, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set default headers
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.Token))
	req.Header.Set("Accept-Language", c.Locale)
	req.Header.Set("Accept", "application/json")

	// Add any extra headers
	for k, v := range headers {
		req.Header.Set(k, v)
	}

	// Perform the request
	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request to %s failed: %w", url, err)
	}
	defer resp.Body.Close()

	// Read the response body
	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	// Check response status
	if len(opts.AllowedStatus) == 0 {
		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			return nil, fmt.Errorf("API request failed with status %d. Body: %s", resp.StatusCode, responseBody)
		}
	} else if !slices.Contains(opts.AllowedStatus, resp.StatusCode) {
		return nil, fmt.Errorf("API request failed with status %d. Body: %s", resp.StatusCode, responseBody)
	}

	return responseBody, nil
}

// FetchAPI sends a request and attempts to parse the response into IrminAPIResponse[T].
func (c *Client) FetchAPI(opts RequestOptions, out any) (*irminmodels.IrminAPIResponse, error) {
	// 1) Make the HTTP request using your existing `Request` method.
	body, err := c.Request(opts)
	if err != nil {
		return nil, err
	}

	// 2) Unmarshal the main response.
	var apiResp irminmodels.IrminAPIResponse
	err = json.Unmarshal(body, &apiResp)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal response JSON: %w", err)
	}

	// 3) Check for top-level errors.
	if len(apiResp.Errors) > 0 {
		return &apiResp, fmt.Errorf("irmin core API errors: %v", apiResp.Errors)
	}

	// 4) If the caller passed a destination for `Data`, unmarshal it.
	if out != nil && apiResp.Data != nil {
		// Create byte map from the Data field
		var dataBytes []byte
		dataBytes, err = json.Marshal(apiResp.Data)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal Data field: %w", err)
		}
		// Unmarshal the byte map into the provided destination
		err = json.Unmarshal(dataBytes, out)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal Data field: %w", err)
		}
	}

	return &apiResp, nil
}

// FetchBinary sends a request and returns the raw bytes (which you can treat as a file, or parse further).
func (c *Client) FetchBinary(opts RequestOptions) ([]byte, error) {
	return c.Request(opts)
}
