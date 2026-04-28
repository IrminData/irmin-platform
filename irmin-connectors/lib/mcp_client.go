// Package lib — MCP client wiring.
//
// Counterpart to oauth_token_client.go: the OAuth token client gets a
// Bearer access token from Core; this helper turns that token into a
// live MCP client session against a vendor MCP server (e.g.
// mcp.linear.app) using github.com/modelcontextprotocol/go-sdk's
// StreamableClientTransport. The transport accepts a custom
// *http.Client, so we wrap it with an OAuth round-tripper that stamps
// Authorization on every request and retries once on 401 with a forced
// refresh — same behaviour as connectors/common.AsyncOAuthRoundTripper.
//
// See connectors/linear/client/client.go for the consumer side.

package lib

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"regexp"
	"sync"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// vendor401SnippetLimit caps how many bytes of a vendor 401 body we
// capture for diagnostic logging. A vendor's `WWW-Authenticate` /
// JSON error body is small in practice; 512 is comfortably above the
// signal we need to debug audience/scope rejections without dumping
// kilobytes of HTML if a misconfigured endpoint serves a portal page.
const vendor401SnippetLimit = 512

// tokenLikePattern masks values that look like bearer tokens or
// secrets in 401-body diagnostics. Vendors sometimes echo the
// rejected token in the body; the snippet is the diagnostic, not
// the secret. The 40-char floor catches every plausible token shape
// (JWT, opaque base64, hex SHA, etc.) while preserving common JSON
// keys (`error_description` is 17 chars, `Bearer` is 6) so the
// diagnostic stays readable. Separate from connectionoauth's
// redactor because lib can't import that package (import cycle); the
// snippet is already capped tight via vendor401SnippetLimit.
var tokenLikePattern = regexp.MustCompile(
	`[A-Za-z0-9_\-\.]{40,}`,
)

// ErrMCPMissingDeps is returned when NewMCPSession is called with a nil
// token client or zero connectionID. Mirrors AsyncOAuthRoundTripper's
// fail-closed behaviour — better to error early than to send unauth'd
// requests to a vendor MCP server.
var ErrMCPMissingDeps = errors.New(
	"mcp: token client and connection id are required",
)

// mcpClientName / mcpClientVersion identify the connector to the MCP
// server in the initialize handshake. Vendors may log or rate-limit by
// client name, so we identify ourselves clearly. The version is bumped
// alongside the connector so a regression on the connector side can be
// pinpointed in vendor logs.
const (
	mcpClientName    = "irmin-connectors"
	mcpClientVersion = "1.0.0"
)

