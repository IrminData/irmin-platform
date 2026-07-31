package connectorsclient

// This is a vendored copy of the connectors client from irmin/connectors-client
// to keep the e2e-tests self-contained and avoid cross-module dependencies.

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
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

const DefaultConnectorTimeout = 30 * time.Second

// Client represents the Connector API client.
type Client struct {
	BaseURL    string
	Token      string
	HTTPClient *http.Client
}

// NewClient creates a new Connector API client with default settings.
// Connector responses are English-only — there is no Accept-Language
// negotiation.
func NewClient(baseURL, token string) *Client {
	return &Client{
		BaseURL: baseURL,
		Token:   token,
		HTTPClient: &http.Client{
			Timeout: DefaultConnectorTimeout,
		},
	}
}

// RequestOptions allows you to specify how you'd like to send data in the request.
type RequestOptions struct {
	Method        string
	Endpoint      string
	AllowedStatus []int
	Body          any
	FormFields    map[string]string
	Files         []FormFile
	Headers       map[string]string
	ContentType   string
}

// FormFile holds information about a file you want to upload with multipart/form-data.
type FormFile struct {
	FieldName string
	FilePath  string
	Reader    io.Reader
	FileName  string
}

// PulledFile represents a file returned with a stream request.
type PulledFile struct {
	Filename string
	Content  []byte
}

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
		if opts.Body != nil {
			jsonData, marshalErr := json.Marshal(opts.Body)
			if marshalErr != nil {
				return nil, nil, fmt.Errorf("failed to marshal JSON body: %w", marshalErr)
			}
			bodyReader = bytes.NewReader(jsonData)
		} else {
			bodyReader = bytes.NewReader(nil)
		}
		headers["Content-Type"] = "application/json"
	case "multipart/form-data":
		bodyReader, err = c.prepareMultipartBody(opts.FormFields, opts.Files, headers)
	case "application/x-www-form-urlencoded":
		bodyReader = c.prepareURLEncodedBody(opts.FormFields)
		headers["Content-Type"] = "application/x-www-form-urlencoded"
	default:
		bodyReader = bytes.NewReader(nil)
	}

	if err != nil {
		return nil, nil, err
	}

	return bodyReader, headers, nil
}

func (c *Client) prepareMultipartBody(
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
		if err := c.writeFormFile(writer, file); err != nil {
			return nil, err
		}
	}

	if err := writer.Close(); err != nil {
		return nil, fmt.Errorf("failed to close multipart writer: %w", err)
	}

	headers["Content-Type"] = writer.FormDataContentType()
	return &b, nil
}

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

func (c *Client) prepareURLEncodedBody(formFields map[string]string) io.Reader {
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
	return bytes.NewReader(buf.Bytes())
}

func (c *Client) doRequest(req *http.Request, allowedStatus []int) (*http.Response, error) {
	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request to %s failed: %w", req.URL, err)
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	closeErr := resp.Body.Close()
	if closeErr != nil {
		return nil, fmt.Errorf("failed to close response body: %w", closeErr)
	}

	// Check if status code is allowed
	const (
		minSuccessStatus = 200
		maxSuccessStatus = 300
	)

	var isAllowed bool
	if len(allowedStatus) == 0 {
		// No specific codes provided - accept any 2xx status
		isAllowed = resp.StatusCode >= minSuccessStatus && resp.StatusCode < maxSuccessStatus
	} else {
		// Specific codes provided - check if status is in the list
		isAllowed = slices.Contains(allowedStatus, resp.StatusCode)
	}

	if !isAllowed {
		return nil, fmt.Errorf("API request failed with status %d. Body: %s", resp.StatusCode, bodyBytes)
	}

	resp.Body = io.NopCloser(bytes.NewReader(bodyBytes))
	return resp, nil
}

// Request sends requests to the REST API of the connector and returns the raw response data.
func (c *Client) Request(ctx context.Context, opts RequestOptions) ([]byte, error) {
	if ctx == nil {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(context.Background(), DefaultConnectorTimeout)
		defer cancel()
	}

	url := fmt.Sprintf("%s%s", c.BaseURL, opts.Endpoint)
	bodyReader, headers, err := c.prepareBodyAndHeaders(opts)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, opts.Method, url, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.Token))
	req.Header.Set("Accept", "application/json")

	for k, v := range headers {
		req.Header.Set(k, v)
	}

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

// FetchAPI sends a request and attempts to parse the JSON response into a struct if provided.
func (c *Client) FetchAPI(ctx context.Context, opts RequestOptions, out any) error {
	body, err := c.Request(ctx, opts)
	if err != nil {
		return err
	}

	if out != nil && len(body) > 0 {
		err = json.Unmarshal(body, out)
		if err != nil {
			return fmt.Errorf("failed to unmarshal response: %w", err)
		}
	}

	return nil
}

// FetchStreamFiles sends a request and returns a slice of PulledFile.
func (c *Client) FetchStreamFiles(ctx context.Context, opts RequestOptions) ([]PulledFile, error) {
	if ctx == nil {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(context.Background(), DefaultConnectorTimeout)
		defer cancel()
	}

	url := fmt.Sprintf("%s%s", c.BaseURL, opts.Endpoint)
	bodyReader, headers, err := c.prepareBodyAndHeaders(opts)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, opts.Method, url, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.Token))
	if _, exists := headers["Accept"]; !exists {
		req.Header.Set("Accept", "application/octet-stream")
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}

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
		return c.handleMultipartResponse(resp, params)
	}
	return c.handleSingleFileResponse(resp)
}

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

