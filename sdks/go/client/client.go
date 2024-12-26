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

// Client represents the Irmin API client
type Client struct {
	BaseURL    string
	Token      string
	HTTPClient *http.Client
	Locale     string
}

// NewClient creates a new Irmin API client
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

// RequestOptions allows you to specify how you'd like to send data
type RequestOptions struct {
	Method      string
	Endpoint    string
	Body        interface{}       // For JSON, this can be a struct or map to JSON-encode
	FormFields  map[string]string // Key-Value form fields (for multipart/form-data)
	Files       []FormFile        // File attachments (for multipart/form-data)
	Headers     map[string]string // Extra headers if needed
	ContentType string            // e.g. "application/json", "multipart/form-data", etc.
}

// FormFile holds information about the file you want to upload
type FormFile struct {
	FieldName string    // The form field name
	FilePath  string    // Local path to the file
	Reader    io.Reader // If you have a stream, e.g. os.Open(filePath). Use one or the other
	FileName  string    // Override the default file name (otherwise uses base name of FilePath)
}

// Request is the main method to handle various request types and return raw response data
func (c *Client) Request(opts RequestOptions) ([]byte, error) {
	// Construct URL
	url := fmt.Sprintf("%s%s", c.BaseURL, opts.Endpoint)

	var bodyReader io.Reader

	switch opts.ContentType {
	case "application/json":
		// Encode the Body as JSON
		if opts.Body != nil {
			jsonData, err := json.Marshal(opts.Body)
			if err != nil {
				return nil, err
			}
			bodyReader = bytes.NewReader(jsonData)
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
			// Determine file name
			var fileName string
			if file.FileName != "" {
				fileName = file.FileName
			} else {
				fileName = filepath.Base(file.FilePath)
			}

			// Obtain the reader if not provided
			var r io.Reader
			if file.Reader != nil {
				r = file.Reader
			} else if file.FilePath != "" {
				f, err := os.Open(file.FilePath)
				if err != nil {
					return nil, fmt.Errorf("failed to open file %q: %w", file.FilePath, err)
				}
				defer f.Close()
				r = f
			} else {
				// If no file source is provided, skip
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

		// Set the content type to include the boundary
		opts.Headers["Content-Type"] = writer.FormDataContentType()

	default:
		// If content type is not specified or something else,
		// just assume there's no body or it is handled externally
		if opts.Body != nil {
			// Use raw bytes if user manually encodes them
			switch b := opts.Body.(type) {
			case []byte:
				bodyReader = bytes.NewReader(b)
			case string:
				bodyReader = bytes.NewReader([]byte(b))
			default:
				return nil, fmt.Errorf("unsupported body type for unspecified content type")
			}
		}
	}

	// Build the HTTP request
	req, err := http.NewRequest(opts.Method, url, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Default headers
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.Token))
	req.Header.Set("Accept-Language", c.Locale)

	// If the user hasn't explicitly set Content-Type in headers, do so here.
	if opts.ContentType == "application/json" {
		req.Header.Set("Content-Type", "application/json")
	}

	// Add any extra headers
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}

	// Perform the request
	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	// Handle HTTP error status codes (non-2xx)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("API request failed with status %d", resp.StatusCode)
	}

	// Read the response body (could be JSON, octet-stream, file, etc.)
	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	return responseBody, nil
}
