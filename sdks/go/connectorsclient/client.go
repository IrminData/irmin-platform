package connectorsclient

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
	"strconv"
	"strings"

	irminsdkgo "github.com/IrminData/irmin-sdk-go"
)

// HeaderConnectionID is sent on every outbound connector request so
// the receiving service can identify which Irmin Connection the
// operation belongs to. The value mirrors the exact string used by the
// legacy Core-side connectors-client so migration is a drop-in.
//
// Exported as a constant so the server-side helper in irmin-connectors
// can import the exact same string without drift.
const HeaderConnectionID = "X-Irmin-Connection-Id"

// Client is the connector-service HTTP client.
//
// A Client is safe for concurrent use. It keeps two underlying
// http.Clients: one for short request/response calls (status, start,
// cancel, metadata) and one without a top-level timeout for streaming
// (/operation/result, multipart downloads), so long transfers are not
// cut off by the request-response timer.
type Client struct {
	// BaseURL is the connector service base, e.g.
	// "https://connectors.irmin.dev/stripe". It must include the
	// connector-specific prefix the service expects.
	BaseURL string

	// Token is the operation or system token for the connector, set on
	// the Authorization header as "Bearer <token>".
	Token string

	// HTTPClient is the client used for short request-response calls.
	// Defaults to a client with irminsdkgo.DefaultConnectorTimeout.
	// Callers that need custom transports, proxies, or timeouts may
	// replace it.
	HTTPClient *http.Client

	// streamClient is used for streaming reads (/operation/result,
	// multipart file downloads). It intentionally has no top-level
	// Timeout so large transfers are not aborted by the response-level
	// timer; lifecycle is instead tied to the request context.
	streamClient *http.Client

	// ConnectionID is the Irmin Connection ID this client is operating
	// on behalf of. When non-zero it is sent as HeaderConnectionID on
	// every outbound request so OAuth-backed connectors can fetch the
	// right access token. Leave zero for calls that are not
	// connection-scoped.
	ConnectionID uint
}

// NewClient creates a new connector-service client with sensible
// default http.Client settings. The two underlying clients share a
// single transport so connection pooling and TLS sessions are reused
// across short and streaming calls.
//
// Note: connector responses are English-only. There is no
// Accept-Language negotiation — the connectors service does not
// localize error bodies, dynamic-field labels, or progress text, and
// callers that need translated UI strings must layer their own
// localization on top of the connector's responses.
func NewClient(baseURL, token string) *Client {
	transport := http.DefaultTransport
	return &Client{
		BaseURL: baseURL,
		Token:   token,
		HTTPClient: &http.Client{
			Timeout:   irminsdkgo.DefaultConnectorTimeout,
			Transport: transport,
		},
		streamClient: &http.Client{Transport: transport},
	}
}

// WithConnectionID returns the receiver after setting ConnectionID,
// enabling a fluent call-site:
//
//	client := connectorsclient.NewClient(url, tok).WithConnectionID(conn.ID)
//
// Mutates and returns the same pointer. Passing 0 clears the
// connection context.
func (c *Client) WithConnectionID(id uint) *Client {
	c.ConnectionID = id
	return c
}

// applyDefaultHeaders sets the headers common to every request this
// client issues using the Client's configured Token (the system token
// in typical use). MUST be the LAST header-stamping step on a request:
// it overwrites Authorization and X-Irmin-Connection-Id unconditionally
// so a caller-supplied opts.Headers cannot silently downgrade the
// security-relevant headers (e.g. swapping Authorization to a different
// bearer or pointing X-Irmin-Connection-Id at a connection the caller
// is not authorized for). Accept is only stamped if no caller value is
// already present, so callers can still ask for a non-default media
// type when a route supports it.
func (c *Client) applyDefaultHeaders(req *http.Request, accept string) {
	c.applyHeadersForToken(req, c.Token, accept)
}

