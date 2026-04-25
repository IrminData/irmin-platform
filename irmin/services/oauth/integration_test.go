// Integration tests for the OAuth service. These hit a real Postgres via
// the shared lib.TestSuite and stand up an httptest server acting as the
// vendor. Each test skips cleanly when the full .env is not available, so
// `go test ./...` without credentials doesn't fail — only the developer
// and CI with a seeded test DB see these run.
//
// Covers three scenarios that unit tests can't catch because they depend
// on GORM serializer round-trips, row locking, and transaction behavior
// against real Postgres:
//
//  1. Full happy path: StartFlow → HandleCallback → GetAccessToken, plus
//     assertion that stored secrets are decrypted correctly after a DB
//     round-trip through the encrypted_json serializer.
//  2. Revoke wipes in-flight sessions alongside the token (regression for
//     the race where a late callback could silently re-create the token
//     a user just asked to revoke).
//  3. Refresh-token carry-forward when the vendor omits refresh_token in
//     its response (common — many vendors don't rotate).

package oauth_test

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"irmin-api/db"
	"irmin-api/lib"
	"irmin-api/services/oauth"

	"gorm.io/gorm"
)

// --- test harness -----------------------------------------------------------

// ensureIntegrationEnv initializes the shared test suite and returns the
// DB plus the seeded test user/workspace. Skips the test with a clear
// message when the environment isn't provisioned.
func ensureIntegrationEnv(t *testing.T) (*db.Database, *db.User, *db.Workspace) {
	t.Helper()
	if err := lib.SetupTestSuite(nil); err != nil {
		t.Skipf("integration tests require a full .env: %v", err)
	}
	ts := lib.GetTestSuite()
	if ts == nil {
		t.Skip("integration tests require a full .env (no TestSuite)")
	}
	user, workspace := lib.SkipIfNoTestData(t, ts.DB, ts.Env.TestUserEmail, ts.Env.TestWorkspace)
	return ts.DB, user, workspace
}

// testConfigProvider returns the Config its Fn closure produces. Tests wire
// it up to point at their vendor mock's URLs.
type testConfigProvider struct {
	fn func(connector *db.Connector) (*oauth.Config, error)
}

func (p *testConfigProvider) GetOAuthConfig(
	_ context.Context,
	c *db.Connector,
) (*oauth.Config, error) {
	return p.fn(c)
}

// newIntegrationService builds an OAuth service wired to a real DB and the
// test's vendor mock. Uses http.DefaultClient so requests to httptest's
// 127.0.0.1 listener aren't blocked by lib.NewSafeHTTPClient's SSRF guard.
func newIntegrationService(
	t *testing.T,
	d *db.Database,
	provider oauth.ConfigProvider,
) *oauth.Service {
	t.Helper()
	svc, err := oauth.NewService(oauth.Options{
		DB:          d,
		Provider:    provider,
		HTTPClient:  http.DefaultClient,
		Logger:      slog.New(slog.NewTextHandler(io.Discard, nil)),
		RedirectURI: "https://api.irmin.dev/api/v1/oauth/callback",
	})
	if err != nil {
		t.Fatalf("NewService: %v", err)
	}
	return svc
}

// createTestConnector inserts a throwaway connector row and schedules its
// deletion when the test ends. The name is made unique with a timestamp so
// parallel test runs against the same DB don't collide.
func createTestConnector(t *testing.T, d *db.Database) *db.Connector {
	t.Helper()
	connector := &db.Connector{
		APIBaseURL:       fmt.Sprintf("http://test-connector-%d.invalid", time.Now().UnixNano()),
		SystemToken:      fmt.Sprintf("test-token-%d", time.Now().UnixNano()),
		Name:             fmt.Sprintf("test-%d", time.Now().UnixNano()),
		Description:      "oauth integration test connector",
		Version:          "0.0.1",
		StructureVersion: "1",
		Author:           "integration-test",
		Capabilities:     []string{"pull"},
	}
	if err := d.Create(connector).Error; err != nil {
		t.Fatalf("create connector: %v", err)
	}
	t.Cleanup(func() {
		if err := d.Unscoped().Delete(connector).Error; err != nil {
			t.Logf("cleanup connector: %v", err)
		}
	})
	return connector
}

