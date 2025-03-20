package dataEngine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"irmin-api/utils"
	"log"
	"mime"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"time"
)

// Client represents the Irmin Data Engine API client.
type Client struct {
	// BaseURL is the API base of the Irmin Data Engine: e.g. "https://engine.irmin.dev"
	BaseURL string

	// Token is the system token used to authenticate with the Irmin Data Engine.
	Token string

	// Locale is used to request localised messages from the API.
	Locale string

	// HTTPClient is a customisable HTTP client. You can set timeouts, proxies, etc.
	HTTPClient *http.Client
}

// NewClient creates a new Irmin Data Engine API client with default settings.
func NewClient(locale string) *Client {
	// Load environment variables
	env, err := utils.LoadEnv()
	if err != nil {
		log.Fatalf("failed to load environment variables: %v", err)
	}

	// Construct the Client
	return &Client{
		BaseURL: env.DataEngineURL,
		Token:   env.DataEngineToken,
		Locale:  locale,
		HTTPClient: &http.Client{
			Timeout: 120 * time.Second, // Default timeout of 120 seconds.
		},
	}
}

// RequestOptions allows you to specify how you'd like to send data in the request.
type RequestOptions struct {
	Method        string
	Endpoint      string
	AllowedStatus []int             // Status codes that are considered successful. If none provided, all 2xx codes are considered successful.
	Body          interface{}       // For JSON, this can be a struct or map to JSON-encode.
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

// prepareBodyAndHeaders builds the request body (if applicable) and merges any custom headers.
// It returns the body reader, a header map, and an error (if any).
func (c *Client) prepareBodyAndHeaders(opts RequestOptions) (io.Reader, map[string]string, error) {
	// Initialise header map and copy extra headers if provided.
	headers := make(map[string]string)
	if opts.Headers != nil {
		for k, v := range opts.Headers {
			headers[k] = v
		}
	}

	var bodyReader io.Reader

	switch opts.ContentType {
	case "application/json":
		// Encode Body as JSON if provided.
		if opts.Body != nil {
			jsonData, err := json.Marshal(opts.Body)
			if err != nil {
				return nil, nil, fmt.Errorf("failed to marshal JSON body: %w", err)
			}
			bodyReader = bytes.NewReader(jsonData)
			headers["Content-Type"] = "application/json"
		}

	case "multipart/form-data":
		// Build a multipart form.
		var b bytes.Buffer
		writer := multipart.NewWriter(&b)

		// Write form fields.
		for key, val := range opts.FormFields {
			if err := writer.WriteField(key, val); err != nil {
				return nil, nil, fmt.Errorf("failed to write form field %q: %w", key, err)
			}
		}

		// Write files.
		for _, file := range opts.Files {
			var fileName string
			if file.FileName != "" {
				fileName = file.FileName
			} else {
				fileName = filepath.Base(file.FilePath)
			}

			var r io.Reader
			if file.Reader != nil {
				// Use the provided reader.
				r = file.Reader
			} else if file.FilePath != "" {
				// Otherwise open the file from disk.
				f, err := os.Open(file.FilePath)
				if err != nil {
					return nil, nil, fmt.Errorf("failed to open file %q: %w", file.FilePath, err)
				}
				// Note: Not deferring f.Close() here since the file is read immediately.
				r = f
			} else {
				continue
			}

			part, err := writer.CreateFormFile(file.FieldName, fileName)
			if err != nil {
				return nil, nil, fmt.Errorf("failed to create form file for field %q: %w", file.FieldName, err)
			}
			if _, err = io.Copy(part, r); err != nil {
				return nil, nil, fmt.Errorf("failed to copy file data: %w", err)
			}
		}

		if err := writer.Close(); err != nil {
			return nil, nil, fmt.Errorf("failed to close multipart writer: %w", err)
		}

		bodyReader = &b
		headers["Content-Type"] = writer.FormDataContentType()

	case "application/x-www-form-urlencoded":
		// Encode form fields as URL-encoded data.
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
		// For any other content type, let the user provide raw bytes or a string.
		if opts.Body != nil {
			switch data := opts.Body.(type) {
			case []byte:
				bodyReader = bytes.NewReader(data)
			case string:
				bodyReader = bytes.NewReader([]byte(data))
			default:
				return nil, nil, fmt.Errorf("unsupported body type for content type %q", opts.ContentType)
			}
		}
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

	// Check if the response status code is allowed.
	if len(allowedStatus) == 0 {
		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			bodyBytes, _ := io.ReadAll(resp.Body)
			resp.Body.Close()
			return nil, fmt.Errorf("API request failed with status %d. Body: %s", resp.StatusCode, bodyBytes)
		}
	} else {
		if !slices.Contains(allowedStatus, resp.StatusCode) {
			bodyBytes, _ := io.ReadAll(resp.Body)
			resp.Body.Close()
			return nil, fmt.Errorf("API request failed with status %d. Body: %s", resp.StatusCode, bodyBytes)
		}
	}

	return resp, nil
}

// Request sends requests to the REST API of the Data Engine and returns the raw response data.
// It utilises prepareBodyAndHeaders and doRequest to reduce code duplication.
func (c *Client) Request(opts RequestOptions) ([]byte, error) {
	// Construct the full URL.
	url := fmt.Sprintf("%s%s", c.BaseURL, opts.Endpoint)

	// Prepare the request body and headers.
	bodyReader, headers, err := c.prepareBodyAndHeaders(opts)
	if err != nil {
		return nil, err
	}

	// Build the HTTP request.
	req, err := http.NewRequest(opts.Method, url, bodyReader)
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
func (c *Client) FetchAPI(opts RequestOptions, out interface{}) error {
	// Make the HTTP request using the Request method.
	body, err := c.Request(opts)
	if err != nil {
		return err
	}

	// If a destination was provided and the body is non-empty, unmarshal the JSON.
	if out != nil && len(body) > 0 {
		if err := json.Unmarshal(body, out); err != nil {
			return fmt.Errorf("failed to unmarshal Data field: %w", err)
		}
	}

	return nil
}

// FetchStreamFiles sends a request based on the provided RequestOptions and returns a slice of PulledFile.
// If the response is multipart, each part is parsed as a separate file. Otherwise, the response is treated as a single file.
func (c *Client) FetchStreamFiles(opts RequestOptions) ([]PulledFile, error) {
	// Construct full URL.
	url := fmt.Sprintf("%s%s", c.BaseURL, opts.Endpoint)

	// Prepare request body and headers.
	bodyReader, headers, err := c.prepareBodyAndHeaders(opts)
	if err != nil {
		return nil, err
	}

	// Build the HTTP request.
	req, err := http.NewRequest(opts.Method, url, bodyReader)
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

	var files []PulledFile
	if strings.HasPrefix(mediaType, "multipart/") {
		// Process as a multipart response.
		boundary, ok := params["boundary"]
		if !ok {
			return nil, fmt.Errorf("missing boundary in multipart response")
		}
		mr := multipart.NewReader(resp.Body, boundary)
		for {
			part, err := mr.NextPart()
			if err == io.EOF {
				break
			}
			if err != nil {
				return nil, fmt.Errorf("error reading multipart: %w", err)
			}

			// Extract filename from part header.
			var filename string
			if disp := part.Header.Get("Content-Disposition"); disp != "" {
				_, dispParams, err := mime.ParseMediaType(disp)
				if err == nil {
					filename = dispParams["filename"]
				}
			}

			content, err := io.ReadAll(part)
			if err != nil {
				return nil, fmt.Errorf("failed to read multipart part: %w", err)
			}

			files = append(files, PulledFile{
				Filename: filename,
				Content:  content,
			})
		}
	} else {
		// Process as a single file.
		var filename string
		if disp := resp.Header.Get("Content-Disposition"); disp != "" {
			_, dispParams, err := mime.ParseMediaType(disp)
			if err == nil {
				filename = dispParams["filename"]
			}
		}
		content, err := io.ReadAll(resp.Body)
		if err != nil {
			return nil, fmt.Errorf("failed to read response body: %w", err)
		}
		files = append(files, PulledFile{
			Filename: filename,
			Content:  content,
		})
	}

	return files, nil
}