// applyHeadersForToken stamps the standard headers using an explicit
// bearer token instead of c.Token. Used by OperationJob's lifecycle
// methods (Status, Result, Cancel, Wait) where the per-job operation
// token must override the client's system token — the connectors
// service rejects the system token on job-scoped routes by design so
// a compromised system token cannot poll or cancel jobs it did not
// start.
func (c *Client) applyHeadersForToken(req *http.Request, token, accept string) {
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))
	if req.Header.Get("Accept") == "" && accept != "" {
		req.Header.Set("Accept", accept)
	}
	if c.ConnectionID != 0 {
		req.Header.Set(HeaderConnectionID, strconv.FormatUint(uint64(c.ConnectionID), 10))
	}
}

// RequestOptions controls how a request is issued via Request /
// FetchAPI / FetchStreamFiles. Callers pick one of the four well-known
// ContentType values — the body preparation path dispatches on it.
type RequestOptions struct {
	// Method is the HTTP verb (http.MethodGet, http.MethodPost, ...).
	Method string
	// Endpoint is the path appended to Client.BaseURL. Include the
	// leading slash.
	Endpoint string
	// AllowedStatus is the set of response codes considered successful.
	// Empty means "2xx".
	AllowedStatus []int
	// Body is the request body for JSON / raw content types. Ignored
	// for multipart and form-urlencoded.
	Body any
	// FormFields are key-value fields for multipart or form-urlencoded
	// requests.
	FormFields map[string]string
	// Files are the attachments for multipart requests.
	Files []FormFile
	// Headers are applied after applyDefaultHeaders, so a caller can
	// override the default Authorization, Accept-Language, Accept,
	// and HeaderConnectionID values.
	Headers map[string]string
	// ContentType switches the body-preparation strategy. One of:
	// "application/json", "multipart/form-data",
	// "application/x-www-form-urlencoded", or any other value for a
	// raw []byte/string body.
	ContentType string
}

// FormFile describes a single file attachment for multipart uploads.
// Provide either FilePath (the file is opened on demand) or Reader
// (already-open stream); if both are set, Reader wins.
type FormFile struct {
	FieldName string
	FilePath  string
	Reader    io.Reader
	FileName  string
}

// PulledFile is one file extracted from a streaming multipart or
// single-file response.
type PulledFile struct {
	Filename string
	Content  []byte
}

// prepareJSONBody prepares a JSON request body and sets the matching
// Content-Type header.
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

