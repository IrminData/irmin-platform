package connectorsclient

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"mime"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"slices"
	"strconv"
	"strings"
	"sync"

	irminsdkgo "github.com/IrminData/irmin-sdk-go"
)

// HeaderConnectionID is sent on every outbound connector request so the
// receiving service can identify which Connection the operation belongs to.
// The connectors service uses it to call back to Core's internal OAuth
// access-token endpoint when it needs to authenticate with a vendor API.
//
// The value uses Go's canonical HTTP header form (capitalized first letter
// of each hyphen-separated word) so net/http's internal canonicalization
// doesn't rewrite it at send time. HTTP headers are case-insensitive on
// the wire, but this avoids linter churn and keeps reads consistent.
//
// Exported as a constant so the server-side helper in irmin-connectors can
// import the exact same string without drift.
const HeaderConnectionID = "X-Irmin-Connection-Id"

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

	// streamClient is an HTTP client without a top-level Timeout, used for streaming
	// requests where the body is read incrementally. It shares the Transport (and thus
	// connection pool, TLS config, etc.) with HTTPClient.
	streamClient *http.Client

	// ConnectionID is the Irmin Connection ID this client is operating on
	// behalf of. When non-zero it is sent as HeaderConnectionID on every
	// outbound request so OAuth-backed connectors can fetch the right
	// access token via Core's internal endpoint. Leave zero for calls that
	// are not connection-scoped (e.g., connector registration, info).
	ConnectionID uint

	// Logger, when non-nil, receives Debug-level progress events from
	// the async-pull poll loop and cancel-on-context-done paths. Nil
	// is safe — the client simply drops those logs. The field lives
	// here rather than being plumbed per-call so engine.Client can
	// attach its workflow-scoped slog.Logger once at initialization.
	Logger *slog.Logger

	// asyncPullJobMu guards fallbackAsyncPullJobID because the client can be
	// shared across goroutines.
	asyncPullJobMu sync.RWMutex
	// fallbackAsyncPullJobID stores the last known async pull job ID for
	// this connection/client. Load-bearing ONLY in the narrow scenario
	// where:
	//   (1) the same Client instance makes a second pull after a first
	//       pull that failed mid-flight (so rememberAsyncPullJobID was
	//       called but clearRememberedAsyncPullJobID was not), AND
	//   (2) the second pull returns 409 from a pre-SDK-#194 connector
	//       service that does not populate AlreadyRunningBody.JobID.
	// With the new SDK + new connector service the server always
	// populates JobID on 409, so this cache stays unread. Retire once
	// the SDK-populated path is confirmed in production — tracked in
	// the connectors-service rollout notes.
	fallbackAsyncPullJobID string
}

// NewClient creates a new Connector API client with default settings.
func NewClient(baseURL, token, locale string) *Client {
	// Explicitly set the Transport so both clients share the same connection
	// pool, TLS sessions, and proxy settings. Without this, http.Client leaves
	// Transport nil and silently falls back to http.DefaultTransport, which
	// means a later change to HTTPClient.Transport would not propagate.
	transport := http.DefaultTransport
	httpClient := &http.Client{
		Timeout:   irminsdkgo.DefaultConnectorTimeout,
		Transport: transport,
	}
	return &Client{
		BaseURL:    baseURL,
		Token:      token,
		Locale:     locale,
		HTTPClient: httpClient,
		// Omit the top-level Timeout so streaming body reads are not
		// interrupted by the request-response timeout.
		streamClient: &http.Client{Transport: transport},
	}
}

// WithConnectionID returns the receiver after setting ConnectionID, for
// call-site-friendly chaining:
//
//	client := connectorsclient.NewClient(url, tok, "en").WithConnectionID(conn.ID)
//
// Mutates and returns the same pointer; Client is a plain struct so the
// caller owns its sharing story. Passing 0 clears the connection context.
func (c *Client) WithConnectionID(id uint) *Client {
	c.ConnectionID = id
	return c
}