// NewMCPSession constructs a live MCP client session against the given
// endpoint, using the OAuth token client to authenticate and refresh
// tokens transparently. The returned cleanup func MUST be called when
// the caller is done with the session — it closes the underlying
// transport and releases any standalone-SSE connection.
//
// httpClient is the base transport (typically http.DefaultClient). When
// nil, http.DefaultClient is used. The OAuth round-tripper wraps this
// base, so callers that need custom timeouts or proxies should pass a
// pre-configured client here rather than mutating http.DefaultTransport.
//
// connectionID identifies which Connection's token to fetch — same
// contract as AsyncOAuthRoundTripper.ConnectionID.
//
// logger is used for diagnostic Warn-level events from the round-
// tripper (e.g., second-401-after-refresh body snippet). When nil,
// slog.Default() is used. Tests typically pass slog.New with a discard
// handler to keep test output quiet.
//
// Lifecycle:
//
//  1. NewMCPSession opens the streamable HTTP connection and runs the
//     MCP `initialize` handshake (latency: one round-trip).
//  2. Caller invokes ListTools / CallTool on the returned session.
//  3. Caller invokes the cleanup func, which closes the session.
//
// Errors during initialize bubble up unwrapped so the caller can
// distinguish auth (401 → vendor_error) from transport (DNS / TLS).
func NewMCPSession(
	ctx context.Context,
	endpoint string,
	tokenClient *OAuthTokenClient,
	connectionID uint,
	httpClient *http.Client,
	logger *slog.Logger,
) (*mcp.ClientSession, func(), error) {
	if tokenClient == nil || connectionID == 0 {
		return nil, nil, ErrMCPMissingDeps
	}
	if endpoint == "" {
		return nil, nil, errors.New("mcp: endpoint must not be empty")
	}
	if httpClient == nil {
		httpClient = http.DefaultClient
	}
	if logger == nil {
		logger = slog.Default()
	}

	// Wrap the base http.Client with the OAuth round-tripper before
	// handing it to the MCP transport. We don't reuse
	// common.WrapHTTPClientForJob because that lives in `common`,
	// which already imports lib — pulling it back here would create
	// an import cycle. The wiring is small enough to inline.
	wrapped := *httpClient
	wrapped.Transport = newAsyncOAuthRoundTripperFor(
		httpClient.Transport, tokenClient, connectionID, logger,
	)

	transport := &mcp.StreamableClientTransport{
		Endpoint:   endpoint,
		HTTPClient: &wrapped,
	}

	client := mcp.NewClient(&mcp.Implementation{
		Name:    mcpClientName,
		Version: mcpClientVersion,
	}, nil /* default options */)

	cs, connectErr := client.Connect(ctx, transport, nil)
	if connectErr != nil {
		return nil, nil, fmt.Errorf("mcp: connect %s: %w", endpoint, connectErr)
	}
	return cs, func() { _ = cs.Close() }, nil
}

// newAsyncOAuthRoundTripperFor builds the round-tripper used by the
// MCP transport. Indirected through a free function so a future test
// (or a future common→lib lift of AsyncOAuthRoundTripper) can swap
// the implementation without touching call sites.
func newAsyncOAuthRoundTripperFor(
	base http.RoundTripper,
	tokenClient *OAuthTokenClient,
	connectionID uint,
	logger *slog.Logger,
) http.RoundTripper {
	if base == nil {
		base = http.DefaultTransport
	}
	if logger == nil {
		logger = slog.Default()
	}
	return &mcpOAuthRoundTripper{
		base:         base,
		tokenClient:  tokenClient,
		connectionID: connectionID,
		logger:       logger,
	}
}

// maxReplayBodyBytes caps how much of a request body is buffered for
// 401 replay. Linear MCP tool calls are small JSON args (a few KB at
// most), so a generous 8 MiB ceiling is well above any realistic
// payload while keeping a misconfigured custom mcp_endpoint from
// driving the worker out of memory.
const maxReplayBodyBytes = 8 * 1024 * 1024

// mcpOAuthRoundTripper duplicates connectors/common.AsyncOAuthRoundTripper.
// The duplication exists because lib can't import common (common already
// imports lib for OAuthTokenClient). A future refactor that lifts the
// canonical round-tripper into lib should drop this and route
// newAsyncOAuthRoundTripperFor at the lifted version.
//
// cachedTok holds the most recently fetched bearer token so the hot
// path doesn't pay an extra HTTP round-trip to Core for every MCP
// request. On 401 we force-refresh and replace the cache atomically.
// OAuthTokenClient already caches by connection at the Core boundary,
// but lifting the cache one level eliminates the per-request Core call
// entirely on the success path.
type mcpOAuthRoundTripper struct {
	base         http.RoundTripper
	tokenClient  *OAuthTokenClient
	connectionID uint
	logger       *slog.Logger

	cacheMu   sync.Mutex
	cachedTok *VendorAccessToken
}

// currentToken returns the cached token if present; otherwise it
// fetches one from the token client and caches it. Holding the lock
// across the network call serialises duplicate fetches when many
// goroutines see an empty cache simultaneously.
func (rt *mcpOAuthRoundTripper) currentToken(ctx context.Context) (*VendorAccessToken, error) {
	rt.cacheMu.Lock()
	defer rt.cacheMu.Unlock()
	if rt.cachedTok != nil {
		return rt.cachedTok, nil
	}
	tok, err := rt.tokenClient.FetchVendorAccessToken(ctx, rt.connectionID)
	if err != nil {
		return nil, err
	}
	rt.cachedTok = tok
	return tok, nil
}