// createTestConnection inserts a throwaway Connection for the given user +
// workspace + connector. Schedules cascade cleanup (which also removes
// OAuth tokens/sessions per the DeleteConnection implementation).
func createTestConnection(
	t *testing.T,
	d *db.Database,
	user *db.User,
	workspace *db.Workspace,
	connector *db.Connector,
) *db.Connection {
	t.Helper()
	conn := &db.Connection{
		Name:        fmt.Sprintf("integration-oauth-%d", time.Now().UnixNano()),
		OwnerID:     user.ID,
		WorkspaceID: workspace.ID,
		ConnectorID: connector.ID,
		Details:     db.CustomFieldValues{},
		Settings:    db.CustomFieldValues{},
	}
	if err := d.Create(conn).Error; err != nil {
		t.Fatalf("create connection: %v", err)
	}
	t.Cleanup(func() {
		_ = d.Transaction(func(tx *gorm.DB) error {
			return d.DeleteConnection(tx, conn.ID)
		})
	})
	// Reload with Connector preloaded — StartFlow reads connection.Connector.ID
	// to decide whether to fetch.
	reloaded, err := d.GetConnectionByID(conn.ID)
	if err != nil {
		t.Fatalf("reload connection: %v", err)
	}
	return reloaded
}

// createTestOAuthClient inserts an admin-configured-style client row for
// the given (connector, workspace). Matches the non-DCR path, i.e. what
// HubSpot/Stripe flows look like.
// testOAuthCallbackURI is the redirect URI every integration test
// registers its OAuth client with. The Service is constructed with the
// same value via newIntegrationService so flow assertions see a
// consistent callback host; there's no reason for per-test variance.
const testOAuthCallbackURI = "https://api.irmin.dev/api/v1/oauth/callback"

func createTestOAuthClient(
	t *testing.T,
	d *db.Database,
	connector *db.Connector,
	workspaceID uint,
) *db.ConnectionOAuthClient {
	t.Helper()
	client := &db.ConnectionOAuthClient{
		ConnectorID: connector.ID,
		WorkspaceID: &workspaceID,
		ClientID:    "test-client-id",
		RedirectURI: testOAuthCallbackURI,
		Secrets: db.CustomFieldValues{
			db.ConnectionOAuthSecretKeyClientSecret: "test-client-secret",
		},
	}
	if err := d.CreateConnectionOAuthClient(d.DB, client); err != nil {
		t.Fatalf("create oauth client: %v", err)
	}
	t.Cleanup(func() {
		if err := d.Unscoped().Delete(client).Error; err != nil {
			t.Logf("cleanup oauth client: %v", err)
		}
	})
	return client
}

// vendorMock is an httptest server that stands in for a vendor's OAuth
// endpoints. Tests configure its behavior with a handler closure; the
// mock captures request counts for assertions.
type vendorMock struct {
	server *httptest.Server
	// TokenHandler, if set, overrides the default /token handler.
	TokenHandler http.HandlerFunc
	// Counters the test asserts on.
	TokenCalls  int
	RevokeCalls int
}

func (m *vendorMock) URL(path string) string { return m.server.URL + path }

