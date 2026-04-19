// Internal test file — the pure helpers under test (buildAuthURL,
// buildTokenRow, needsRefresh, classifyRefreshError, postToken,
// asciiSnippet) are deliberately unexported. Exposing them to satisfy
// testpackage would widen the public API for no runtime benefit.
//
//nolint:testpackage // intentional internal test for unexported helpers
package oauth

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"irmin-api/db"
)

func TestBuildAuthURLIncludesRequiredParams(t *testing.T) {
	cfg := &Config{
		Provider:         "hubspot",
		AuthorizationURL: "https://vendor.example/oauth/authorize",
		TokenURL:         "https://vendor.example/oauth/token",
		Scopes:           []string{"read.contacts", "read.deals"},
		PKCE:             true,
		ExtraParams: map[string]string{
			"prompt":      "consent",
			"access_type": "offline",
		},
	}
	client := &db.ConnectionOAuthClient{ClientID: "public-id-123"}
	got := buildAuthURL(cfg, client, "STATE_VAL", "CHALLENGE_VAL", "https://api.irmin.dev/cb")

	parsed, err := url.Parse(got)
	if err != nil {
		t.Fatalf("parse auth URL: %v", err)
	}
	if parsed.Scheme+"://"+parsed.Host+parsed.Path != cfg.AuthorizationURL {
		t.Fatalf("base URL drifted: %s", parsed.Scheme+"://"+parsed.Host+parsed.Path)
	}
	q := parsed.Query()
	check := map[string]string{
		"response_type":         "code",
		"client_id":             "public-id-123",
		"redirect_uri":          "https://api.irmin.dev/cb",
		"state":                 "STATE_VAL",
		"code_challenge":        "CHALLENGE_VAL",
		"code_challenge_method": "S256",
		"scope":                 "read.contacts read.deals",
		"prompt":                "consent",
		"access_type":           "offline",
	}
	for k, want := range check {
		if have := q.Get(k); have != want {
			t.Errorf("query %s = %q, want %q", k, have, want)
		}
	}
}

func TestBuildAuthURLExtraParamsCantOverrideSecurity(t *testing.T) {
	cfg := &Config{
		AuthorizationURL: "https://vendor.example/authorize",
		PKCE:             true,
		ExtraParams: map[string]string{
			// Attempt to downgrade PKCE method via ExtraParams — must be ignored.
			"code_challenge_method": "plain",
			"state":                 "attacker-supplied",
			"response_type":         "token",
		},
	}
	raw := buildAuthURL(
		cfg,
		&db.ConnectionOAuthClient{ClientID: "x"},
		"REAL_STATE",
		"CHALLENGE",
		"https://cb",
	)
	parsed, _ := url.Parse(raw)
	q := parsed.Query()
	if q.Get("code_challenge_method") != "S256" {
		t.Fatalf("ExtraParams overrode code_challenge_method: %q", q.Get("code_challenge_method"))
	}
	if q.Get("state") != "REAL_STATE" {
		t.Fatalf("ExtraParams overrode state: %q", q.Get("state"))
	}
	if q.Get("response_type") != "code" {
		t.Fatalf("ExtraParams overrode response_type: %q", q.Get("response_type"))
	}
}

func TestBuildAuthURLHandlesPreExistingQueryString(t *testing.T) {
	cfg := &Config{
		AuthorizationURL: "https://vendor.example/authorize?tenant=acme",
		PKCE:             true,
	}
	got := buildAuthURL(cfg, &db.ConnectionOAuthClient{ClientID: "x"}, "S", "C", "https://cb")
	parsed, err := url.Parse(got)
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	q := parsed.Query()
	if q.Get("tenant") != "acme" {
		t.Fatalf("pre-existing query param lost: %q", got)
	}
	if q.Get("state") != "S" {
		t.Fatalf("state not appended: %q", got)
	}
}

type fakeClock struct{ t time.Time }

func (f fakeClock) Now() time.Time { return f.t }

func newTestService(t *testing.T, client *http.Client) *Service {
	t.Helper()
	return &Service{
		httpClient:  client,
		logger:      slog.New(slog.NewTextHandler(io.Discard, nil)),
		clock:       fakeClock{t: time.Date(2026, 4, 18, 12, 0, 0, 0, time.UTC)},
		RedirectURI: "https://api.irmin.dev/cb",
		SessionTTL:  10 * time.Minute,
		RefreshSkew: 60 * time.Second,
	}
}