func extractFilenameFromPart(part *multipart.Part) string {
	if disp := part.Header.Get("Content-Disposition"); disp != "" {
		_, dispParams, err := mime.ParseMediaType(disp)
		if err == nil {
			return dispParams["filename"]
		}
	}
	return ""
}

func extractFilenameFromResponse(resp *http.Response) string {
	if disp := resp.Header.Get("Content-Disposition"); disp != "" {
		_, dispParams, err := mime.ParseMediaType(disp)
		if err == nil {
			return dispParams["filename"]
		}
	}
	return ""
}

// GetInfo fetches the connector's information from the /info endpoint.
func (c *Client) GetInfo(ctx context.Context) (*ConnectorInfo, error) {
	var info ConnectorInfo
	if err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: "/info",
	}, &info); err != nil {
		return nil, err
	}
	return &info, nil
}

// GetConfigFields retrieves configuration fields from the connector.
func (c *Client) GetConfigFields(
	ctx context.Context,
	configurationType string,
	details, settings map[string]string,
) (map[string]irminmodels.DynamicField, error) {
	formFields := make(map[string]string)
	for key, value := range details {
		formFields[fmt.Sprintf("details[%s]", key)] = value
	}
	for key, value := range settings {
		formFields[fmt.Sprintf("settings[%s]", key)] = value
	}

	var fields map[string]irminmodels.DynamicField
	if err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/configuration/%s/fields", configurationType),
		FormFields:  formFields,
		ContentType: "application/x-www-form-urlencoded",
	}, &fields); err != nil {
		return nil, err
	}

	return fields, nil
}

// ValidateConfigFields validates configuration details and settings.
func (c *Client) ValidateConfigFields(
	ctx context.Context,
	details, settings map[string]string,
) (*irminmodels.ConnectorConfigurationValidationResult, error) {
	formFields := make(map[string]string)
	for key, value := range details {
		formFields[fmt.Sprintf("details[%s]", key)] = value
	}
	for key, value := range settings {
		formFields[fmt.Sprintf("settings[%s]", key)] = value
	}

	var result irminmodels.ConnectorConfigurationValidationResult
	if err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/configuration/validate",
		FormFields:  formFields,
		ContentType: "application/x-www-form-urlencoded",
	}, &result); err != nil {
		return &result, err
	}

	return &result, nil
}

// InitOperation creates a new operation with the connector.
func (c *Client) InitOperation(ctx context.Context, details, settings map[string]string) (*Operation, error) {
	formFields := make(map[string]string)
	for key, value := range details {
		formFields[fmt.Sprintf("details[%s]", key)] = value
	}
	for key, value := range settings {
		formFields[fmt.Sprintf("settings[%s]", key)] = value
	}

	var operation Operation
	if err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/operation/init",
		FormFields:  formFields,
		ContentType: "application/x-www-form-urlencoded",
	}, &operation); err != nil {
		return nil, err
	}

	return &operation, nil
}

// GetSchema retrieves the schema for a specific operation method.
func (c *Client) GetSchema(ctx context.Context, method, path string) (*irminmodels.ObjectSchema, error) {
	encodedPath := url.QueryEscape(path)

	var schema irminmodels.ObjectSchema
	if err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodPost,
		Endpoint: fmt.Sprintf("/operation/schema/%s?path=%s", method, encodedPath),
	}, &schema); err != nil {
		return nil, err
	}
	return &schema, nil
}

// OperationPull sends a file pull request.
func (c *Client) OperationPull(ctx context.Context, path string) ([]PulledFile, error) {
	opts := RequestOptions{
		Method:   http.MethodPost,
		Endpoint: "/operation/pull",
		FormFields: map[string]string{
			"path": path,
		},
		ContentType: "application/x-www-form-urlencoded",
	}

	return c.FetchStreamFiles(ctx, opts)
}

// OperationPush sends a file to the /operation/push endpoint.
func (c *Client) OperationPush(ctx context.Context, path string, file FormFile) (string, error) {
	file.FieldName = "file"
	opts := RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/operation/push",
		ContentType: "multipart/form-data",
		FormFields: map[string]string{
			"path": path,
		},
		Files: []FormFile{file},
	}

	data, err := c.Request(ctx, opts)
	if err != nil {
		return "", err
	}

	return string(data), nil
}

// OperationPatch sends a patch file to apply JSON patch operations.
func (c *Client) OperationPatch(ctx context.Context, patchFile FormFile) (string, error) {
	patchFile.FieldName = "patches"
	opts := RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/operation/patch",
		ContentType: "multipart/form-data",
		Files:       []FormFile{patchFile},
	}

	data, err := c.Request(ctx, opts)
	if err != nil {
		return "", err
	}

	return string(data), nil
}

// SubscribeToChanges subscribes to changes in the data.
func (c *Client) SubscribeToChanges(ctx context.Context, webhook, webhookAccessToken string) (*Subscription, error) {
	var subscription Subscription
	if err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodPost,
		Endpoint: "/operation/subscribe",
		FormFields: map[string]string{
			"webhook":              webhook,
			"webhook_access_token": webhookAccessToken,
		},
		ContentType: "application/x-www-form-urlencoded",
	}, &subscription); err != nil {
		return nil, err
	}
	return &subscription, nil
}
