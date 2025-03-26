package lakefs

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"irmin-api/utils"
	"log"
	"net/http"
	"slices"
	"strings"
)

// Pagination contains information about the list results.
type Pagination struct {
	HasMore    bool   `json:"has_more"`     // Next page is available
	NextOffset string `json:"next_offset"`  // Token used to retrieve the next page
	Results    int    `json:"results"`      // Number of values found in the results
	MaxPerPage int    `json:"max_per_page"` // Maximum number of results per page
}

// Client is a client for interacting with the LakeFS API.
// It encapsulates the base URL (read from the environment) and the auth token.
type Client struct {
	baseURL string
	token   string
	client  *http.Client
}

// NewClient creates a new LakeFS Client.
func NewClient(baseURL string) (*Client, error) {
	if baseURL == "" {
		return nil, errors.New("base URL is required")
	}

	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		client:  &http.Client{},
	}, nil
}

// doRequest is a helper method to make HTTP requests to LakeFS REST API endpoints.
// It marshals the payload, sets the required headers (including Authorization),
// checks that the response status is one of allowedStatus, and decodes the result.
func (c *Client) doRequest(method, endpoint string, payload any, allowedStatus []int, result any) error {
	var body io.Reader
	if payload != nil {
		data, err := json.Marshal(payload)
		if err != nil {
			return fmt.Errorf("failed to marshal payload: %w", err)
		}
		body = bytes.NewReader(data)
	}

	// Build the full URL.
	url := c.baseURL + endpoint

	req, err := http.NewRequest(method, url, body)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	if c.token != "" {
		req.Header.Set("Authorization", "Bearer "+c.token)
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	// Verify that the response status code is acceptable.
	allowed := slices.Contains(allowedStatus, resp.StatusCode)

	if !allowed {
		// Read the entire response body.
		bodyBytes, err := io.ReadAll(resp.Body)
		if err != nil {
			return fmt.Errorf("failed to read error response: %w", err)
		}

		// Attempt to unmarshal the JSON error message.
		var errResp struct {
			Message string `json:"message"`
		}
		if err := json.Unmarshal(bodyBytes, &errResp); err == nil && errResp.Message != "" {
			return fmt.Errorf("request to %s failed with status %d: %s", endpoint, resp.StatusCode, errResp.Message)
		}

		// Fallback to returning the raw response body.
		return fmt.Errorf("request to %s failed with status %d: %s", endpoint, resp.StatusCode, string(bodyBytes))
	}

	// Decode the response if a result interface is provided.
	if result != nil {
		if err := json.NewDecoder(resp.Body).Decode(result); err != nil {
			return fmt.Errorf("failed to decode response: %w", err)
		}
	}

	return nil
}

// doStreamRequest is a helper method to make HTTP requests for endpoints that return streaming responses,
// such as octet-streams. It is similar to doRequest, but instead of decoding a JSON response into a result,
// it returns the raw *http.Response. It also sets required headers (including authorisation) and disables
// automatic following of redirects so that a 302 response is preserved.
func (c *Client) doStreamRequest(method, endpoint string, payload any, allowedStatus []int, acceptHeader string) (*http.Response, error) {
	var body io.Reader
	if payload != nil {
		data, err := json.Marshal(payload)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal payload: %w", err)
		}
		body = bytes.NewReader(data)
	}

	// Build the full URL.
	fullURL := c.baseURL + endpoint

	req, err := http.NewRequest(method, fullURL, body)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	if payload != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	req.Header.Set("Accept", acceptHeader)
	// Set the authorisation header.
	if c.token != "" {
		req.Header.Set("Authorization", "Bearer "+c.token)
	}

	// Use a temporary client that does not follow redirects.
	tempClient := *c.client
	tempClient.CheckRedirect = func(req *http.Request, via []*http.Request) error {
		return http.ErrUseLastResponse
	}

	resp, err := tempClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}

	// Verify that the response status code is acceptable.
	allowed := slices.Contains(allowedStatus, resp.StatusCode)
	if !allowed {
		bodyBytes, readErr := io.ReadAll(resp.Body)
		resp.Body.Close()
		if readErr != nil {
			return nil, fmt.Errorf("failed to read error response: %w", readErr)
		}
		return nil, fmt.Errorf("request to %s failed with status %d: %s", fullURL, resp.StatusCode, string(bodyBytes))
	}

	return resp, nil
}

// doMultipartRequest is a helper method for endpoints that require a multipart form payload.
// It builds the full URL, sets the provided content type header (which should include the multipart boundary),
// applies the required authorisation header, checks that the response status is acceptable,
// and decodes the JSON response into result if provided.
func (c *Client) doMultipartRequest(method, endpoint string, body io.Reader, contentType string, allowedStatus []int, result any) error {
	fullURL := c.baseURL + endpoint
	req, err := http.NewRequest(method, fullURL, body)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", contentType)
	if c.token != "" {
		req.Header.Set("Authorization", "Bearer "+c.token)
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	allowed := false
	for _, status := range allowedStatus {
		if resp.StatusCode == status {
			allowed = true
			break
		}
	}
	if !allowed {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("request to %s failed with status %d: %s", endpoint, resp.StatusCode, string(bodyBytes))
	}

	if result != nil {
		if err := json.NewDecoder(resp.Body).Decode(result); err != nil {
			return fmt.Errorf("failed to decode response: %w", err)
		}
	}
	return nil
}

// CreateClient creates a new LakeFS client and logs in with the provided credentials from the environment.
func CreateClient() (*Client, error) {
	// Load environment variables
	env, err := utils.LoadEnv()
	if err != nil {
		log.Fatalf("Failed to load environment variables: %v", err)
	}

	// Create the client.
	client, err := NewClient(fmt.Sprintf("%s/api/v1", env.LakeFSURL))
	if err != nil {
		log.Printf("Error creating LakeFS client: %v", err)
		return nil, err
	}

	// Log in (credentials can also be obtained from env or configuration).
	if err := client.Login(env.LakeFSAccessKey, env.LakeFSSecretKey); err != nil {
		log.Printf("LakeFS login error: %v", err)
		return nil, err
	}

	return client, nil

}
