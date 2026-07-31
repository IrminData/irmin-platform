package irmincore

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	irminsdkgo "github.com/IrminData/irmin-platform/sdks/go"
	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
)

// AIAppClient is a client for the AI Application API.
// This client authenticates using an AI Application API key instead of a user token.
type AIAppClient struct {
	// BaseURL is your Irmin Core API base: e.g. "https://api.irmin.co/api"
	BaseURL string

	// APIKey is the AI Application API key (format: ai_xxx)
	APIKey string

	// HTTPClient is a customisable HTTP client. You can set timeouts, proxies, etc.
	HTTPClient *http.Client
}

// NewAIAppClient creates a new AI Application API client.
func NewAIAppClient(baseURL, apiKey string) *AIAppClient {
	return &AIAppClient{
		BaseURL: baseURL,
		APIKey:  apiKey,
		HTTPClient: &http.Client{
			Timeout: irminsdkgo.DefaultAPITimeout,
		},
	}
}

// NewAIAppClientWithHTTPClient creates a new AI Application API client with a custom HTTP client.
// If httpClient is nil, a default client with DefaultAPITimeout is used.
func NewAIAppClientWithHTTPClient(baseURL, apiKey string, httpClient *http.Client) *AIAppClient {
	if httpClient == nil {
		httpClient = &http.Client{
			Timeout: irminsdkgo.DefaultAPITimeout,
		}
	}
	return &AIAppClient{
		BaseURL:    baseURL,
		APIKey:     apiKey,
		HTTPClient: httpClient,
	}
}

// AIAppRequestOptions allows you to specify how you'd like to send data in the request.
type AIAppRequestOptions struct {
	Method      string
	Endpoint    string
	Body        any               // For JSON, this can be a struct or map to JSON-encode
	Headers     map[string]string // Extra headers, if needed
	ContentType string            // e.g. "application/json"
}

// Request sends a request to the AI Application API and returns raw response data.
func (c *AIAppClient) Request(ctx context.Context, opts AIAppRequestOptions) ([]byte, error) {
	if ctx == nil {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(context.Background(), irminsdkgo.DefaultAPITimeout)
		defer cancel()
	}

	url := fmt.Sprintf("%s%s", c.BaseURL, opts.Endpoint)

	var bodyReader io.Reader
	if opts.Body != nil {
		jsonData, err := json.Marshal(opts.Body)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal JSON body: %w", err)
		}
		bodyReader = bytes.NewReader(jsonData)
	}

	req, err := http.NewRequestWithContext(ctx, opts.Method, url, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set authorization header with API key
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.APIKey))
	req.Header.Set("Accept", "application/json")

	if opts.Body != nil {
		contentType := opts.ContentType
		if contentType == "" {
			contentType = "application/json"
		}
		req.Header.Set("Content-Type", contentType)
	}

	// Add any extra headers
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request to %s failed: %w", url, err)
	}
	defer resp.Body.Close()

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, &APIError{StatusCode: resp.StatusCode, Body: string(responseBody)}
	}

	return responseBody, nil
}

// FetchAPI sends a request and attempts to parse the response into IrminAPIResponse.
func (c *AIAppClient) FetchAPI(
	ctx context.Context,
	opts AIAppRequestOptions,
	out any,
) (*irminmodels.IrminAPIResponse, error) {
	body, err := c.Request(ctx, opts)
	if err != nil {
		return nil, err
	}

	var apiResp irminmodels.IrminAPIResponse
	if err = json.Unmarshal(body, &apiResp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response JSON: %w", err)
	}

	if len(apiResp.Errors) > 0 {
		return &apiResp, fmt.Errorf("API errors: %v", apiResp.Errors)
	}

	if out != nil && apiResp.Data != nil {
		dataBytes, marshalErr := json.Marshal(apiResp.Data)
		if marshalErr != nil {
			return nil, fmt.Errorf("failed to marshal Data field: %w", marshalErr)
		}
		if unmarshalErr := json.Unmarshal(dataBytes, out); unmarshalErr != nil {
			return nil, fmt.Errorf("failed to unmarshal Data field: %w", unmarshalErr)
		}
	}

	return &apiResp, nil
}