// prepareMultipartBody prepares a multipart/form-data body, buffered in
// memory so Go's HTTP client can set Content-Length (servers that
// don't support chunked encoding rely on this).
func prepareMultipartBody(
	formFields map[string]string,
	files []FormFile,
	headers map[string]string,
) (io.Reader, error) {
	var b bytes.Buffer
	writer := multipart.NewWriter(&b)

	for key, val := range formFields {
		if err := writer.WriteField(key, val); err != nil {
			return nil, fmt.Errorf("failed to write form field %q: %w", key, err)
		}
	}

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

// writeFormFile emits one FormFile into the multipart writer.
func writeFormFile(writer *multipart.Writer, file FormFile) error {
	fileName := file.FileName
	if fileName == "" && file.FilePath != "" {
		fileName = filepath.Base(file.FilePath)
	}
	if fileName == "" {
		// Reader-only FormFile with no caller-provided name. Use the
		// field name as a stable fallback rather than letting
		// filepath.Base("") leak "." into the multipart payload, which
		// no server-side parser handles cleanly.
		fileName = file.FieldName
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
		// Close the file descriptor before returning regardless of
		// outcome. Missing this leaked one fd per push/patch that
		// supplied FilePath — enough of those under load and the
		// process hits its open-files rlimit.
		defer func() { _ = f.Close() }()
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

// prepareURLEncodedBody renders formFields as
// application/x-www-form-urlencoded and sets the Content-Type header.
func prepareURLEncodedBody(formFields map[string]string, headers map[string]string) io.Reader {
	values := url.Values{}
	for key, val := range formFields {
		values.Set(key, val)
	}
	headers["Content-Type"] = "application/x-www-form-urlencoded"
	return strings.NewReader(values.Encode())
}

// prepareRawBody prepares []byte or string bodies for non-structured
// content types and stamps the matching Content-Type on the outgoing
// header map (parity with the JSON / multipart / URL-encoded helpers,
// which all do the same — without this, a caller selecting a custom
// ContentType like "text/xml" would issue a request with no
// Content-Type header at all).
func prepareRawBody(body any, contentType string, headers map[string]string) (io.Reader, error) {
	if contentType != "" {
		headers["Content-Type"] = contentType
	}
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

// prepareBodyAndHeaders dispatches on ContentType, returning the body
// reader plus the set of headers to merge onto the request.
func (c *Client) prepareBodyAndHeaders(opts RequestOptions) (io.Reader, map[string]string, error) {
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
		bodyReader, err = prepareRawBody(opts.Body, opts.ContentType, headers)
	}

	if err != nil {
		return nil, nil, err
	}
	return bodyReader, headers, nil
}

// isStatusAllowed returns true when status is in allowed, or when
// allowed is empty and status is in the 2xx range.
func isStatusAllowed(status int, allowed []int) bool {
	if len(allowed) == 0 {
		return status >= 200 && status < 300
	}
	return slices.Contains(allowed, status)
}

// doRequest executes req via HTTPClient, validates the status code,
// and returns a response whose body is replayable (the full body is
// read once and replaced with a bytes.Reader) so the caller can drain
// it at its leisure.
func (c *Client) doRequest(req *http.Request, allowedStatus []int) (*http.Response, error) {
	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request to %s failed: %w", req.URL, err)
	}

	bodyBytes, readErr := io.ReadAll(resp.Body)
	if closeErr := resp.Body.Close(); closeErr != nil {
		if readErr == nil {
			return nil, fmt.Errorf("failed to close response body: %w", closeErr)
		}
	}
	if readErr != nil {
		return nil, fmt.Errorf("failed to read response body: %w", readErr)
	}

	if !isStatusAllowed(resp.StatusCode, allowedStatus) {
		return nil, fmt.Errorf("API request failed with status %d. Body: %s", resp.StatusCode, bodyBytes)
	}

	resp.Body = io.NopCloser(bytes.NewReader(bodyBytes))
	return resp, nil
}

// Request issues an HTTP request and returns the full response body as
// bytes. Default timeout via DefaultConnectorTimeout when ctx is nil.
func (c *Client) Request(ctx context.Context, opts RequestOptions) ([]byte, error) {
	if ctx == nil {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(context.Background(), irminsdkgo.DefaultConnectorTimeout)
		defer cancel()
	}

	fullURL := fmt.Sprintf("%s%s", c.BaseURL, opts.Endpoint)
	bodyReader, headers, err := c.prepareBodyAndHeaders(opts)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, opts.Method, fullURL, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Order matters: caller headers first, defaults LAST so a caller
	// cannot silently override Authorization or X-Irmin-Connection-Id
	// via opts.Headers.
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	c.applyDefaultHeaders(req, "application/json")

	resp, err := c.doRequest(req, opts.AllowedStatus)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}
	return responseBody, nil
}

// FetchAPI issues a request and unmarshals the JSON response body into
// out. Passes through the Request pipeline; out may be nil for
// fire-and-forget calls.
func (c *Client) FetchAPI(ctx context.Context, opts RequestOptions, out any) error {
	body, err := c.Request(ctx, opts)
	if err != nil {
		return err
	}
	if out != nil && len(body) > 0 {
		if unmarshalErr := json.Unmarshal(body, out); unmarshalErr != nil {
			return fmt.Errorf("failed to unmarshal response body: %w", unmarshalErr)
		}
	}
	return nil
}

// FetchStreamFiles issues a request and parses the response body into
// PulledFile entries. If the response is multipart/*, each part
// becomes one entry; otherwise the full body is returned as a single
// file. Loads the full body into memory — callers with large downloads
// should prefer FetchStreamFilesReader.
func (c *Client) FetchStreamFiles(ctx context.Context, opts RequestOptions) ([]PulledFile, error) {
	if ctx == nil {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(context.Background(), irminsdkgo.DefaultConnectorTimeout)
		defer cancel()
	}

	fullURL := fmt.Sprintf("%s%s", c.BaseURL, opts.Endpoint)
	bodyReader, headers, err := c.prepareBodyAndHeaders(opts)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, opts.Method, fullURL, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Caller headers first, defaults LAST — see Request() for rationale.
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	c.applyDefaultHeaders(req, "application/octet-stream")

	resp, err := c.doRequest(req, opts.AllowedStatus)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	contentType := resp.Header.Get("Content-Type")
	mediaType, params, err := mime.ParseMediaType(contentType)
	if err != nil {
		return nil, fmt.Errorf("failed to parse Content-Type: %w", err)
	}

	if strings.HasPrefix(mediaType, "multipart/") {
		return readMultipartResponse(resp, params)
	}
	return readSingleFileResponse(resp)
}

// readMultipartResponse walks resp.Body as a multipart stream and
// returns one PulledFile per part.
func readMultipartResponse(resp *http.Response, params map[string]string) ([]PulledFile, error) {
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

		filename := filenameFromPartHeaders(part.Header)
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

// readSingleFileResponse reads the full body into a single PulledFile,
// extracting a filename from Content-Disposition when present.
func readSingleFileResponse(resp *http.Response) ([]PulledFile, error) {
	filename := filenameFromHeaders(resp.Header)
	content, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}
	return []PulledFile{{
		Filename: filename,
		Content:  content,
	}}, nil
}

// filenameFromPartHeaders extracts the filename out of a multipart
// part's Content-Disposition header, returning "" when absent or
// unparseable.
func filenameFromPartHeaders(h map[string][]string) string {
	if disp := textproto(h).Get("Content-Disposition"); disp != "" {
		if _, dispParams, err := mime.ParseMediaType(disp); err == nil {
			return dispParams["filename"]
		}
	}
	return ""
}

// filenameFromHeaders is the response-level analogue of
// filenameFromPartHeaders.
func filenameFromHeaders(h http.Header) string {
	if disp := h.Get("Content-Disposition"); disp != "" {
		if _, dispParams, err := mime.ParseMediaType(disp); err == nil {
			return dispParams["filename"]
		}
	}
	return ""
}

// textproto lets us reuse http.Header's Get helper on the plain
// map[string][]string that multipart.Part.Header exposes. Avoids
// needing a separate textproto.MIMEHeader import.
func textproto(h map[string][]string) http.Header { return http.Header(h) }

// doStreamRequest executes req via streamClient and validates status
// WITHOUT reading the body (the caller owns draining). Used by the
// reader-returning APIs.
func (c *Client) doStreamRequest(req *http.Request, allowedStatus []int) (*http.Response, error) {
	resp, err := c.streamClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request to %s failed: %w", req.URL, err)
	}
	if !isStatusAllowed(resp.StatusCode, allowedStatus) {
		// Bound the error-body read so a misbehaving server cannot
		// exhaust client memory via a giant 5xx body — streamClient
		// has no top-level timeout, so the read could otherwise run
		// for an unbounded amount of time/bytes.
		bodyBytes, _ := io.ReadAll(io.LimitReader(resp.Body, errorBodyReadLimit))
		_ = resp.Body.Close()
		return nil, fmt.Errorf("API request failed with status %d. Body: %s", resp.StatusCode, bodyBytes)
	}
	return resp, nil
}

