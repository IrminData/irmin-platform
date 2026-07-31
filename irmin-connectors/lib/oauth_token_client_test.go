// Internal tests for the OAuth token client. Kept in package lib to
// exercise parseAccessTokenResponse directly; the round-trip tests spin
// up an httptest server that stands in for Core so we exercise the full
// transport + parse path without a live backend.
//
//nolint:testpackage // intentional internal test for unexported helpers
package lib

import (
	"context"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// newFakeCore stands up an httptest server whose handler inspects the
// inbound request and hands off to the test-provided responder. Returns
// the base URL to pass into NewOAuthTokenClient.
func newFakeCore(t *testing.T, h http.HandlerFunc) (string, *http.Client) {
	t.Helper()
	srv := httptest.NewServer(h)
	t.Cleanup(srv.Close)
	return srv.URL, srv.Client()
}

func TestFetchVendorAccessTokenHappyPath(t *testing.T) {
	var gotAuth, gotContentType, gotBody string
	base, httpClient := newFakeCore(t, func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
		gotContentType = r.Header.Get("Content-Type")
		b, _ := io.ReadAll(r.Body)
		gotBody = string(b)
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, `{"data":{"access_token":"at-1","token_type":"Bearer","scope":"read"}}`)
	})

	client := NewOAuthTokenClient(base, "system-token-123")
	client.HTTPClient = httpClient

	tok, err := client.FetchVendorAccessToken(context.Background(), 42)
	if err != nil {
		t.Fatalf("FetchVendorAccessToken: %v", err)
	}
	if tok.Value != "at-1" {
		t.Fatalf("access token = %q", tok.Value)
	}
	if tok.AuthorizationHeader() != "Bearer at-1" {
		t.Fatalf("AuthorizationHeader = %q", tok.AuthorizationHeader())
	}
	if gotAuth != "Bearer system-token-123" {
		t.Fatalf("Authorization header = %q", gotAuth)
	}
	if gotContentType != "application/json" {
		t.Fatalf("content-type = %q", gotContentType)
	}
	if !strings.Contains(gotBody, `"connection_id":42`) {
		t.Fatalf("body = %q, want connection_id=42", gotBody)
	}
}

func TestFetchVendorAccessToken404ToNotConnected(t *testing.T) {
	base, httpClient := newFakeCore(t, func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		_, _ = io.WriteString(w, `{"error":"not connected"}`)
	})
	client := NewOAuthTokenClient(base, "tok")
	client.HTTPClient = httpClient

	_, err := client.FetchVendorAccessToken(context.Background(), 7)
	if !errors.Is(err, ErrNotConnected) {
		t.Fatalf("expected ErrNotConnected, got %v", err)
	}
}

func TestFetchVendorAccessToken401ToRefreshRejected(t *testing.T) {
	base, httpClient := newFakeCore(t, func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
	})
	client := NewOAuthTokenClient(base, "tok")
	client.HTTPClient = httpClient

	_, err := client.FetchVendorAccessToken(context.Background(), 7)
	if !errors.Is(err, ErrRefreshRejected) {
		t.Fatalf("expected ErrRefreshRejected, got %v", err)
	}
}

func TestFetchVendorAccessToken5xxToCoreUnavailable(t *testing.T) {
	base, httpClient := newFakeCore(t, func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	})
	client := NewOAuthTokenClient(base, "tok")
	client.HTTPClient = httpClient

	_, err := client.FetchVendorAccessToken(context.Background(), 7)
	if !errors.Is(err, ErrCoreUnavailable) {
		t.Fatalf("expected ErrCoreUnavailable, got %v", err)
	}
}

func TestFetchVendorAccessTokenRejectsZeroID(t *testing.T) {
	client := NewOAuthTokenClient("https://irrelevant.invalid", "tok")
	_, err := client.FetchVendorAccessToken(context.Background(), 0)
	if !errors.Is(err, ErrMissingConnectionHeader) {
		t.Fatalf("expected ErrMissingConnectionHeader, got %v", err)
	}
}