func TestNeedsRefresh(t *testing.T) {
	s := newTestService(t, http.DefaultClient)
	now := s.clock.Now()
	cases := []struct {
		name    string
		expires *time.Time
		want    bool
	}{
		{"nil expiry (non-expiring)", nil, false},
		{"expired 1h ago", ptr(now.Add(-time.Hour)), true},
		{"expires right now", ptr(now), true},
		{"expires in 30s (inside skew)", ptr(now.Add(30 * time.Second)), true},
		{"expires in exactly skew", ptr(now.Add(60 * time.Second)), true},
		{"expires in 2m (outside skew)", ptr(now.Add(2 * time.Minute)), false},
		{"expires in 1h", ptr(now.Add(time.Hour)), false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			token := &db.ConnectionOAuthToken{ExpiresAt: tc.expires}
			if got := s.needsRefresh(token); got != tc.want {
				t.Fatalf("needsRefresh = %v, want %v", got, tc.want)
			}
		})
	}
}

func TestBuildTokenRow(t *testing.T) {
	now := time.Date(2026, 4, 18, 12, 0, 0, 0, time.UTC)
	resp := &tokenResponse{
		AccessToken:  "at-123",
		TokenType:    "Bearer",
		ExpiresIn:    3600,
		RefreshToken: "rt-xyz",
		Scope:        "read.a read.b",
	}
	row := buildTokenRow(42, resp, now, false)
	if row.ConnectionID != 42 {
		t.Fatalf("ConnectionID = %d, want 42", row.ConnectionID)
	}
	if row.Secrets[db.ConnectionOAuthSecretKeyAccessToken] != "at-123" {
		t.Fatalf("access token missing")
	}
	if row.Secrets[db.ConnectionOAuthSecretKeyRefreshToken] != "rt-xyz" {
		t.Fatalf("refresh token missing")
	}
	if row.ExpiresAt == nil || !row.ExpiresAt.Equal(now.Add(time.Hour)) {
		t.Fatalf("ExpiresAt wrong: %v", row.ExpiresAt)
	}
	if row.Scope != "read.a read.b" || row.TokenType != "Bearer" {
		t.Fatalf("row: %+v", row)
	}
	if row.LastRefreshAt != nil {
		t.Fatalf("LastRefreshAt should be nil for non-refresh")
	}

	rowR := buildTokenRow(42, resp, now, true)
	if rowR.LastRefreshAt == nil || !rowR.LastRefreshAt.Equal(now) {
		t.Fatalf("LastRefreshAt wrong for refresh: %v", rowR.LastRefreshAt)
	}
}

func TestBuildTokenRowNilExpiry(t *testing.T) {
	resp := &tokenResponse{AccessToken: "a", ExpiresIn: 0}
	row := buildTokenRow(1, resp, time.Now(), false)
	if row.ExpiresAt != nil {
		t.Fatalf("ExpiresIn=0 should yield nil ExpiresAt, got %v", row.ExpiresAt)
	}
	// No refresh token → key absent from map rather than empty.
	if _, present := row.Secrets[db.ConnectionOAuthSecretKeyRefreshToken]; present {
		t.Fatalf("refresh token key should be absent when response omits it")
	}
}

func TestPostTokenSendsFormAndBasicAuth(t *testing.T) {
	var gotAuth, gotContentType, gotBody string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
		gotContentType = r.Header.Get("Content-Type")
		body, _ := io.ReadAll(r.Body)
		gotBody = string(body)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(
			[]byte(
				`{"access_token":"at","token_type":"Bearer","expires_in":3600,"refresh_token":"rt","scope":"a b"}`,
			),
		)
	}))
	defer srv.Close()

	s := newTestService(t, srv.Client())
	form := url.Values{}
	form.Set("grant_type", "authorization_code")
	form.Set("code", "CODE1")
	resp, err := s.postToken(
		context.Background(),
		srv.URL,
		form,
		"cid",
		"csecret",
		"token_exchange",
	)
	if err != nil {
		t.Fatalf("postToken: %v", err)
	}
	if resp.AccessToken != "at" || resp.RefreshToken != "rt" {
		t.Fatalf("parsed: %+v", resp)
	}
	if !strings.HasPrefix(gotAuth, "Basic ") {
		t.Fatalf("expected HTTP Basic auth, got %q", gotAuth)
	}
	if gotContentType != "application/x-www-form-urlencoded" {
		t.Fatalf("content-type: %q", gotContentType)
	}
	if !strings.Contains(gotBody, "grant_type=authorization_code") ||
		!strings.Contains(gotBody, "code=CODE1") {
		t.Fatalf("body missing required params: %q", gotBody)
	}
}