// newVendorMock starts a vendor mock. The default /token handler returns a
// boring access_token + refresh_token + 1h expiry. Tests can swap
// TokenHandler before exercising the flow to inject specific responses.
func newVendorMock(t *testing.T) *vendorMock {
	t.Helper()
	mock := &vendorMock{}
	mux := http.NewServeMux()
	mux.HandleFunc("/token", func(w http.ResponseWriter, r *http.Request) {
		mock.TokenCalls++
		if mock.TokenHandler != nil {
			mock.TokenHandler(w, r)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(
			[]byte(
				`{"access_token":"access-1","refresh_token":"refresh-1","token_type":"Bearer","expires_in":3600}`,
			),
		)
	})
	mux.HandleFunc("/revoke", func(w http.ResponseWriter, _ *http.Request) {
		mock.RevokeCalls++
		w.WriteHeader(http.StatusOK)
	})
	mock.server = httptest.NewServer(mux)
	t.Cleanup(mock.server.Close)
	return mock
}

// configFor returns a Config pointing at the vendor mock with the scopes
// the test wants. Keeps DCREndpoint empty (non-DCR path is the norm for
// the HubSpot/Stripe family).
func configFor(v *vendorMock, scopes ...string) *oauth.Config {
	return &oauth.Config{
		Provider:         "integration-test",
		AuthorizationURL: v.URL("/authorize"),
		TokenURL:         v.URL("/token"),
		RevocationURL:    v.URL("/revoke"),
		Scopes:           scopes,
		PKCE:             true,
	}
}

// --- tests -------------------------------------------------------------------

// tokenExchangeCapture captures the form fields the vendor sees during
// /token, so assertions can prove PKCE + client creds are wired correctly.
type tokenExchangeCapture struct {
	Verifier string
	Code     string
	ClientID string
}

// captureTokenExchange swaps in a /token handler that records the
// exchange form and replies with a stable success body.
func captureTokenExchange(vendor *vendorMock) *tokenExchangeCapture {
	seen := &tokenExchangeCapture{}
	vendor.TokenHandler = func(w http.ResponseWriter, r *http.Request) {
		_ = r.ParseForm()
		seen.Verifier = r.Form.Get("code_verifier")
		seen.Code = r.Form.Get("code")
		seen.ClientID = r.Form.Get("client_id")
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(
			[]byte(
				`{"access_token":"access-1","refresh_token":"refresh-1","token_type":"Bearer","expires_in":3600,"scope":"read.a read.b"}`,
			),
		)
	}
	return seen
}

// assertStartFlow verifies the auth URL + persisted session shape. Kept
// in its own helper so TestIntegrationStartFlowAndHandleCallback stays
// under golangci's cognitive-complexity threshold.
func assertStartFlow(
	t *testing.T,
	d *db.Database,
	authURL string,
	expectedClientID string,
) string {
	t.Helper()
	parsed, err := url.Parse(authURL)
	if err != nil {
		t.Fatalf("parse auth URL: %v", err)
	}
	state := parsed.Query().Get("state")
	if state == "" || parsed.Query().Get("code_challenge") == "" {
		t.Fatalf("auth URL missing state or challenge: %q", authURL)
	}
	if got := parsed.Query().Get("client_id"); got != expectedClientID {
		t.Fatalf("client_id = %q, want %q", got, expectedClientID)
	}
	sess, err := d.GetConnectionOAuthSessionByStateHMAC(state)
	if err != nil {
		t.Fatalf("session not persisted: %v", err)
	}
	if v := sess.Secrets[db.ConnectionOAuthSecretKeyPKCEVerifier]; v == "" {
		t.Fatalf("session has no PKCE verifier after DB read")
	}
	return state
}

// assertCallbackOutcome checks the service return value, the vendor-side
// capture, and the final token/session DB rows.
func assertCallbackOutcome(
	t *testing.T,
	d *db.Database,
	result *oauth.CallbackResult,
	capture *tokenExchangeCapture,
	state string,
	conn *db.Connection,
	userID uint,
	expectedClientID string,
) {
	t.Helper()
	if result.Connection == nil || result.Connection.ID != conn.ID {
		t.Fatalf("callback returned wrong connection: got %+v, want %d", result.Connection, conn.ID)
	}
	if result.InitiatingUserID == nil || *result.InitiatingUserID != userID {
		t.Fatalf("callback initiator = %v, want %d", result.InitiatingUserID, userID)
	}
	if capture.Code != "vendor-issued-code" {
		t.Fatalf("vendor saw code = %q", capture.Code)
	}
	if capture.ClientID != expectedClientID {
		t.Fatalf("vendor saw client_id = %q, want %q", capture.ClientID, expectedClientID)
	}
	if capture.Verifier == "" {
		t.Fatalf("vendor saw empty code_verifier — PKCE not wired")
	}
	tok, err := d.GetConnectionOAuthTokenByConnectionID(conn.ID)
	if err != nil {
		t.Fatalf("token not persisted: %v", err)
	}
	if tok.Secrets[db.ConnectionOAuthSecretKeyAccessToken] != "access-1" {
		t.Fatalf(
			"access_token round-trip mismatch: %q",
			tok.Secrets[db.ConnectionOAuthSecretKeyAccessToken],
		)
	}
	if tok.Secrets[db.ConnectionOAuthSecretKeyRefreshToken] != "refresh-1" {
		t.Fatalf(
			"refresh_token round-trip mismatch: %q",
			tok.Secrets[db.ConnectionOAuthSecretKeyRefreshToken],
		)
	}
	if tok.Scope != "read.a read.b" {
		t.Fatalf("scope mismatch: %q", tok.Scope)
	}
	if _, sessErr := d.GetConnectionOAuthSessionByStateHMAC(state); !errors.Is(
		sessErr,
		db.ErrConnectionOAuthSessionNotFound,
	) {
		t.Fatalf("session not deleted after callback: %v", sessErr)
	}
}

func TestIntegrationStartFlowAndHandleCallback(t *testing.T) {
	d, user, workspace := ensureIntegrationEnv(t)
	connector := createTestConnector(t, d)
	conn := createTestConnection(t, d, user, workspace, connector)

	vendor := newVendorMock(t)
	client := createTestOAuthClient(
		t,
		d,
		connector,
		workspace.ID,
	)
	capture := captureTokenExchange(vendor)
	svc := newIntegrationService(t, d, &testConfigProvider{
		fn: func(_ *db.Connector) (*oauth.Config, error) {
			return configFor(vendor, "read.a", "read.b"), nil
		},
	})

	authURL, err := svc.StartFlow(context.Background(), conn, user.ID)
	if err != nil {
		t.Fatalf("StartFlow: %v", err)
	}
	state := assertStartFlow(t, d, authURL, client.ClientID)

	result, err := svc.HandleCallback(context.Background(), state, "vendor-issued-code")
	if err != nil {
		t.Fatalf("HandleCallback: %v", err)
	}
	assertCallbackOutcome(t, d, result, capture, state, conn, user.ID, client.ClientID)

	// GetAccessToken fast path — fresh token must not hit the vendor again.
	beforeCalls := vendor.TokenCalls
	at, err := svc.GetAccessToken(context.Background(), conn.ID)
	if err != nil {
		t.Fatalf("GetAccessToken: %v", err)
	}
	if at.Value != "access-1" {
		t.Fatalf("GetAccessToken returned wrong value: %q", at.Value)
	}
	if vendor.TokenCalls != beforeCalls {
		t.Fatalf("GetAccessToken hit vendor unnecessarily — fresh token should be fast-path")
	}
}

func TestIntegrationRevokeCleansSessions(t *testing.T) {
	d, user, workspace := ensureIntegrationEnv(t)
	connector := createTestConnector(t, d)
	conn := createTestConnection(t, d, user, workspace, connector)
	vendor := newVendorMock(t)
	_ = createTestOAuthClient(
		t,
		d,
		connector,
		workspace.ID,
	)

	svc := newIntegrationService(t, d, &testConfigProvider{
		fn: func(_ *db.Connector) (*oauth.Config, error) {
			return configFor(vendor), nil
		},
	})

	// Seed an in-flight session — mimics the user clicking Connect before
	// clicking Disconnect.
	sess := &db.ConnectionOAuthSession{
		ConnectionID: conn.ID,
		StateHMAC:    fmt.Sprintf("state-%d", time.Now().UnixNano()),
		Secrets:      db.CustomFieldValues{db.ConnectionOAuthSecretKeyPKCEVerifier: "verifier"},
		ExpiresAt:    time.Now().Add(10 * time.Minute),
	}
	if err := d.CreateConnectionOAuthSession(d.DB, sess); err != nil {
		t.Fatalf("seed session: %v", err)
	}
	// And an existing token — user had successfully connected earlier.
	tok := &db.ConnectionOAuthToken{
		ConnectionID: conn.ID,
		Secrets: db.CustomFieldValues{
			db.ConnectionOAuthSecretKeyAccessToken:  "old-access",
			db.ConnectionOAuthSecretKeyRefreshToken: "old-refresh",
		},
		TokenType: "Bearer",
	}
	if err := d.UpsertConnectionOAuthToken(d.DB, tok); err != nil {
		t.Fatalf("seed token: %v", err)
	}

	// Revoke should wipe both the token row AND the in-flight session,
	// closing the door on a late callback silently re-creating the token.
	if err := svc.Revoke(context.Background(), conn.ID); err != nil {
		t.Fatalf("Revoke: %v", err)
	}
	if _, err := d.GetConnectionOAuthTokenByConnectionID(conn.ID); !errors.Is(
		err,
		db.ErrConnectionOAuthTokenNotFound,
	) {
		t.Fatalf("token not deleted after Revoke: %v", err)
	}
	if _, err := d.GetConnectionOAuthSessionByStateHMAC(sess.StateHMAC); !errors.Is(
		err,
		db.ErrConnectionOAuthSessionNotFound,
	) {
		t.Fatalf("session not deleted after Revoke — late callback could re-create token: %v", err)
	}
	if vendor.RevokeCalls == 0 {
		t.Fatalf("expected at least one call to the vendor revoke endpoint")
	}
}

func TestIntegrationRefreshPreservesOldRefreshToken(t *testing.T) {
	d, user, workspace := ensureIntegrationEnv(t)
	connector := createTestConnector(t, d)
	conn := createTestConnection(t, d, user, workspace, connector)
	vendor := newVendorMock(t)
	_ = createTestOAuthClient(
		t,
		d,
		connector,
		workspace.ID,
	)

	// Many real vendors (HubSpot among them) don't rotate refresh tokens.
	// The service must carry the old one forward — losing it would brick
	// the next refresh attempt.
	vendor.TokenHandler = func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"access_token": "rotated-access",
			"token_type":   "Bearer",
			"expires_in":   3600,
			// Deliberately no refresh_token in the response.
		})
	}

	svc := newIntegrationService(t, d, &testConfigProvider{
		fn: func(_ *db.Connector) (*oauth.Config, error) {
			return configFor(vendor), nil
		},
	})

	// Seed an expired token so GetAccessToken forces a refresh.
	expiredAt := time.Now().Add(-1 * time.Hour)
	tok := &db.ConnectionOAuthToken{
		ConnectionID: conn.ID,
		Secrets: db.CustomFieldValues{
			db.ConnectionOAuthSecretKeyAccessToken:  "stale-access",
			db.ConnectionOAuthSecretKeyRefreshToken: "original-refresh",
		},
		ExpiresAt: &expiredAt,
		TokenType: "Bearer",
	}
	if err := d.UpsertConnectionOAuthToken(d.DB, tok); err != nil {
		t.Fatalf("seed token: %v", err)
	}

	at, err := svc.GetAccessToken(context.Background(), conn.ID)
	if err != nil {
		t.Fatalf("GetAccessToken: %v", err)
	}
	if at.Value != "rotated-access" {
		t.Fatalf("access_token not rotated: %q", at.Value)
	}

	// Crucial assertion: refresh_token preserved since the vendor didn't
	// send a new one.
	stored, err := d.GetConnectionOAuthTokenByConnectionID(conn.ID)
	if err != nil {
		t.Fatalf("reload token: %v", err)
	}
	if got := stored.Secrets[db.ConnectionOAuthSecretKeyRefreshToken]; got != "original-refresh" {
		t.Fatalf("refresh_token lost on refresh: got %q, want %q", got, "original-refresh")
	}
	if stored.LastRefreshAt == nil {
		t.Fatalf("LastRefreshAt should be set after a refresh")
	}
	if vendor.TokenCalls != 1 {
		t.Fatalf("expected exactly 1 token call, got %d", vendor.TokenCalls)
	}
}