func TestForceRefreshVendorAccessTokenSendsFlag(t *testing.T) {
	// Connectors retry on 401 by calling the force variant; on the wire,
	// that must reach Core as force_refresh:true so Core bypasses the
	// skew-window short-circuit and actually rotates the token.
	//
	// Also asserts the Authorization header carries the connector's
	// system token. Core's AuthMiddleware compares this value to its
	// own SystemToken env var to gate every /system/* endpoint; if the
	// force variant ever stopped stamping it, Core would 403 and the
	// retry loop would silently degrade to "no recovery from vendor
	// revocation."
	var (
		seenBody string
		seenAuth string
	)
	base, httpClient := newFakeCore(t, func(w http.ResponseWriter, r *http.Request) {
		seenAuth = r.Header.Get("Authorization")
		b, _ := io.ReadAll(r.Body)
		seenBody = string(b)
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, `{"data":{"access_token":"rotated","token_type":"Bearer"}}`)
	})
	client := NewOAuthTokenClient(base, "sys")
	client.HTTPClient = httpClient

	tok, err := client.ForceRefreshVendorAccessToken(context.Background(), 99)
	if err != nil {
		t.Fatalf("ForceRefreshVendorAccessToken: %v", err)
	}
	if tok.Value != "rotated" {
		t.Fatalf("token = %q, want rotated", tok.Value)
	}
	if seenAuth != "Bearer sys" {
		t.Fatalf("Authorization header = %q, want Bearer sys", seenAuth)
	}
	if !strings.Contains(seenBody, `"force_refresh":true`) {
		t.Fatalf("body missing force_refresh flag: %q", seenBody)
	}
	if !strings.Contains(seenBody, `"connection_id":99`) {
		t.Fatalf("body missing connection_id: %q", seenBody)
	}
}

func TestFetchVendorAccessTokenOmitsForceRefreshOnHappyPath(t *testing.T) {
	// The stock path must NOT send force_refresh — Core's struct uses
	// omitempty, so the absence of the field is how "no force" is
	// expressed on the wire. Belt-and-braces for anyone who later
	// refactors fetchAccessToken's payload building.
	var seenBody string
	base, httpClient := newFakeCore(t, func(w http.ResponseWriter, r *http.Request) {
		b, _ := io.ReadAll(r.Body)
		seenBody = string(b)
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, `{"data":{"access_token":"a","token_type":"Bearer"}}`)
	})
	client := NewOAuthTokenClient(base, "sys")
	client.HTTPClient = httpClient

	if _, err := client.FetchVendorAccessToken(context.Background(), 1); err != nil {
		t.Fatalf("FetchVendorAccessToken: %v", err)
	}
	if strings.Contains(seenBody, "force_refresh") {
		t.Fatalf("lazy path sent force_refresh; body = %q", seenBody)
	}
}

func TestFetchVendorAccessTokenRejectsEmptyConfig(t *testing.T) {
	client := &OAuthTokenClient{} // no base URL, no token
	_, err := client.FetchVendorAccessToken(context.Background(), 1)
	if !errors.Is(err, ErrCoreUnavailable) {
		t.Fatalf("expected ErrCoreUnavailable, got %v", err)
	}
}

func TestFetchVendorAccessTokenTrimsTrailingSlash(t *testing.T) {
	var seenPath string
	base, httpClient := newFakeCore(t, func(w http.ResponseWriter, r *http.Request) {
		seenPath = r.URL.Path
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, `{"data":{"access_token":"a","token_type":"Bearer"}}`)
	})
	client := NewOAuthTokenClient(base+"/", "tok")
	client.HTTPClient = httpClient

	_, err := client.FetchVendorAccessToken(context.Background(), 1)
	if err != nil {
		t.Fatalf("FetchVendorAccessToken: %v", err)
	}
	if seenPath != "/api/v1/system/oauth/access-token" {
		t.Fatalf("path = %q; trailing slash should have been trimmed", seenPath)
	}
}

func TestFetchVendorAccessTokenStripsAPIPrefix(t *testing.T) {
	// Regression: prod IRMIN_API_BASE_URL was set to ".../api", which
	// produced a /api/api/v1/... request that Core 404s on. The
	// normalizer should strip the trailing /api so the eventual path is
	// the canonical /api/v1/system/oauth/access-token.
	var seenPath string
	base, httpClient := newFakeCore(t, func(w http.ResponseWriter, r *http.Request) {
		seenPath = r.URL.Path
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, `{"data":{"access_token":"a","token_type":"Bearer"}}`)
	})
	client := NewOAuthTokenClient(base+"/api", "tok")
	client.HTTPClient = httpClient

	_, err := client.FetchVendorAccessToken(context.Background(), 1)
	if err != nil {
		t.Fatalf("FetchVendorAccessToken: %v", err)
	}
	if seenPath != "/api/v1/system/oauth/access-token" {
		t.Fatalf("path = %q; want canonical /api/v1/... after /api was stripped from base", seenPath)
	}
}