func TestPostTokenWraps4xxAsVendorError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"invalid_grant"}`))
	}))
	defer srv.Close()
	s := newTestService(t, srv.Client())

	_, err := s.postToken(context.Background(), srv.URL, url.Values{}, "cid", "", "refresh")
	var ve *VendorError
	if err == nil || !errors.As(err, &ve) {
		t.Fatalf("expected *VendorError, got %T %v", err, err)
	}
	if ve.StatusCode != http.StatusBadRequest {
		t.Fatalf("StatusCode = %d", ve.StatusCode)
	}
	if !strings.Contains(ve.Snippet, "invalid_grant") {
		t.Fatalf("snippet missing: %q", ve.Snippet)
	}
	if ve.Stage != "refresh" {
		t.Fatalf("stage = %q", ve.Stage)
	}
}

func TestPostTokenRejectsMissingAccessToken(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"token_type":"Bearer"}`))
	}))
	defer srv.Close()
	s := newTestService(t, srv.Client())

	_, err := s.postToken(context.Background(), srv.URL, url.Values{}, "cid", "", "token_exchange")
	if err == nil || !strings.Contains(err.Error(), "missing access_token") {
		t.Fatalf("expected missing-access_token error, got %v", err)
	}
}

func TestClassifyRefreshError(t *testing.T) {
	s := newTestService(t, http.DefaultClient)
	cases := []struct {
		name       string
		in         error
		want       error
		passthruOK bool // when true, output must be the same error as input
	}{
		{"400 maps to ErrRefreshRejected",
			&VendorError{Stage: "refresh", StatusCode: 400, Snippet: "bad"},
			ErrRefreshRejected, false},
		{"401 maps to ErrRefreshRejected",
			&VendorError{Stage: "refresh", StatusCode: 401, Snippet: "unauth"},
			ErrRefreshRejected, false},
		{"5xx passes through verbatim",
			&VendorError{Stage: "refresh", StatusCode: 500, Snippet: "boom"},
			nil, true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := s.classifyRefreshError(tc.in)
			if tc.passthruOK {
				// Pointer-identity check: passthrough means the same error
				// value is returned, not an equivalent-but-wrapped one.
				// errorlint's preferred errors.Is would be overly permissive.
				//nolint:errorlint // pointer-identity is the invariant under test
				if got != tc.in {
					t.Fatalf("expected passthrough (same pointer), got %v", got)
				}
				return
			}
			if !errors.Is(got, tc.want) {
				t.Fatalf("got %v, want %v", got, tc.want)
			}
		})
	}
}

func TestAsciiSnippetStripsControl(t *testing.T) {
	// Build the byte slice byte-by-byte so the source file stays valid UTF-8
	// while the slice contains the control bytes we want the function to strip.
	in := append([]byte("hello"), 0x00, 0xff, 0x01)
	in = append(in, []byte("world\nmore")...)
	got := asciiSnippet(in, 100)
	if strings.ContainsAny(got, "\x00\x01") || strings.ContainsRune(got, 0xff) {
		t.Fatalf("control chars leaked: %q", got)
	}
	if !strings.Contains(got, "hello") || !strings.Contains(got, "world") {
		t.Fatalf("stripped too aggressively: %q", got)
	}
}

func TestAsciiSnippetRespectsMax(t *testing.T) {
	in := []byte(strings.Repeat("a", 1000))
	got := asciiSnippet(in, 50)
	if len(got) != 50 {
		t.Fatalf("len = %d, want 50", len(got))
	}
}

// ptr is a one-line helper since we cannot take the address of time literals.
func ptr[T any](v T) *T { return &v }