func TestIntegrationForceRefreshBypassesSkewWindow(t *testing.T) {
	// Force-refresh is how the connectors service recovers when a vendor
	// rejects a locally-fresh token mid-operation (token revoked at the
	// vendor before its ExpiresAt entered the skew window). The regular
	// GetAccessToken path would short-circuit and return the same stale
	// token; ForceRefreshAccessToken must hit the vendor unconditionally.
	d, user, workspace := ensureIntegrationEnv(t)
	connector := createTestConnector(t, d)
	conn := createTestConnection(t, d, user, workspace, connector)
	vendor := newVendorMock(t)
	_ = createTestOAuthClient(
		t,
		d,
		connector,
		workspace.ID,
	)
	vendor.TokenHandler = func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"access_token":  "force-rotated",
			"refresh_token": "refresh-2",
			"token_type":    "Bearer",
			"expires_in":    3600,
		})
	}
	svc := newIntegrationService(t, d, &testConfigProvider{
		fn: func(_ *db.Connector) (*oauth.Config, error) {
			return configFor(vendor), nil
		},
	})

	// Seed a token that's well outside the skew window — GetAccessToken
	// would happily return it without contacting the vendor.
	freshExpiry := time.Now().Add(2 * time.Hour)
	tok := &db.ConnectionOAuthToken{
		ConnectionID: conn.ID,
		Secrets: db.CustomFieldValues{
			db.ConnectionOAuthSecretKeyAccessToken:  "still-valid-locally",
			db.ConnectionOAuthSecretKeyRefreshToken: "refresh-1",
		},
		ExpiresAt: &freshExpiry,
		TokenType: "Bearer",
	}
	if err := d.UpsertConnectionOAuthToken(d.DB, tok); err != nil {
		t.Fatalf("seed token: %v", err)
	}

	// Control: the lazy path should NOT hit the vendor.
	if _, err := svc.GetAccessToken(context.Background(), conn.ID); err != nil {
		t.Fatalf("GetAccessToken: %v", err)
	}
	if vendor.TokenCalls != 0 {
		t.Fatalf("GetAccessToken hit vendor for a fresh token; got %d calls", vendor.TokenCalls)
	}

	// Force path: must hit the vendor and return the rotated token.
	at, err := svc.ForceRefreshAccessToken(context.Background(), conn.ID)
	if err != nil {
		t.Fatalf("ForceRefreshAccessToken: %v", err)
	}
	if at.Value != "force-rotated" {
		t.Fatalf("ForceRefreshAccessToken value = %q, want %q", at.Value, "force-rotated")
	}
	if vendor.TokenCalls != 1 {
		t.Fatalf("expected exactly 1 vendor call after force-refresh, got %d", vendor.TokenCalls)
	}

	// Stored row reflects the rotation.
	stored, err := d.GetConnectionOAuthTokenByConnectionID(conn.ID)
	if err != nil {
		t.Fatalf("reload token: %v", err)
	}
	if got := stored.Secrets[db.ConnectionOAuthSecretKeyAccessToken]; got != "force-rotated" {
		t.Fatalf("access_token not rotated in DB: %q", got)
	}
}

// --- sanity check ------------------------------------------------------------

// TestIntegrationHelpersCompile exists so the test file contributes to the
// test binary even when the integration tests are skipped (missing env).
// Without at least one unconditional test, go test reports "[no tests to
// run]" for this file which is noisier than "all skipped".
func TestIntegrationHelpersCompile(t *testing.T) {
	// A trivial assertion to keep the test ledger tidy.
	if strings.TrimSpace(db.ConnectionOAuthSecretKeyAccessToken) == "" {
		t.Fatal("access-token key missing")
	}
}
