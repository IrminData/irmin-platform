package irmincore_test

import (
	"net/url"
	"testing"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
)

func TestClient_ValidationIntegration(t *testing.T) {
	// Create a client with validation enabled
	client := irmincore.NewClient("https://api.example.com", "fake-token", "en")

	t.Run("ValidateRequest method works", func(t *testing.T) {
		// Test valid request
		validReq := irmincore.CreateConnectionRequest{
			Name:      "Test Connection",
			Connector: "postgres",
		}

		err := client.ValidateRequest(validReq)
		if err != nil {
			t.Errorf("Expected valid request to pass validation, got error: %v", err)
		}

		// Test invalid request
		invalidReq := irmincore.CreateConnectionRequest{
			// Missing required fields
		}

		err = client.ValidateRequest(invalidReq)
		if err == nil {
			t.Error("Expected invalid request to fail validation")
		}
	})

	t.Run("ValidateVar method works", func(t *testing.T) {
		// Test valid email
		err := client.ValidateVar("test@example.com", "email")
		if err != nil {
			t.Errorf("Expected valid email to pass validation, got error: %v", err)
		}

		// Test invalid email
		err = client.ValidateVar("not-an-email", "email")
		if err == nil {
			t.Error("Expected invalid email to fail validation")
		}
	})

	t.Run("Client has validator initialized", func(t *testing.T) {
		if client.Validator == nil {
			t.Error("Expected client to have validator initialized")
		}
	})

	t.Run("SQID validation is skipped on client-side", func(t *testing.T) {
		// This should pass even with an "invalid" SQID because client-side validation skips SQID checks
		req := irmincore.TransferConnectionOwnershipRequest{
			NewOwnerID: "definitely_not_a_valid_sqid",
		}

		err := client.ValidateRequest(req)
		if err != nil {
			t.Errorf("Client-side validator should skip SQID validation, got error: %v", err)
		}
	})
}

func TestAddLimitResponseParam(t *testing.T) {
	t.Run("simple endpoint without query params", func(t *testing.T) {
		result := irmincore.AddLimitResponseParam("/api/users")
		assertURLHasParam(t, result, "limit-response", "true")
		assertPath(t, result, "/api/users")
	})

	t.Run("endpoint with existing query params", func(t *testing.T) {
		result := irmincore.AddLimitResponseParam("/api/users?name=john&age=30")
		assertURLHasParam(t, result, "limit-response", "true")
		assertURLHasParam(t, result, "name", "john")
		assertURLHasParam(t, result, "age", "30")
	})

	t.Run("endpoint with trailing separator", func(t *testing.T) {
		result := irmincore.AddLimitResponseParam("/api/users?name=john&")
		assertURLHasParam(t, result, "limit-response", "true")
		assertURLHasParam(t, result, "name", "john")
	})

	t.Run("endpoint with fragment", func(t *testing.T) {
		result := irmincore.AddLimitResponseParam("/api/users?name=john#section")
		assertURLHasParam(t, result, "limit-response", "true")
		assertURLHasParam(t, result, "name", "john")
		assertFragment(t, result, "section")
	})

	t.Run("endpoint with trailing separator and fragment", func(t *testing.T) {
		result := irmincore.AddLimitResponseParam("/api/users?name=john&#section")
		assertURLHasParam(t, result, "limit-response", "true")
		assertURLHasParam(t, result, "name", "john")
		assertFragment(t, result, "section")
	})
}

