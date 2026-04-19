// Package lib contains server-side helpers shared across every connector
// implementation. oauth_token_client.go holds the HTTP client an
// OAuth-backed connector uses to fetch a fresh vendor access token from
// Irmin Core's internal /api/v1/system/oauth/access-token endpoint.
//
// The design principle is that the connectors service never persists
// vendor tokens — Core is the single source of truth and serialises
// refresh via row locks. On every vendor-bound request the connector
// calls FetchVendorAccessToken(ctx, connectionID), which returns a
// currently-valid bearer token. The cost is negligible: Core's fast
// path returns the cached token without hitting the vendor, and refresh
// only fires when the token is within the configured skew window.
//
// Wire contract:
//
//  1. The connector reads the X-Irmin-Connection-Id header on inbound
//     operation requests; that identifies which Connection this operation
//     belongs to. The header name is exported as
//     connectorsclient.HeaderConnectionID in irmin/ for the Core side;
//     connectors-side it's the literal string below.
//  2. The connector calls Core at
//     POST {IRMIN_API_BASE_URL}/api/v1/system/oauth/access-token
//     with Authorization: Bearer {IRMIN_API_TOKEN} and the JSON body
//     {"connection_id": <uint>}.
//  3. Core responds 200 with {"data": {"access_token": "...",
//     "token_type": "...", "expires_at": "...", "scope": "..."}}.
//
// Failure modes are translated to sentinel errors so callers can surface
// the right UX:
//
//   - ErrNotConnected: the Connection has no OAuth token row. The user
//     must (re)connect through the console.
//   - ErrRefreshRejected: Core's refresh call to the vendor failed (user
//     likely revoked the app). Same UX: prompt reconnect.
//   - ErrCoreUnavailable: Core is unreachable or returned 5xx — transient,
//     retry later.
//
// All other non-2xx responses collapse to a wrapped fmt-error so callers
// can decide between bubbling up or logging and continuing.
package lib

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// HeaderConnectionID is the header Core stamps on every outbound
// connector request to identify the Connection this operation is for.
// Exported so handler code can read it with c.Get(lib.HeaderConnectionID).
//
// The canonical form matches Go's http.Header canonicalisation rules; do
// not rename without updating irmin/connectors-client/client.go in
// lockstep — it's the cross-service wire contract.
const HeaderConnectionID = "X-Irmin-Connection-Id"

// Internal transport constants. Kept as named constants rather than
// literals so the numbers aren't magic and are trivial to tune.
const (
	// coreHTTPTimeoutSeconds bounds how long a single access-token
	// fetch can take. Core's fast path is milliseconds; a slow refresh
	// that hits the vendor may push near 30s, but no further.
	coreHTTPTimeoutSeconds = 30

	// bodyReadLimit caps the number of bytes we read from Core's
	// response. Sized generously to accommodate JWT-format access
	// tokens — Google and Azure AD can issue 4–8 KB tokens, and the
	// response envelope also carries token_type, expires_at, scope.
	// 64 KiB is comfortably above any real payload while still
	// protecting us from a pathological response that could otherwise
	// exhaust memory during log capture.
	bodyReadLimit = 64 * 1024

	// errorSnippetLimit is the maximum length of a Core response body
	// preview included in unexpected-status error messages.
	errorSnippetLimit = 200
)

// Sentinel errors for the small set of failure modes connector handlers
// need to distinguish. Anything else is returned as a wrapped error.
var (
	// ErrNotConnected means the Connection has never completed OAuth, or
	// its token was revoked. Connector handlers should surface a
	// "reconnect required" response so the UI can guide the user.
	ErrNotConnected = errors.New("oauth: connection has no access token")

	// ErrRefreshRejected means the vendor rejected Core's refresh
	// attempt. Usually indicates the user revoked the app at the vendor.
	// Same UX as ErrNotConnected: prompt reconnect.
	ErrRefreshRejected = errors.New("oauth: vendor rejected refresh token")

	// ErrCoreUnavailable means Core itself is unreachable or unhealthy.
	// Callers should treat this as transient and retry with backoff.
	ErrCoreUnavailable = errors.New("oauth: irmin core is unavailable")

	// ErrMissingConnectionHeader is returned by ConnectionIDFromRequest
	// when the inbound request lacks X-Irmin-Connection-Id. OAuth-backed
	// connectors should 400 the caller in this case — Core must always
	// stamp the header for OAuth connectors.
	ErrMissingConnectionHeader = errors.New(
		"oauth: " + HeaderConnectionID + " header missing or invalid",
	)
)

// OAuthTokenClient talks to Core's internal access-token endpoint. One
// instance per connector process; safe for concurrent use.
//
// Construction is intentionally minimal — CoreBaseURL + SystemToken are
// the only required pieces and both live in the existing
// IRMIN_API_BASE_URL / IRMIN_API_TOKEN env vars.
type OAuthTokenClient struct {
	// CoreBaseURL is the full base URL of Core, e.g.
	// "https://api.irmin.dev" (no trailing slash, no /api/v1 prefix —
	// the path is appended below).
	CoreBaseURL string

	// SystemToken is the connector registration's system token that Core
	// recognises as a trusted internal caller. Same value the connector
	// uses for all other system-authenticated calls back to Core.
	SystemToken string

	// HTTPClient is the underlying transport. When nil, a client with a
	// 30-second timeout is used. Tests inject their own to stub the
	// endpoint via httptest.
	HTTPClient *http.Client
}

