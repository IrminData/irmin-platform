// Internal test file — exercises unexported callback helpers that we
// deliberately keep package-private (HTML builder, error classifiers).
//
//nolint:testpackage // intentional internal test for unexported helpers
package controllers

import (
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"irmin-api/db"
	"irmin-api/locales"
	"irmin-api/services"
	"irmin-api/services/oauth"

	"github.com/gofiber/fiber/v3"
)

// newSystemAccessTokenTestController stitches together the smallest
// APIControllers that can handle SystemOAuthAccessToken requests. It
// leaves Services.OAuthService nil on purpose: the auth-gate tests want
// to stop at the gate without ever touching the service. When the gate
// allows the call through, the handler hits the nil OAuthService check
// next and returns a distinct "OAuth service unavailable" error — which
// is exactly the signal we use to assert the gate did pass.
func newSystemAccessTokenTestController(t *testing.T) *APIControllers {
	t.Helper()
	lm, err := locales.New()
	if err != nil {
		t.Fatalf("locales.New: %v", err)
	}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	return &APIControllers{
		Services:     &services.APIServices{}, // OAuthService deliberately nil
		Logger:       logger,
		lm:           lm,
		errorHandler: services.NewErrorHandler(logger, lm),
	}
}

// mountSystemAccessTokenRoute wires the controller's handler onto a
// fiber app preceded by a tiny middleware that simulates AuthMiddleware
// by stamping is_system based on a per-request header. Lets each test
// drive the gate without spinning up the real auth stack.
func mountSystemAccessTokenRoute(t *testing.T, api *APIControllers) *fiber.App {
	t.Helper()
	app := fiber.New()
	app.Post("/api/v1/system/oauth/access-token",
		func(c fiber.Ctx) error {
			switch c.Get("X-Test-Auth") {
			case "system":
				c.Locals("is_system", true)
				c.Locals("token_type", services.TokenTypeSystem)
			case "user":
				c.Locals("is_system", false)
				c.Locals("token_type", services.TokenTypeClerk)
			}
			return c.Next()
		},
		api.SystemOAuthAccessToken,
	)
	return app
}

func runSystemAccessTokenTest(
	t *testing.T,
	app *fiber.App,
	authHeader string,
	body string,
) *http.Response {
	t.Helper()
	req := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/system/oauth/access-token",
		strings.NewReader(body),
	)
	req.Header.Set("Content-Type", "application/json")
	if authHeader != "" {
		req.Header.Set("X-Test-Auth", authHeader)
	}
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	return resp
}

// TestBuildForcedRefreshLogEventStampsWorkspace locks in the audit
// event invariant: the workspace ID must be present so the event
// surfaces in console queries (GetLogEventsForWorkspace and friends
// all filter by workspace). Caught in code review — the original
// implementation only set ConnectionID, so the event would persist
// but never appear anywhere a user could see it.
func TestBuildForcedRefreshLogEventStampsWorkspace(t *testing.T) {
	conn := &db.Connection{WorkspaceID: 7}
	conn.ID = 42 // gorm.Model embeds ID; struct literal can't set it directly.
	event := buildForcedRefreshLogEvent(42, conn)
	if event.ConnectionID == nil || *event.ConnectionID != 42 {
		t.Fatalf("ConnectionID = %v, want 42", event.ConnectionID)
	}
	if event.WorkspaceID == nil {
		t.Fatalf("WorkspaceID is nil — event would never appear in console")
	}
	if *event.WorkspaceID != 7 {
		t.Fatalf("WorkspaceID = %d, want 7", *event.WorkspaceID)
	}
	if event.Type != db.LogEventTypeInfo {
		t.Fatalf("Type = %q, want INFO", event.Type)
	}
	if !strings.Contains(event.Description, "forced") {
		t.Fatalf("Description = %q, want to mention 'forced'", event.Description)
	}
	// Mutating the source connection after construction must not
	// retroactively change the event — tests for the local-copy of
	// WorkspaceID inside the helper.
	conn.WorkspaceID = 999
	if *event.WorkspaceID != 7 {
		t.Fatalf("WorkspaceID aliased the source struct: now %d", *event.WorkspaceID)
	}
}

func TestBuildForcedRefreshLogEventNilConnectionStillTrails(t *testing.T) {
	// Lookup-failure path: we still want a row in the log so an
	// operator can see the refresh happened, even if it lacks the
	// workspace field used by the standard query paths.
	event := buildForcedRefreshLogEvent(42, nil)
	if event.ConnectionID == nil || *event.ConnectionID != 42 {
		t.Fatalf("ConnectionID lost on lookup failure: %v", event.ConnectionID)
	}
	if event.WorkspaceID != nil {
		t.Fatalf("WorkspaceID should be nil when conn lookup failed, got %d", *event.WorkspaceID)
	}
}