func TestAddLimitResponseParamPreservesEncoding(t *testing.T) {
	tests := []struct {
		name              string
		input             string
		expectedSubstring string
	}{
		{
			name:              "preserves unencoded special characters in ref",
			input:             "/api/objects?ref=feature/test-branch&path=file.txt",
			expectedSubstring: "ref=feature/test-branch",
		},
		{
			name:              "preserves unencoded spaces in path",
			input:             "/api/objects?ref=main&path=my folder/file.txt",
			expectedSubstring: "path=my folder/file.txt",
		},
		{
			name:              "preserves percent-encoded spaces",
			input:             "/api/objects?ref=main&path=my%20folder/file.txt",
			expectedSubstring: "path=my%20folder/file.txt",
		},
		{
			name:              "preserves plus signs",
			input:             "/api/objects?ref=main&path=data+file.csv",
			expectedSubstring: "path=data+file.csv",
		},
		{
			name:              "preserves encoded plus sign",
			input:             "/api/objects?ref=main&path=data%2Bfile.csv",
			expectedSubstring: "path=data%2Bfile.csv",
		},
		{
			name:              "preserves raw query string exactly",
			input:             "/api/objects?ref=main&path=file.txt",
			expectedSubstring: "ref=main&path=file.txt",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := irmincore.AddLimitResponseParam(tt.input)
			assertContains(t, result, tt.expectedSubstring)
			assertURLHasParam(t, result, "limit-response", "true")
		})
	}

	t.Run("preserves parameter order", func(t *testing.T) {
		original := "/api/objects?ref=main&path=file.txt&tag=v1"
		result := irmincore.AddLimitResponseParam(original)
		assertParameterOrder(t, result, []string{"ref=", "path=", "tag="})
	})

	t.Run("preserves duplicate keys", func(t *testing.T) {
		original := "/api/objects?tag=v1&tag=v2"
		result := irmincore.AddLimitResponseParam(original)
		assertDuplicateKeys(t, result)
	})
}

// Helper functions for assertions

func assertURLHasParam(t *testing.T, urlStr, key, expectedValue string) {
	t.Helper()
	u, err := url.Parse(urlStr)
	if err != nil {
		t.Fatalf("Failed to parse URL %q: %v", urlStr, err)
	}

	value := u.Query().Get(key)
	if value != expectedValue {
		t.Errorf("Expected parameter %q to be %q, got %q", key, expectedValue, value)
	}
}

func assertPath(t *testing.T, urlStr, expectedPath string) {
	t.Helper()
	u, err := url.Parse(urlStr)
	if err != nil {
		t.Fatalf("Failed to parse URL %q: %v", urlStr, err)
	}

	if u.Path != expectedPath {
		t.Errorf("Expected path %q, got %q", expectedPath, u.Path)
	}
}

func assertFragment(t *testing.T, urlStr, expectedFragment string) {
	t.Helper()
	u, err := url.Parse(urlStr)
	if err != nil {
		t.Fatalf("Failed to parse URL %q: %v", urlStr, err)
	}

	if u.Fragment != expectedFragment {
		t.Errorf("Expected fragment %q, got %q", expectedFragment, u.Fragment)
	}
}

func contains(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func indexOf(s, substr string) int {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return i
		}
	}
	return -1
}

func assertContains(t *testing.T, result, expectedSubstring string) {
	t.Helper()
	if !contains(result, expectedSubstring) {
		t.Errorf("Expected result to contain %q, got %q", expectedSubstring, result)
	}
}

func assertParameterOrder(t *testing.T, result string, params []string) {
	t.Helper()
	positions := make([]int, len(params))
	for i, param := range params {
		positions[i] = indexOf(result, param)
		if positions[i] == -1 {
			t.Fatalf("Missing parameter %q in result: %q", param, result)
		}
	}
	for i := 1; i < len(positions); i++ {
		if positions[i-1] >= positions[i] {
			t.Errorf("Expected parameter order to be preserved, got %q", result)
			break
		}
	}
}

func assertDuplicateKeys(t *testing.T, result string) {
	t.Helper()
	if !contains(result, "tag=v1&tag=v2") && !contains(result, "tag=v1&limit-response=true&tag=v2") {
		t.Errorf("Expected to preserve duplicate keys 'tag=v1&tag=v2', got %q", result)
	}
}
