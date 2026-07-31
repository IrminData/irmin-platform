package utils_test

import (
	"testing"

	"irmin-connectors/utils"
)

// TestNormalizeCoreBaseURL pins the input shapes we tolerate. The /api and
// /api/v1 cases are the ones that bit prod: a misconfigured
// IRMIN_API_BASE_URL ending in /api produced /api/api/v1/... which Core
// 404s on. The connector wrapped the 404 as "core returned 500" via the
// unhandled-error handler, so the user-visible failure looked like Core
// being broken when in fact it was a string concat issue here.
func TestNormalizeCoreBaseURL(t *testing.T) {
	cases := []struct {
		in   string
		want string
	}{
		{"http://localhost:8082", "http://localhost:8082"},
		{"http://localhost:8082/", "http://localhost:8082"},
		{"http://localhost:8082//", "http://localhost:8082"},
		{"http://localhost:8082/api", "http://localhost:8082"},
		{"http://localhost:8082/api/", "http://localhost:8082"},
		{"http://localhost:8082/api/v1", "http://localhost:8082"},
		{"http://localhost:8082/api/v1/", "http://localhost:8082"},
		{"https://irmin-development.up.railway.app/api", "https://irmin-development.up.railway.app"},
		// Genuine path-prefixed deployments should NOT be stripped — only
		// the documented /api[/v1] suffix (which is the Core path
		// prefix). A reverse-proxy-mounted Core at /irmin-core stays
		// intact.
		{"https://example.com/irmin-core", "https://example.com/irmin-core"},
		{"", ""},
	}
	for _, tc := range cases {
		t.Run(tc.in, func(t *testing.T) {
			got := utils.NormalizeCoreBaseURL(tc.in)
			if got != tc.want {
				t.Fatalf("NormalizeCoreBaseURL(%q) = %q, want %q", tc.in, got, tc.want)
			}
		})
	}
}

// TestSDKBaseURL pins the SDK-flavored URL shape: APIBaseURL is canonical
// (host only, no path) and SDKBaseURL appends the `/api` prefix the SDK's
// endpoint constants assume. Both shapes of input env value (with or
// without `/api`) must produce the same output URL after normalization.
func TestSDKBaseURL(t *testing.T) {
	cases := []struct {
		envValue string
		wantSDK  string
	}{
		{"https://api.example.com", "https://api.example.com/api"},
		{"https://api.example.com/", "https://api.example.com/api"},
		{"https://api.example.com/api", "https://api.example.com/api"},
		{"https://api.example.com/api/", "https://api.example.com/api"},
		{"https://api.example.com/api/v1", "https://api.example.com/api"},
	}
	for _, tc := range cases {
		t.Run(tc.envValue, func(t *testing.T) {
			env := &utils.ConnectorsEnv{APIBaseURL: utils.NormalizeCoreBaseURL(tc.envValue)}
			got := env.SDKBaseURL()
			if got != tc.wantSDK {
				t.Fatalf("SDKBaseURL(%q) = %q, want %q", tc.envValue, got, tc.wantSDK)
			}
		})
	}
}