// rotateToken force-refreshes via the token client and replaces the
// cache. Called only after a 401 surfaces from the vendor.
func (rt *mcpOAuthRoundTripper) rotateToken(ctx context.Context) (*VendorAccessToken, error) {
	rt.cacheMu.Lock()
	defer rt.cacheMu.Unlock()
	tok, err := rt.tokenClient.ForceRefreshVendorAccessToken(ctx, rt.connectionID)
	if err != nil {
		// Drop the stale cache so the next request retries from scratch
		// rather than reusing a token the vendor already rejected.
		rt.cachedTok = nil
		return nil, err
	}
	rt.cachedTok = tok
	return tok, nil
}

func (rt *mcpOAuthRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	// Fail closed on a misconstructed round-tripper. NewMCPSession
	// already checks these, but mirroring AsyncOAuthRoundTripper's
	// guard means any future direct construction can't silently
	// nil-deref on FetchVendorAccessToken.
	if rt.tokenClient == nil || rt.connectionID == 0 {
		return nil, ErrMCPMissingDeps
	}
	// Snapshot the body upfront so we can replay it on retry.
	// http.Request.Body is single-use; the MCP SDK may submit a
	// streaming body via GetBody (which is the supported retry hook)
	// or a static body — handle both.
	bodyBytes, snapErr := snapshotRequestBodyForReplay(req)
	if snapErr != nil {
		return nil, snapErr
	}

	firstTok, tokErr := rt.currentToken(req.Context())
	if tokErr != nil {
		return nil, tokErr
	}
	req.Header.Set("Authorization", firstTok.AuthorizationHeader())

	resp, doErr := rt.base.RoundTrip(req)
	if doErr != nil {
		return nil, doErr
	}
	if resp.StatusCode != http.StatusUnauthorized {
		return resp, nil
	}

	// 401 — capture a redacted snippet of the body for diagnostics
	// before draining, then force-refresh and retry once. The snippet
	// surfaces in connector logs so an operator can distinguish
	// "vendor rejected the token" (transient — retry refreshes it)
	// from "vendor rejected the request shape" (permanent — points
	// at audience/scope/header misconfiguration that no refresh
	// fixes). Mirrors common.AsyncOAuthRoundTripper's drain semantic.
	first401Snippet := captureVendor401Snippet(resp)
	_ = resp.Body.Close()

	retryReq, rebuildErr := rebuildRequestForRetry(req, bodyBytes)
	if rebuildErr != nil {
		return nil, rebuildErr
	}
	forcedTok, forceErr := rt.rotateToken(req.Context())
	if forceErr != nil {
		return nil, forceErr
	}
	retryReq.Header.Set("Authorization", forcedTok.AuthorizationHeader())
	retryResp, retryErr := rt.base.RoundTrip(retryReq)
	if retryErr != nil {
		return nil, retryErr
	}
	if retryResp.StatusCode == http.StatusUnauthorized {
		// Both attempts 401. The post-refresh token is fresh by
		// definition, so a second 401 means the rejection isn't
		// about token freshness — it's audience, scope, or some
		// other request-shape issue. Log both bodies plus a
		// non-secret summary of the token shape we sent so an
		// operator can see whether the round-tripper actually
		// attached a bearer (and that it has a plausible shape)
		// without the token value ever entering logs.
		second401Snippet := captureVendor401Snippet(retryResp)
		rt.logger.Warn("mcp: vendor returned 401 on both initial and post-refresh attempts",
			"endpoint", retryReq.URL.String(),
			"connection_id", rt.connectionID,
			"first_401_snippet", first401Snippet,
			"second_401_snippet", second401Snippet,
			"sent_token_type", forcedTok.TokenType,
			"sent_token_length", len(forcedTok.Value),
			"sent_token_scope", forcedTok.Scope,
		)
		// Restore the body for the SDK to consume normally.
		retryResp.Body = io.NopCloser(bytes.NewReader([]byte(second401Snippet)))
	}
	return retryResp, nil
}