// TestSystemOAuthAccessTokenAuthGate verifies the system-token gate is
// in front of the access-token endpoint for both the lazy and forced
// variants. This is the single auth check that lets irmin-connectors
// (running with IRMIN_API_TOKEN === Core's TOKEN env var) reach the
// service layer; any future refactor that loses this check would let
// any authenticated user mint vendor tokens for arbitrary connections.
func TestSystemOAuthAccessTokenAuthGate(t *testing.T) {
	api := newSystemAccessTokenTestController(t)
	app := mountSystemAccessTokenRoute(t, api)

	cases := []struct {
		name       string
		auth       string
		body       string
		wantStatus int
		wantBody   string // substring assertion on the response body
	}{
		{
			name:       "no token: gate denies",
			auth:       "",
			body:       `{"connection_id":1}`,
			wantStatus: http.StatusForbidden,
			wantBody:   "access denied",
		},
		{
			name:       "user token: gate denies",
			auth:       "user",
			body:       `{"connection_id":1}`,
			wantStatus: http.StatusForbidden,
			wantBody:   "access denied",
		},
		{
			// Distinct status (500 vs 403) proves we got past the auth
			// gate and into the next check: OAuthService is nil in this
			// stub, which is internal-only so it surfaces as the
			// generic "Error occurred" body.
			name:       "system token, lazy variant: gate passes",
			auth:       "system",
			body:       `{"connection_id":1}`,
			wantStatus: http.StatusInternalServerError,
			wantBody:   "error occurred",
		},
		{
			// Same gate, just a different body shape — proves the
			// force_refresh branch shares the same single auth check
			// rather than carving out a new code path.
			name:       "system token, force_refresh: gate passes (same gate)",
			auth:       "system",
			body:       `{"connection_id":1,"force_refresh":true}`,
			wantStatus: http.StatusInternalServerError,
			wantBody:   "error occurred",
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			resp := runSystemAccessTokenTest(t, app, tc.auth, tc.body)
			if resp.StatusCode != tc.wantStatus {
				body, _ := io.ReadAll(resp.Body)
				_ = resp.Body.Close()
				t.Fatalf(
					"status = %d, want %d (body=%q)",
					resp.StatusCode, tc.wantStatus, string(body),
				)
			}
			body, _ := io.ReadAll(resp.Body)
			_ = resp.Body.Close()
			if !strings.Contains(strings.ToLower(string(body)), tc.wantBody) {
				t.Fatalf("body = %q, want substring %q", string(body), tc.wantBody)
			}
		})
	}
}

func TestBuildCallbackHTMLSuccessIncludesConsoleOrigin(t *testing.T) {
	got := buildCallbackHTML("https://console.irmin.dev", oauthCallbackResult{
		Success:      true,
		ConnectionID: "conn_abc",
	})
	// postMessage target origin must be the console URL, as a JS string
	// literal. An unqualified "*" target would be a real security bug.
	if !strings.Contains(got, `"https://console.irmin.dev"`) {
		t.Fatalf("expected console origin embedded as JS string, got:\n%s", got)
	}
	if strings.Contains(got, `postMessage(payload, "*")`) {
		t.Fatalf("must never use wildcard target origin")
	}
	if !strings.Contains(got, "irmin:oauth:success") {
		t.Fatalf("missing success message type")
	}
	if !strings.Contains(got, `"connectionId":"conn_abc"`) {
		t.Fatalf("missing connection id in payload")
	}
	if !strings.Contains(got, "Connection complete") {
		t.Fatalf("missing heading")
	}
}

func TestBuildCallbackHTMLFailureIncludesErrorCode(t *testing.T) {
	got := buildCallbackHTML("https://console.irmin.dev", oauthCallbackResult{
		Error:       "state_invalid",
		Description: "session expired",
	})
	if !strings.Contains(got, "irmin:oauth:error") {
		t.Fatalf("missing error message type")
	}
	if !strings.Contains(got, `"error":"state_invalid"`) {
		t.Fatalf("missing error code in payload")
	}
	if !strings.Contains(got, `"description":"session expired"`) {
		t.Fatalf("missing description in payload")
	}
	if !strings.Contains(got, "Connection failed") {
		t.Fatalf("missing failure heading")
	}
}

func TestBuildCallbackHTMLEscapesUserContent(t *testing.T) {
	// Description gets HTML-escaped; the JS payload uses json.Marshal so
	// both channels reject script injection attempts by the vendor.
	got := buildCallbackHTML("https://console.irmin.dev", oauthCallbackResult{
		Error:       "bad",
		Description: "<script>alert(1)</script>",
	})
	if strings.Contains(got, "<script>alert(1)</script>") {
		t.Fatalf("raw script tag leaked into HTML:\n%s", got)
	}
	if !strings.Contains(got, "&lt;script&gt;alert(1)&lt;/script&gt;") {
		t.Fatalf("description should be HTML-escaped in body, got:\n%s", got)
	}
	// In the JS payload the value should be JSON-encoded (backslash-
	// escaped angle brackets are fine; raw closing </script> inside a
	// JSON literal is what we must avoid).
	if strings.Contains(got, "</script>\",") {
		t.Fatalf("unescaped </script> would break out of the script block")
	}
}