// cancelOnCloseReader ties a context.CancelFunc to a ReadCloser's
// Close so that the transfer's cancellation happens exactly when the
// caller is done reading, not earlier.
type cancelOnCloseReader struct {
	io.ReadCloser
	cancel context.CancelFunc
}

func (r *cancelOnCloseReader) Close() error {
	err := r.ReadCloser.Close()
	r.cancel()
	return err
}

// FetchStreamFilesReader issues a request and returns a live body
// reader. The caller owns Close. When ctx is nil a cancellable
// background context is substituted (no deadline — streams can be
// arbitrarily long) and its cancel is tied to the reader's Close via
// cancelOnCloseReader.
func (c *Client) FetchStreamFilesReader(ctx context.Context, opts RequestOptions) (io.ReadCloser, error) {
	var cancel context.CancelFunc
	if ctx == nil {
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

	// Caller headers first, defaults LAST — see Request() for rationale.
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	c.applyDefaultHeaders(req, "application/octet-stream")

	resp, err := c.doStreamRequest(req, opts.AllowedStatus)
	if err != nil {
		if cancel != nil {
			cancel()
		}
		return nil, err
	}

	if cancel != nil {
		return &cancelOnCloseReader{ReadCloser: resp.Body, cancel: cancel}, nil
	}
	return resp.Body, nil
}