// captureVendor401Snippet reads up to vendor401SnippetLimit bytes of
// the response body, redacts token-like substrings, and returns the
// scrubbed result. The body is drained as a side effect — caller
// should restore it via io.NopCloser if the SDK still needs to read
// it downstream.
func captureVendor401Snippet(resp *http.Response) string {
	if resp == nil || resp.Body == nil {
		return ""
	}
	limited := io.LimitReader(resp.Body, vendor401SnippetLimit+1)
	raw, err := io.ReadAll(limited)
	if err != nil {
		return fmt.Sprintf("<read error: %v>", err)
	}
	if len(raw) > vendor401SnippetLimit {
		raw = append(raw[:vendor401SnippetLimit], []byte("…")...)
	}
	// Redact anything resembling a token (long base64-ish run). The
	// snippet is for diagnostics only; we never want it to become a
	// secondary leak channel for the bearer we just sent.
	return tokenLikePattern.ReplaceAllString(string(raw), "<REDACTED>")
}

// snapshotRequestBodyForReplay buffers req.Body so the same bytes can
// be replayed on a 401 retry. Honors req.GetBody (the SDK's
// retry-safe hook for streaming bodies) by returning a nil snapshot —
// rebuildRequestForRetry will call GetBody to produce the retry body.
// Inlined (rather than imported from common) to keep lib's import
// surface minimal; identical behaviour to the helper in
// connectors/common/oauth_client.go.
//
// Caps the buffered body at maxReplayBodyBytes. MCP tool-call bodies
// are small JSON args; a body that crosses the cap is almost certainly
// a misconfiguration (mcp_endpoint pointed at a non-MCP service that
// streams a large response we then try to mirror). Failing the
// snapshot keeps a single bad request from OOMing the worker.
func snapshotRequestBodyForReplay(req *http.Request) ([]byte, error) {
	if req.Body == nil || req.Body == http.NoBody {
		return nil, nil
	}
	if req.GetBody != nil {
		return nil, nil
	}
	limited := io.LimitReader(req.Body, maxReplayBodyBytes+1)
	raw, err := io.ReadAll(limited)
	if closeErr := req.Body.Close(); closeErr != nil && err == nil {
		err = closeErr
	}
	if err != nil {
		return nil, fmt.Errorf("mcp: buffer request body: %w", err)
	}
	if len(raw) > maxReplayBodyBytes {
		return nil, fmt.Errorf(
			"mcp: request body exceeds %d-byte cap for 401 replay; "+
				"check mcp_endpoint targets a real MCP server",
			maxReplayBodyBytes,
		)
	}
	req.Body = io.NopCloser(bytes.NewReader(raw))
	return raw, nil
}

// rebuildRequestForRetry produces a fresh *http.Request whose body is
// reset so the retry can be sent. Uses req.Clone rather than mutating
// the original so goroutines that still hold the original pointer
// don't see a mid-flight body swap. Drops any residual Authorization
// so the caller's Set writes a clean single-valued header on retry.
func rebuildRequestForRetry(req *http.Request, bodyBytes []byte) (*http.Request, error) {
	retry := req.Clone(req.Context())
	switch {
	case bodyBytes != nil:
		retry.Body = io.NopCloser(bytes.NewReader(bodyBytes))
	case req.GetBody != nil:
		body, err := req.GetBody()
		if err != nil {
			return nil, fmt.Errorf("mcp: GetBody for retry: %w", err)
		}
		retry.Body = body
	default:
		retry.Body = http.NoBody
	}
	retry.Header.Del("Authorization")
	return retry, nil
}

// Verify shape at compile time.
var _ http.RoundTripper = (*mcpOAuthRoundTripper)(nil)