func TestConnectionIDFromRequestHeader(t *testing.T) {
	cases := []struct {
		name    string
		header  string
		want    uint
		wantErr bool
	}{
		{"valid", "42", 42, false},
		{"whitespace trimmed", "  42\t", 42, false},
		{"missing", "", 0, true},
		{"zero rejected", "0", 0, true},
		{"not a number", "abc", 0, true},
		{"negative", "-1", 0, true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := ConnectionIDFromRequestHeader(func(k string) string {
				if k == HeaderConnectionID {
					return tc.header
				}
				return ""
			})
			if tc.wantErr && err == nil {
				t.Fatalf("expected error, got %d", got)
			}
			if !tc.wantErr && err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tc.want {
				t.Fatalf("got %d, want %d", got, tc.want)
			}
		})
	}
}

func TestVendorAccessTokenAuthorizationHeaderDefaultsBearer(t *testing.T) {
	t1 := &VendorAccessToken{Value: "x"}
	if got := t1.AuthorizationHeader(); got != "Bearer x" {
		t.Fatalf("empty token_type should default to Bearer, got %q", got)
	}
	t2 := &VendorAccessToken{Value: "y", TokenType: "MAC"}
	if got := t2.AuthorizationHeader(); got != "MAC y" {
		t.Fatalf("explicit non-bearer token_type should win, got %q", got)
	}
}

// TestVendorAccessTokenAuthorizationHeaderCanonicalisesBearer pins a
// real-world bug: Linear's /token endpoint returns
// `token_type: "bearer"` (lowercase, exactly as in RFC 6749 §5.1's
// example). Linear's MCP resource server then rejects
// `Authorization: bearer …` with `invalid_token: Missing or invalid
// access token`. RFC 6750 §2.1 specifies the literal "Bearer" with a
// capital B in its ABNF and §1.2 says parsing should be case-
// insensitive, but real-world resource servers vary. Canonicalising
// to "Bearer" on the way out keeps us interoperable with both strict
// and lenient implementations.
func TestVendorAccessTokenAuthorizationHeaderCanonicalisesBearer(t *testing.T) {
	cases := []struct {
		name string
		in   string
	}{
		{"lowercase", "bearer"},
		{"mixed", "BeArEr"},
		{"upper", "BEARER"},
		{"already canonical", "Bearer"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			tok := &VendorAccessToken{Value: "x", TokenType: tc.in}
			if got := tok.AuthorizationHeader(); got != "Bearer x" {
				t.Errorf("token_type=%q → %q, want %q", tc.in, got, "Bearer x")
			}
		})
	}
}

func TestHeaderConnectionIDIsStable(t *testing.T) {
	// Wire contract with irmin/connectors-client/client.go — renaming
	// either side would silently break every OAuth-backed connector.
	if HeaderConnectionID != "X-Irmin-Connection-Id" {
		t.Fatalf("HeaderConnectionID = %q; changing this breaks the cross-service wire contract", HeaderConnectionID)
	}
}

func TestFetchVendorAccessTokenAcceptsLargeJWT(t *testing.T) {
	// Real-world OAuth tokens are large: Google ID tokens trend 2–4 KB,
	// Azure AD access tokens can reach 4–8 KB. The old 2 KB body cap
	// would truncate these mid-JSON and fail parsing, leaving the
	// connector unable to authenticate despite Core returning a valid
	// token. Guard here so a well-meaning tightening of bodyReadLimit
	// never re-breaks this.
	const jwtLen = 6000
	largeJWT := strings.Repeat("A", jwtLen)
	base, httpClient := newFakeCore(t, func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, `{"data":{"access_token":"`+largeJWT+`","token_type":"Bearer","scope":"read"}}`)
	})
	client := NewOAuthTokenClient(base, "sys")
	client.HTTPClient = httpClient

	tok, err := client.FetchVendorAccessToken(context.Background(), 1)
	if err != nil {
		t.Fatalf("FetchVendorAccessToken with %d-byte JWT: %v", jwtLen, err)
	}
	if len(tok.Value) != jwtLen {
		t.Fatalf("token truncated: got %d bytes, want %d", len(tok.Value), jwtLen)
	}
}
