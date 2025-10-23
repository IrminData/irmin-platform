package client_test

import (
	"irmin-connectors/connectors/http/client"
	"testing"
)

func TestWithPath(t *testing.T) {
	tests := []struct {
		name        string
		originalURL string
		newPath     string
		expectedURL string
	}{
		{
			name:        "absolute path replaces existing path",
			originalURL: "https://api.example.com/v1/users",
			newPath:     "/v2/customers",
			expectedURL: "https://api.example.com/v2/customers",
		},
		{
			name:        "relative path appends to existing path",
			originalURL: "https://api.example.com/v1",
			newPath:     "users",
			expectedURL: "https://api.example.com/v1/users",
		},
		{
			name:        "relative path appends with trailing slash handled",
			originalURL: "https://api.example.com/v1/",
			newPath:     "users",
			expectedURL: "https://api.example.com/v1/users",
		},
		{
			name:        "absolute path with query params preserved",
			originalURL: "https://api.example.com/v1/users?page=1",
			newPath:     "/v2/customers",
			expectedURL: "https://api.example.com/v2/customers?page=1",
		},
		{
			name:        "path with special characters",
			originalURL: "https://api.example.com/v1",
			newPath:     "/users/123/profile",
			expectedURL: "https://api.example.com/users/123/profile",
		},
		{
			name:        "empty path keeps URL unchanged but returns new client",
			originalURL: "https://api.example.com/v1/users",
			newPath:     "",
			expectedURL: "https://api.example.com/v1/users",
		},
		{
			name:        "path with port preserved",
			originalURL: "https://api.example.com:8080/v1/users",
			newPath:     "/v2/customers",
			expectedURL: "https://api.example.com:8080/v2/customers",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			original := &client.HTTPClient{
				URL:                 tt.originalURL,
				Method:              "GET",
				Headers:             make(map[string]string),
				AcceptedStatusCodes: []int{200},
			}

			result := original.WithPath(tt.newPath)

			// Verify the URL was changed correctly
			if result.URL != tt.expectedURL {
				t.Errorf("Expected URL %s, got %s", tt.expectedURL, result.URL)
			}

			// Verify original client was not modified
			if original.URL != tt.originalURL {
				t.Errorf("Original URL was modified, expected %s, got %s", tt.originalURL, original.URL)
			}

			// Verify other fields were copied
			if result.Method != original.Method {
				t.Errorf("Method was not copied correctly, expected %s, got %s", original.Method, result.Method)
			}

			if len(result.AcceptedStatusCodes) != len(original.AcceptedStatusCodes) {
				t.Errorf("AcceptedStatusCodes length mismatch, expected %d, got %d",
					len(original.AcceptedStatusCodes), len(result.AcceptedStatusCodes))
			}
		})
	}
}

func TestWithPathInvalidURL(t *testing.T) {
	// Test that invalid URLs return the original client
	original := &client.HTTPClient{
		URL:    "://invalid-url",
		Method: "GET",
	}

	result := original.WithPath("/new/path")

	// Should return the same client when URL parsing fails
	if result != original {
		t.Error("Expected to return original client for invalid URL")
	}
}

