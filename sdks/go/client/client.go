package client

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

// Client represents the Irmin API client.
type Client struct {
	// BaseURL is your Irmin Core API base: e.g. "https://api.irmin.dev"
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
			Timeout: 10 * time.Second,
		},
	}
}

// RequestOptions allows you to specify how you'd like to send data in the request.
type RequestOptions struct {
	Method      string
	Endpoint    string
	Body        interface{}       // For JSON, this can be a struct or map to JSON-encode
	FormFields  map[string]string // Key-value form fields (for multipart/form-data)
	Files       []FormFile        // Files to attach (for multipart/form-data)
	Headers     map[string]string // Extra headers, if needed
	ContentType string            // e.g. "application/json", "multipart/form-data", etc.
}

// FormFile holds information about a file you want to upload with multipart/form-data.
type FormFile struct {
	FieldName string    // The form field name
	FilePath  string    // Local path to the file on disk
	Reader    io.Reader // Use if you already have a stream (os.Open, bytes.Buffer, etc.)
	FileName  string    // Optional override for the actual filename
}

// Request is the main method that sends requests to the Irmin API and returns raw response data.
func (c *Client) Request(opts RequestOptions) ([]byte, error) {
	url := fmt.Sprintf("%s%s", c.BaseURL, opts.Endpoint)

	var bodyReader io.Reader
	headers := make(map[string]string)
	if opts.Headers != nil {
		for k, v := range opts.Headers {
			headers[k] = v
		}
	}

	switch opts.ContentType {
	case "application/json":
		// Encode Body as JSON
		if opts.Body != nil {
			jsonData, err := json.Marshal(opts.Body)
			if err != nil {
				return nil, fmt.Errorf("failed to marshal JSON body: %w", err)
			}
			bodyReader = bytes.NewReader(jsonData)
			headers["Content-Type"] = "application/json"
		}

	case "multipart/form-data":
		// Build a multipart form
		var b bytes.Buffer
		writer := multipart.NewWriter(&b)

		// Write form fields
		for key, val := range opts.FormFields {
			if err := writer.WriteField(key, val); err != nil {
				return nil, fmt.Errorf("failed to write form field %q: %w", key, err)
			}
		}

		// Write files
		for _, file := range opts.Files {
			var fileName string
			if file.FileName != "" {
				fileName = file.FileName
			} else {
				fileName = filepath.Base(file.FilePath)
			}

			var r io.Reader
			if file.Reader != nil {
				// If a reader is provided, use it
				r = file.Reader
			} else if file.FilePath != "" {
				// Otherwise open the file from disk
				f, err := os.Open(file.FilePath)
				if err != nil {
					return nil, fmt.Errorf("failed to open file %q: %w", file.FilePath, err)
				}
				defer f.Close()
				r = f
			} else {
				continue
			}

			part, err := writer.CreateFormFile(file.FieldName, fileName)
			if err != nil {
				return nil, fmt.Errorf("failed to create form file for field %q: %w", file.FieldName, err)
			}
			if _, err = io.Copy(part, r); err != nil {
				return nil, fmt.Errorf("failed to copy file data: %w", err)
			}
		}

		if err := writer.Close(); err != nil {
			return nil, fmt.Errorf("failed to close multipart writer: %w", err)
		}

		bodyReader = &b
		headers["Content-Type"] = writer.FormDataContentType()

	case "application/x-www-form-urlencoded":
		// Encode form fields as URL-encoded data
		var buf bytes.Buffer
		firstField := true
		for key, val := range opts.FormFields {
			if !firstField {
				buf.WriteByte('&')
			}
			buf.WriteString(fmt.Sprintf("%s=%s", key, val))
			firstField = false
		}
		bodyReader = bytes.NewReader(buf.Bytes())
		headers["Content-Type"] = "application/x-www-form-urlencoded"

	default:
		// If the content type is something else (or unspecified),
		// let the user provide raw bytes or a string
		if opts.Body != nil {
			switch data := opts.Body.(type) {
			case []byte:
				bodyReader = bytes.NewReader(data)
			case string:
				bodyReader = bytes.NewReader([]byte(data))
			default:
				return nil, fmt.Errorf("unsupported body type for content type %q", opts.ContentType)
			}
		}
	}

	// Build the HTTP request
	req, err := http.NewRequest(opts.Method, url, bodyReader)
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

	// Read the response body, regardless of status code
	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	// Check for non-2xx status codes and include body in error
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("API request failed with status %d. Body: %s", resp.StatusCode, responseBody)
	}

	return responseBody, nil
}

// FetchAPI is analogous to your "fetchAPI" in TypeScript.
// It sends a request and attempts to parse the response into IrminAPIResponse[T].
func (c *Client) FetchAPI(opts RequestOptions, out interface{}) (*IrminAPIResponse, error) {
	// 1) Make the HTTP request using your existing `Request` method.
	body, err := c.Request(opts)
	if err != nil {
		return nil, err
	}

	// 2) Unmarshal the main response.
	var apiResp IrminAPIResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response JSON: %w", err)
	}

	// 3) Check for top-level errors.
	if len(apiResp.Errors) > 0 {
		return &apiResp, fmt.Errorf("irmin core API errors: %v", apiResp.Errors)
	}

	// 4) If the caller passed a destination for `Data`, unmarshal it.
	if out != nil && len(apiResp.Data) > 0 {
		if err := json.Unmarshal(apiResp.Data, out); err != nil {
			return &apiResp, fmt.Errorf("failed to unmarshal Data field: %w", err)
		}
	}

	return &apiResp, nil
}

// FetchBinary is analogous to your "fetchBinary" in TypeScript.
// It sends a request and returns the raw bytes (which you can treat as a file, or parse further).
func (c *Client) FetchBinary(opts RequestOptions) ([]byte, error) {
	return c.Request(opts)
}
