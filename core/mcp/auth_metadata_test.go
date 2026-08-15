package mcp_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"irmin-api/mcp"
)

func TestExtractRequestMetadataTrustsForwardedHeadersOnlyFromConfiguredProxies(t *testing.T) {
	t.Parallel()

	untrusted := httptest.NewRequest(http.MethodPost, "http://core.test/mcp", nil)
	untrusted.RemoteAddr = "203.0.113.10:4321"
	untrusted.Header.Set("X-Forwarded-For", "198.51.100.7")
	if got := mcp.ExtractRequestMetadata(untrusted, "10.0.0.0/8").IP; got != "203.0.113.10" {
		t.Fatalf("untrusted forwarded IP = %q", got)
	}

	trusted := httptest.NewRequest(http.MethodPost, "http://core.test/mcp", nil)
	trusted.RemoteAddr = "10.1.2.3:4321"
	trusted.Header.Set("X-Forwarded-For", "198.51.100.7, 10.1.2.3")
	if got := mcp.ExtractRequestMetadata(trusted, "10.0.0.0/8").IP; got != "198.51.100.7" {
		t.Fatalf("trusted forwarded IP = %q", got)
	}
}