// WithLogger returns the receiver after attaching a slog.Logger for
// async-pull progress-event forwarding and best-effort cancel
// diagnostics. Mutates and returns the same pointer for fluent call
// sites:
//
//	client := connectorsclient.NewClient(url, tok, "en").
//		WithConnectionID(conn.ID).
//		WithLogger(c.Logger)
//
// Passing nil clears the logger and silences the pull loop's Debug
// output — matches the default zero-value behaviour.
func (c *Client) WithLogger(logger *slog.Logger) *Client {
	c.Logger = logger
	return c
}

// WithFallbackAsyncPullJobID seeds the client with a known async pull job ID.
// Used when /operation/pull returns 409 without a job_id so Core can still
// attempt targeted cancellation.
//
// Currently only called from tests — production code relies on the
// in-pull rememberAsyncPullJobID/clearRememberedAsyncPullJobID pair
// to populate the cache during a live pull. Exposed as a hook so
// callers running multiple pulls against one long-lived Client can
// pre-seed the cache from an out-of-band source (e.g., a durable
// queue); in the typical one-pull-per-client engine flow the cache
// is either populated mid-pull or not used at all.
func (c *Client) WithFallbackAsyncPullJobID(jobID string) *Client {
	c.rememberAsyncPullJobID(jobID)
	return c
}

// LastAsyncPullJobID returns the currently remembered async pull job ID.
// Returns empty string on a fresh Client — the cache is only populated by
// a successful StartOperationPull earlier on this same Client instance.
// See fallbackAsyncPullJobID's docstring for when this is load-bearing.
func (c *Client) LastAsyncPullJobID() string {
	c.asyncPullJobMu.RLock()
	defer c.asyncPullJobMu.RUnlock()
	return c.fallbackAsyncPullJobID
}

func (c *Client) rememberAsyncPullJobID(jobID string) {
	c.asyncPullJobMu.Lock()
	c.fallbackAsyncPullJobID = strings.TrimSpace(jobID)
	c.asyncPullJobMu.Unlock()
}

func (c *Client) clearRememberedAsyncPullJobID(jobID string) {
	trimmed := strings.TrimSpace(jobID)
	if trimmed == "" {
		return
	}
	c.asyncPullJobMu.Lock()
	if c.fallbackAsyncPullJobID == trimmed {
		c.fallbackAsyncPullJobID = ""
	}
	c.asyncPullJobMu.Unlock()
}

// setConnectionHeader stamps HeaderConnectionID on the request when a
// non-zero ConnectionID is configured. Called from every outbound request
// path (regular + streaming) so the connector service always sees the
// connection context, including when the caller routes through the
// streaming client for large payloads.
func (c *Client) setConnectionHeader(req *http.Request) {
	if c == nil || c.ConnectionID == 0 {
		return
	}
	req.Header.Set(HeaderConnectionID, strconv.FormatUint(uint64(c.ConnectionID), 10))
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
// The body is buffered in a bytes.Buffer so that Go's HTTP client can set
// Content-Length automatically (required by servers that don't support chunked encoding).
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
	isAllowed := (len(allowedStatus) == 0 && resp.StatusCode >= 200 && resp.StatusCode < 300) ||
		(len(allowedStatus) > 0 && slices.Contains(allowedStatus, resp.StatusCode))

	if !isAllowed {
		return nil, fmt.Errorf("API request failed with status %d. Body: %s", resp.StatusCode, bodyBytes)
	}

	// Recreate the response body since we consumed it for error reporting
	resp.Body = io.NopCloser(bytes.NewReader(bodyBytes))
	return resp, nil
}