func TestBuildCallbackHTMLNeverOutputsWildcardOrigin(t *testing.T) {
	// Even if an attacker controls part of the console URL, the result
	// should be a JSON-encoded string (always quoted, never "*"). This
	// guards against a configuration bug where ConsoleURL is empty.
	got := buildCallbackHTML("", oauthCallbackResult{Success: true})
	if strings.Contains(got, `postMessage(payload, "*")`) ||
		strings.Contains(got, "postMessage(payload, *)") {
		t.Fatalf("wildcard target origin must never be emitted")
	}
	// Empty console URL encodes to "" — an explicit empty string origin,
	// which causes postMessage to reject the message. That is the safe
	// failure mode; data isn't sent anywhere.
	if !strings.Contains(got, `origin = "";`) && !strings.Contains(got, `origin = ""`) {
		t.Fatalf("empty console URL should yield explicit empty target origin, got:\n%s", got)
	}
}

func TestClassifyCallbackError(t *testing.T) {
	cases := []struct {
		err  error
		want string
	}{
		{oauth.ErrStateInvalid, "state_invalid"},
		{fmt.Errorf("wrapped: %w", oauth.ErrStateInvalid), "state_invalid"},
		{oauth.ErrConfigUnavailable, "config_unavailable"},
		{oauth.ErrPKCERequired, "config_unavailable"},
		{oauth.ErrClientUnconfigured, "config_unavailable"},
		{oauth.ErrDCRUnavailable, "config_unavailable"},
		{oauth.ErrRefreshRejected, "refresh_rejected"},
		{oauth.ErrNotConnected, "not_connected"},
		{&oauth.VendorError{Stage: "dcr", StatusCode: 500}, "vendor_error"},
		{errors.New("something else"), "internal_error"},
	}
	for _, tc := range cases {
		t.Run(tc.want, func(t *testing.T) {
			if got := classifyCallbackError(tc.err); got != tc.want {
				t.Fatalf("classifyCallbackError(%v) = %q, want %q", tc.err, got, tc.want)
			}
		})
	}
}

func TestCategorizeOAuthError(t *testing.T) {
	cases := []struct {
		name string
		err  error
		want oauthErrorCategory
	}{
		{"nil falls back to internal", nil, oauthCategoryInternal},

		// BadRequest family — flow misconfig or invalid/expired state.
		{"ErrConfigUnavailable → bad request",
			oauth.ErrConfigUnavailable, oauthCategoryBadRequest},
		{"ErrPKCERequired → bad request",
			oauth.ErrPKCERequired, oauthCategoryBadRequest},
		{"ErrClientUnconfigured → bad request",
			oauth.ErrClientUnconfigured, oauthCategoryBadRequest},
		{"ErrDCRUnavailable → bad request",
			oauth.ErrDCRUnavailable, oauthCategoryBadRequest},
		{"ErrStateInvalid → bad request",
			oauth.ErrStateInvalid, oauthCategoryBadRequest},
		{"wrapped ErrStateInvalid still matches",
			fmt.Errorf("outer: %w", oauth.ErrStateInvalid), oauthCategoryBadRequest},

		// Specific statuses.
		{"ErrNotConnected → not found",
			oauth.ErrNotConnected, oauthCategoryNotFound},
		{"ErrRefreshRejected → unauthorized",
			oauth.ErrRefreshRejected, oauthCategoryUnauthorized},

		// Vendor errors — by concrete type.
		{"*VendorError → vendor",
			&oauth.VendorError{Stage: "dcr", StatusCode: 500}, oauthCategoryVendor},
		{"wrapped *VendorError still matches",
			fmt.Errorf("outer: %w", &oauth.VendorError{Stage: "refresh", StatusCode: 503}),
			oauthCategoryVendor},

		// Unknown errors.
		{"random error → internal", errors.New("boom"), oauthCategoryInternal},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := categorizeOAuthError(tc.err); got != tc.want {
				t.Fatalf("categorizeOAuthError(%v) = %d, want %d", tc.err, got, tc.want)
			}
		})
	}
}

func TestCallbackErrorDescriptionIsScrubbed(t *testing.T) {
	// Vendor bodies must never surface in the user-facing description —
	// they go to server logs via mapOAuthError. Here we just check that
	// the description for *VendorError is a generic string.
	desc := callbackErrorDescription(&oauth.VendorError{
		Stage:      "token_exchange",
		StatusCode: 400,
		Snippet:    `{"error":"invalid_grant","leaked_client_secret":"oops"}`,
	})
	if strings.Contains(desc, "leaked_client_secret") {
		t.Fatalf("vendor body leaked into user-facing description: %q", desc)
	}
	if desc == "" {
		t.Fatalf("expected a non-empty generic description")
	}
}

