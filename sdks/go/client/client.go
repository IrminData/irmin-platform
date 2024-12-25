package client

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type Client struct {
	BaseURL    string
	Token      string
	HTTPClient *http.Client
	Locale     string
}

// NewClient creates a new API client
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

// Request performs an HTTP request to the API
func (c *Client) Request(method, endpoint string, body interface{}) ([]byte, error) {
	// Construct URL
	url := fmt.Sprintf("%s%s", c.BaseURL, endpoint)

	// Convert body to JSON
	var requestBody io.Reader
	if body != nil {
		jsonData, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		requestBody = bytes.NewReader(jsonData)
	}

	// Create HTTP request
	req, err := http.NewRequest(method, url, requestBody)
	if err != nil {
		return nil, err
	}

	// Set headers
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.Token))
	req.Header.Set("Accept-Language", c.Locale)
	req.Header.Set("Content-Type", "application/json")

	// Perform the request
	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// Handle non-OK responses
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("API request failed with status %d", resp.StatusCode)
	}

	// Read response body
	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	return responseBody, nil
}