// Request sends requests to the REST API of the connector and returns the raw response data.
// It utilises prepareBodyAndHeaders and doRequest to reduce code duplication.
func (c *Client) Request(ctx context.Context, opts RequestOptions) ([]byte, error) {
	// If no context provided, create one with default timeout
	if ctx == nil {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(context.Background(), irminsdkgo.DefaultConnectorTimeout)
		defer cancel()
	}

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
	c.setConnectionHeader(req)

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
func (c *Client) FetchAPI(ctx context.Context, opts RequestOptions, out any) error {
	// Make the HTTP request using the Request method.
	body, err := c.Request(ctx, opts)
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
func (c *Client) FetchStreamFiles(ctx context.Context, opts RequestOptions) ([]PulledFile, error) {
	// If no context provided, create one with default timeout
	if ctx == nil {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(context.Background(), irminsdkgo.DefaultConnectorTimeout)
		defer cancel()
	}

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
	c.setConnectionHeader(req)
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

// doStreamRequest executes an HTTP request and returns the raw response without reading the body.
// The caller is responsible for closing the response body.
// Uses the pre-built streamClient (no top-level Timeout) so the timer does not interrupt
// streaming body reads. Timeouts are controlled by the request's context instead.
func (c *Client) doStreamRequest(req *http.Request, allowedStatus []int) (*http.Response, error) {
	resp, err := c.streamClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request to %s failed: %w", req.URL, err)
	}

	isAllowed := (len(allowedStatus) == 0 && resp.StatusCode >= 200 && resp.StatusCode < 300) ||
		(len(allowedStatus) > 0 && slices.Contains(allowedStatus, resp.StatusCode))

	if !isAllowed {
		bodyBytes, _ := io.ReadAll(resp.Body)
		_ = resp.Body.Close()
		return nil, fmt.Errorf("API request failed with status %d. Body: %s", resp.StatusCode, bodyBytes)
	}

	return resp, nil
}

// cancelOnCloseReader wraps an io.ReadCloser and calls a cancel function when closed.
// This ensures context cancellation is tied to the reader's lifecycle rather than the calling function.
type cancelOnCloseReader struct {
	io.ReadCloser
	cancel context.CancelFunc
}

func (r *cancelOnCloseReader) Close() error {
	err := r.ReadCloser.Close()
	r.cancel()
	return err
}

// FetchStreamFilesReader sends a request and returns a streaming reader for the response body.
// The caller is responsible for closing the returned reader.
// This avoids loading the entire response into memory, suitable for large file transfers.
func (c *Client) FetchStreamFilesReader(ctx context.Context, opts RequestOptions) (io.ReadCloser, error) {
	var cancel context.CancelFunc
	if ctx == nil {
		// Use a cancellable context without a deadline. DefaultConnectorTimeout is
		// designed for regular request-response cycles; applying it here would abort
		// long-running streams mid-transfer. The cancel func is tied to the reader's
		// Close via cancelOnCloseReader, ensuring cleanup when the caller is done.
		ctx, cancel = context.WithCancel(context.Background())
	}

	fullURL := fmt.Sprintf("%s%s", c.BaseURL, opts.Endpoint)

	bodyReader, headers, err := c.prepareBodyAndHeaders(opts)
	if err != nil {
		if cancel != nil {
			cancel()
		}
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, opts.Method, fullURL, bodyReader)
	if err != nil {
		if cancel != nil {
			cancel()
		}
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.Token))
	req.Header.Set("Accept-Language", c.Locale)
	if _, exists := headers["Accept"]; !exists {
		req.Header.Set("Accept", "application/octet-stream")
	}
	c.setConnectionHeader(req)
	for k, v := range headers {
		req.Header.Set(k, v)
	}

	resp, err := c.doStreamRequest(req, opts.AllowedStatus)
	if err != nil {
		if cancel != nil {
			cancel()
		}
		return nil, err
	}

	// If we created a context with cancel, wrap the reader so cancel is called on Close().
	// When the caller provides their own context (cancel == nil), they own context
	// lifecycle and cancellation, so we return the raw body.
	if cancel != nil {
		return &cancelOnCloseReader{ReadCloser: resp.Body, cancel: cancel}, nil
	}
	return resp.Body, nil
}