func TestWithPathDeepCopy(t *testing.T) {
	// Test that WithPath creates a deep copy and doesn't share mutable state
	original := &client.HTTPClient{
		URL:                 "https://api.example.com/v1/users",
		Method:              "POST",
		Headers:             map[string]string{"Authorization": "Bearer token", "Content-Type": "application/json"},
		Body:                []byte(`{"key":"value"}`),
		Timeout:             30,
		VerifySSL:           true,
		AcceptedStatusCodes: []int{200, 201, 202},
	}

	result := original.WithPath("/v2/customers")

	// Modify the returned client's mutable fields
	result.Headers["X-Custom-Header"] = "test"
	result.Headers["Authorization"] = "Bearer modified"
	result.AcceptedStatusCodes[0] = 999
	if result.Body != nil {
		result.Body[0] = 'X'
	}

	// Verify original client's mutable fields are unchanged
	if _, exists := original.Headers["X-Custom-Header"]; exists {
		t.Error("Original client's Headers map was modified")
	}

	if original.Headers["Authorization"] != "Bearer token" {
		t.Error("Original client's Headers map value was modified")
	}

	if len(original.Headers) != 2 {
		t.Errorf("Original client's Headers map size changed, expected 2, got %d", len(original.Headers))
	}

	if original.AcceptedStatusCodes[0] != 200 {
		t.Errorf(
			"Original client's AcceptedStatusCodes was modified, expected 200, got %d",
			original.AcceptedStatusCodes[0],
		)
	}

	if original.Body[0] != '{' {
		t.Errorf("Original client's Body was modified, expected '{', got %c", original.Body[0])
	}

	// Verify the result has the correct values
	if result.Headers["X-Custom-Header"] != "test" {
		t.Error("Result client's Headers was not modified as expected")
	}

	if result.AcceptedStatusCodes[0] != 999 {
		t.Error("Result client's AcceptedStatusCodes was not modified as expected")
	}

	if result.Body[0] != 'X' {
		t.Error("Result client's Body was not modified as expected")
	}
}

func TestWithPathNilBody(t *testing.T) {
	// Test that WithPath handles nil Body correctly
	original := &client.HTTPClient{
		URL:                 "https://api.example.com/v1/users",
		Method:              "GET",
		Headers:             map[string]string{"Authorization": "Bearer token"},
		Body:                nil,
		AcceptedStatusCodes: []int{200},
	}

	result := original.WithPath("/v2/customers")

	if result.Body != nil {
		t.Error("Expected nil Body to remain nil")
	}
}

func TestWithPathEmptyCollections(t *testing.T) {
	// Test that WithPath handles empty maps and slices correctly
	original := &client.HTTPClient{
		URL:                 "https://api.example.com/v1/users",
		Method:              "GET",
		Headers:             map[string]string{},
		Body:                []byte{},
		AcceptedStatusCodes: []int{},
	}

	result := original.WithPath("/v2/customers")

	// Add to result's collections
	result.Headers["New-Header"] = "value"
	result.AcceptedStatusCodes = append(result.AcceptedStatusCodes, 200)

	// Verify original remains empty
	if len(original.Headers) != 0 {
		t.Error("Original Headers should remain empty")
	}

	if len(original.AcceptedStatusCodes) != 0 {
		t.Error("Original AcceptedStatusCodes should remain empty")
	}
}

func TestWithPathEmptyString(t *testing.T) {
	// Test that WithPath with empty string still returns a new independent client
	original := &client.HTTPClient{
		URL:                 "https://api.example.com/v1/users",
		Method:              "GET",
		Headers:             map[string]string{"Authorization": "Bearer token"},
		Body:                []byte(`{"key":"value"}`),
		AcceptedStatusCodes: []int{200, 201},
	}

	result := original.WithPath("")

	// Verify URL is unchanged
	if result.URL != original.URL {
		t.Errorf("Expected URL to remain unchanged, got %s", result.URL)
	}

	// Verify we got a different instance
	if result == original {
		t.Error("Expected a new client instance, got the same instance")
	}

	// Modify the returned client's mutable fields
	result.Headers["X-New-Header"] = "test"
	result.AcceptedStatusCodes[0] = 999
	result.Body[0] = 'X'

	// Verify original client's mutable fields are unchanged
	if _, exists := original.Headers["X-New-Header"]; exists {
		t.Error("Original client's Headers map was modified")
	}

	if original.AcceptedStatusCodes[0] != 200 {
		t.Errorf(
			"Original client's AcceptedStatusCodes was modified, expected 200, got %d",
			original.AcceptedStatusCodes[0],
		)
	}

	if original.Body[0] != '{' {
		t.Errorf("Original client's Body was modified, expected '{', got %c", original.Body[0])
	}
}