func TestSanitizeOAuthErrorCode(t *testing.T) {
	// Accepted shapes stay as-is; everything else collapses to the
	// sentinel. Keeps vendor-controlled text from polluting the
	// machine-readable `error` channel that the console branches on.
	cases := []struct {
		in, want string
	}{
		{"access_denied", "access_denied"},
		{"invalid_request", "invalid_request"},
		{"error0", "error0"},
		// Empty — fails the leading-letter rule, becomes sentinel.
		{"", oauthCallbackInvalidErrorSentinel},
		// Uppercase — rejected.
		{"Access_Denied", oauthCallbackInvalidErrorSentinel},
		// Leading digit — rejected.
		{"1bad", oauthCallbackInvalidErrorSentinel},
		// Spaces — rejected.
		{"access denied", oauthCallbackInvalidErrorSentinel},
		// Contains HTML — rejected (also what this guard exists for).
		{"<script>", oauthCallbackInvalidErrorSentinel},
		// Longer than 64 chars — rejected even though the letters are fine.
		{strings.Repeat("a", 65), oauthCallbackInvalidErrorSentinel},
	}
	for _, tc := range cases {
		if got := sanitizeOAuthErrorCode(tc.in); got != tc.want {
			t.Errorf("sanitizeOAuthErrorCode(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

func TestTruncateRunes(t *testing.T) {
	// ASCII under the cap passes through unchanged.
	if g := truncateRunes("hello", 10); g != "hello" {
		t.Errorf("short passthrough: got %q", g)
	}
	// Over the cap gets an ellipsis.
	if g := truncateRunes("abcdefghij", 4); g != "abcd…" {
		t.Errorf("truncate: got %q, want %q", g, "abcd…")
	}
	// Multi-byte runes are counted by rune, not byte — a 4-byte emoji
	// is one rune, so a 3-emoji string under a cap of 4 should pass.
	if g := truncateRunes("🎉🎉🎉", 4); g != "🎉🎉🎉" {
		t.Errorf("rune-count passthrough: got %q", g)
	}
	// Zero/negative cap yields empty — no cute behaviour.
	if g := truncateRunes("hello", 0); g != "" {
		t.Errorf("zero cap: got %q, want empty", g)
	}
}

func TestBuildCallbackHTMLNeutralisesAngleBracketsInScriptPayload(t *testing.T) {
	// Belt-and-braces: even if the JSON encoder's HTML escaping were
	// ever disabled upstream, scriptSafeJSON must prevent </script>
	// from appearing in the embedded payload. We inject the exact byte
	// sequence through the Description channel and check it never
	// shows up unescaped inside the <script> block.
	got := buildCallbackHTML("https://console.irmin.dev", oauthCallbackResult{
		Error:       "vendor_err",
		Description: "</script><script>evil()</script>",
	})

	// Locate the inline <script> so we're checking the JS region, not
	// the HTML body (which is HTML-escaped separately). Everything
	// before the first </script> is the inline payload.
	_, after, found := strings.Cut(got, "<script>")
	if !found {
		t.Fatalf("no <script> block in output:\n%s", got)
	}
	payload, _, found := strings.Cut(after, "</script>")
	if !found {
		t.Fatalf("expected a closing script tag:\n%s", got)
	}
	if strings.Contains(payload, "</script>") {
		t.Fatalf("raw </script> leaked into inline script payload:\n%s", payload)
	}
	// And the escape form we rely on must actually be present (proves
	// the replacement happened, not just that Go's default marshaler
	// happened to save us).
	if !strings.Contains(payload, `\u003c`) {
		t.Fatalf("expected \\u003c escape for < in payload, got:\n%s", payload)
	}
}

func TestBuildCallbackHTMLBoundsVisibleBody(t *testing.T) {
	// A vendor that blasts a huge description should not be able to
	// blow up the response. The HTML-visible body respects the
	// description cap even if the query-layer truncate was bypassed.
	huge := strings.Repeat("a", oauthCallbackMaxDescriptionLen*4)
	got := buildCallbackHTML("https://console.irmin.dev", oauthCallbackResult{
		Error:       "vendor_err",
		Description: huge,
	})
	// Trailing ellipsis marks the truncation.
	if !strings.Contains(got, "…") {
		t.Fatalf("expected ellipsis marking description truncation, got len=%d", len(got))
	}
	// Response size is bounded — generous upper bound well below the
	// hypothetical `description * 4` input.
	if len(got) > 16*1024 {
		t.Fatalf("callback response too large: %d bytes", len(got))
	}
}
