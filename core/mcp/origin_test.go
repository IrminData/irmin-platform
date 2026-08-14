package mcp_test

import (
	"testing"

	"irmin-api/mcp"
)

// These tests protect MCP browser clients from DNS-rebinding attacks while
// preserving authenticated server-to-server clients that do not send Origin.
func TestOriginAllowed(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		origin  string
		allowed []string
		want    bool
	}{
		{name: "machine client", origin: "", allowed: nil, want: true},
		{
			name:    "exact match",
			origin:  "https://app.example.com",
			allowed: []string{"https://app.example.com"},
			want:    true,
		},
		{name: "empty allowlist", origin: "https://app.example.com", allowed: nil, want: false},
		{
			name:    "subdomain mismatch",
			origin:  "https://evil.app.example.com",
			allowed: []string{"https://app.example.com"},
			want:    false,
		},
		{
			name:    "scheme mismatch",
			origin:  "http://app.example.com",
			allowed: []string{"https://app.example.com"},
			want:    false,
		},
		{
			name:    "wildcard is not special",
			origin:  "https://app.example.com",
			allowed: []string{"*"},
			want:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if got := mcp.OriginAllowed(tt.origin, tt.allowed); got != tt.want {
				t.Fatalf("OriginAllowed(%q, %v) = %v, want %v", tt.origin, tt.allowed, got, tt.want)
			}
		})
	}
}