// NewOAuthTokenClient returns a client wired with a sensible default
// timeout. Callers that need custom retries, TLS config, or proxy
// handling can assign .HTTPClient after construction.
func NewOAuthTokenClient(coreBaseURL, systemToken string) *OAuthTokenClient {
	return &OAuthTokenClient{
		CoreBaseURL: strings.TrimRight(coreBaseURL, "/"),
		SystemToken: systemToken,
		HTTPClient:  &http.Client{Timeout: coreHTTPTimeoutSeconds * time.Second},
	}
}

// VendorAccessToken is the subset of fields a connector actually uses
// when authenticating against a vendor API. Mirrors Core's
// systemAccessTokenResponse so the JSON unmarshal is a direct map.
type VendorAccessToken struct {
	Value     string     `json:"access_token"`
	TokenType string     `json:"token_type"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
	Scope     string     `json:"scope,omitempty"`
}

// AuthorizationHeader returns the exact value a connector should set on
// outbound vendor requests, e.g. "Bearer ya29...". Uses "Bearer" when
// the vendor omitted token_type, matching OAuth 2.0 §5.1 convention.
func (t *VendorAccessToken) AuthorizationHeader() string {
	typ := t.TokenType
	if typ == "" {
		typ = "Bearer"
	}
	return typ + " " + t.Value
}

// FetchVendorAccessToken asks Core for a currently-valid vendor token
// for the given Connection. Core transparently refreshes if the stored
// token is inside its expiry skew window.
//
// Idempotent and safe to call on every vendor-bound request; the fast
// path is a single small HTTPS round-trip to Core with no vendor I/O.
func (c *OAuthTokenClient) FetchVendorAccessToken(
	ctx context.Context,
	connectionID uint,
) (*VendorAccessToken, error) {
	if connectionID == 0 {
		return nil, ErrMissingConnectionHeader
	}
	if c.CoreBaseURL == "" || c.SystemToken == "" {
		return nil, fmt.Errorf("%w: client not configured", ErrCoreUnavailable)
	}

	body, marshalErr := json.Marshal(map[string]uint{"connection_id": connectionID})
	if marshalErr != nil {
		return nil, fmt.Errorf("oauth: marshal request: %w", marshalErr)
	}
	url := c.CoreBaseURL + "/api/v1/system/oauth/access-token"
	req, reqErr := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if reqErr != nil {
		return nil, fmt.Errorf("oauth: build request: %w", reqErr)
	}
	req.Header.Set("Authorization", "Bearer "+c.SystemToken)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	client := c.HTTPClient
	if client == nil {
		client = http.DefaultClient
	}
	resp, doErr := client.Do(req)
	if doErr != nil {
		return nil, fmt.Errorf("%w: %w", ErrCoreUnavailable, doErr)
	}
	defer func() { _ = resp.Body.Close() }()

	return parseAccessTokenResponse(resp)
}

// parseAccessTokenResponse maps Core's HTTP responses onto either a
// VendorAccessToken or one of the package sentinels. Extracted from the
// request method so it's unit-testable with a fabricated response and
// to keep FetchVendorAccessToken focused on transport concerns.
func parseAccessTokenResponse(resp *http.Response) (*VendorAccessToken, error) {
	raw, readErr := io.ReadAll(io.LimitReader(resp.Body, bodyReadLimit))
	if readErr != nil {
		return nil, fmt.Errorf("oauth: read response: %w", readErr)
	}

	switch {
	case resp.StatusCode == http.StatusNotFound:
		// Core returns 404 when no token row exists for the connection.
		return nil, ErrNotConnected
	case resp.StatusCode == http.StatusUnauthorized:
		// Core uses 401 when the vendor rejected its refresh attempt.
		return nil, ErrRefreshRejected
	case resp.StatusCode >= http.StatusInternalServerError:
		return nil, fmt.Errorf("%w: core returned %d", ErrCoreUnavailable, resp.StatusCode)
	case resp.StatusCode < 200 || resp.StatusCode >= 300:
		return nil, fmt.Errorf(
			"oauth: unexpected core response %d: %s",
			resp.StatusCode,
			truncate(raw, errorSnippetLimit),
		)
	}

	var envelope struct {
		Data *VendorAccessToken `json:"data"`
	}
	if unmarshalErr := json.Unmarshal(raw, &envelope); unmarshalErr != nil {
		return nil, fmt.Errorf("oauth: parse response: %w", unmarshalErr)
	}
	if envelope.Data == nil || envelope.Data.Value == "" {
		return nil, errors.New("oauth: core response missing access token")
	}
	return envelope.Data, nil
}

// ConnectionIDFromRequestHeader reads the X-Irmin-Connection-Id header
// from the given getter and returns the numeric Connection ID. The
// getter is any fiber.Ctx.Get-shaped function, so this helper works for
// both the fiber.Ctx and http.Request paths without forcing a direct
// Fiber dependency in every connector.
func ConnectionIDFromRequestHeader(getHeader func(string) string) (uint, error) {
	raw := strings.TrimSpace(getHeader(HeaderConnectionID))
	if raw == "" {
		return 0, ErrMissingConnectionHeader
	}
	parsed, parseErr := strconv.ParseUint(raw, 10, 64)
	if parseErr != nil || parsed == 0 {
		return 0, ErrMissingConnectionHeader
	}
	return uint(parsed), nil
}

// truncate returns at most n bytes of b as a string, for embedding in
// error messages without accidentally dumping kilobytes of HTML.
func truncate(b []byte, n int) string {
	if len(b) > n {
		return string(b[:n])
	}
	return string(b)
}
