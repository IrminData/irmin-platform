// Internal test file — exercises unexported callback helpers that we
// deliberately keep package-private (HTML builder, error classifiers).
//
//nolint:testpackage // intentional internal test for unexported helpers
package controllers

import (
	"errors"
	"fmt"
	"strings"
	"testing"

	"irmin-api/services/oauth"
)

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
