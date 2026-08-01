// oauth_client.go defines the outbound HTTP middleware every OAuth-backed
// connector reuses. The central piece is OAuthRoundTripper: an
// http.RoundTripper wrapper that injects a fresh vendor Authorization
// header on every request and transparently retries a 401 after forcing
// Core to rotate the stored token.
//
// Why a RoundTripper. Connectors vary wildly in how they talk to their
// vendor — some drive *http.Client directly, others use vendor-specific
// SDKs that expose an http.Client hook. Implementing the retry as a
// RoundTripper means any of those paths gets the same behavior just by
// wrapping its transport, without touching the per-vendor call sites.
//
// Retry semantics. We only retry once, and only on 401. That's enough
// to cover the documented failure mode (vendor revoked mid-flight but
// the token hadn't entered Core's skew window yet). Anything beyond
// one retry would mask real issues — a 401 after a fresh force-refresh
// means the user revoked the grant, not a stale token, and the right
// UX is to surface that to the console for a reconnect prompt.

package common

import (
	"bytes"
	"fmt"
	"io"
	"net/http"

	"irmin-connectors/lib"

	"github.com/gofiber/fiber/v3"
)

// OAuthRoundTripper is the outbound middleware that stamps a vendor
// access token on every request and retries once on 401 with a forced
// refresh. Wrap the connector's existing http.Client transport with
// this once at construction, then let vendor-specific code drive the
// client normally.
//
// The Fiber request context is captured at construction so we can
// propagate cancellations and deadlines into Core's token fetch — the
// inbound operation has a bounded lifetime, and a refresh shouldn't
// outlive it.
type OAuthRoundTripper struct {
	// Base is the transport we wrap; usually http.DefaultTransport or a
	// vendor's pre-configured transport. Must not be nil.
	Base http.RoundTripper

	// OAuth is the embeddable base this round-tripper reads the
	// connection ID and token from. A nil/empty OAuth short-circuits
	// every call to ErrOAuthNotConfigured — static-credential
	// connectors wouldn't install this transport in the first place.
	OAuth *OAuthConnector

	// Ctx is the inbound Fiber context. Captured once so every outbound
	// request (including retries) reads the same X-Irmin-Connection-Id
	// header and uses the operation's context deadline.
	Ctx fiber.Ctx
}

// NewOAuthRoundTripper constructs a RoundTripper wired to the given
// Fiber request. Base defaults to http.DefaultTransport when nil.
func NewOAuthRoundTripper(
	base http.RoundTripper,
	o *OAuthConnector,
	c fiber.Ctx,
) *OAuthRoundTripper {
	if base == nil {
		base = http.DefaultTransport
	}
	return &OAuthRoundTripper{Base: base, OAuth: o, Ctx: c}
}

// WrapHTTPClient returns a new *http.Client whose Transport is an
// OAuthRoundTripper around the input client's transport. Preserves the
// input client's Timeout, CheckRedirect, Jar — only the Transport is
// replaced. Pass nil to start from an empty client.
func WrapHTTPClient(
	client *http.Client,
	o *OAuthConnector,
	c fiber.Ctx,
) *http.Client {
	if client == nil {
		client = &http.Client{}
	}
	wrapped := *client
	wrapped.Transport = NewOAuthRoundTripper(client.Transport, o, c)
	return &wrapped
}

// RoundTrip stamps the Authorization header and, on a 401 response,
// retries once after forcing Core to rotate the stored token.
//
// The retry needs a re-readable request body. We buffer the body once
// at entry so the second attempt can replay it; connectors typically
// send small JSON payloads to vendor APIs so the memory cost is
// negligible. If the body is too large for that tradeoff, the caller
// should set req.GetBody themselves and we'll honor it.
func (rt *OAuthRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	if rt.OAuth == nil {
		return nil, ErrOAuthNotConfigured
	}

	bodyBytes, snapshotErr := snapshotRequestBody(req)
	if snapshotErr != nil {
		return nil, snapshotErr
	}

	firstTok, tokErr := rt.OAuth.ResolveAccessToken(rt.Ctx)
	if tokErr != nil {
		return nil, tokErr
	}
	stampAuthorization(req, firstTok)
	resp, doErr := rt.Base.RoundTrip(req)
	if doErr != nil {
		return nil, doErr
	}
	if resp.StatusCode != http.StatusUnauthorized {
		return resp, nil
	}

	// 401 — the vendor rejected our freshly-minted token. Consume the
	// body to free the connection, then force-refresh and retry once.
	_, _ = io.Copy(io.Discard, resp.Body)
	_ = resp.Body.Close()

	retryReq, retryErr := rebuildRequestForRetry(req, bodyBytes)
	if retryErr != nil {
		return nil, retryErr
	}
	forcedTok, forceErr := rt.OAuth.ForceRefreshAccessToken(rt.Ctx)
	if forceErr != nil {
		return nil, forceErr
	}
	stampAuthorization(retryReq, forcedTok)
	return rt.Base.RoundTrip(retryReq)
}

// snapshotRequestBody reads the full body into memory so we can replay
// it on retry. If the body is nil or http.NoBody we short-circuit —
// GET / DELETE / HEAD never need replay.
//
// Honors req.GetBody when set: that's the supported hook for callers
// with streaming bodies who want retry support without blowing memory.
func snapshotRequestBody(req *http.Request) ([]byte, error) {
	if req.Body == nil || req.Body == http.NoBody {
		return nil, nil
	}
	if req.GetBody != nil {
		// Caller opted into retry-safe streaming; keep their body and
		// let rebuildRequestForRetry call GetBody on attempt 2.
		return nil, nil
	}
	raw, err := io.ReadAll(req.Body)
	if closeErr := req.Body.Close(); closeErr != nil && err == nil {
		err = closeErr
	}
	if err != nil {
		return nil, fmt.Errorf("oauth: buffer request body: %w", err)
	}
	req.Body = io.NopCloser(bytes.NewReader(raw))
	return raw, nil
}

// rebuildRequestForRetry produces a fresh *http.Request with the body
// reset so the retry can be sent. Uses req.Clone rather than mutating
// the original so goroutines that still hold the original pointer
// don't see a mid-flight body swap.
func rebuildRequestForRetry(req *http.Request, bodyBytes []byte) (*http.Request, error) {
	retry := req.Clone(req.Context())
	switch {
	case bodyBytes != nil:
		retry.Body = io.NopCloser(bytes.NewReader(bodyBytes))
	case req.GetBody != nil:
		body, err := req.GetBody()
		if err != nil {
			return nil, fmt.Errorf("oauth: GetBody for retry: %w", err)
		}
		retry.Body = body
	default:
		retry.Body = http.NoBody
	}
	// Drop any residual Authorization so stampAuthorization writes a
	// clean single-valued header on retry.
	retry.Header.Del("Authorization")
	return retry, nil
}

// stampAuthorization writes the vendor token onto the request. Uses
// Set (not Add) so a previous attempt's header is replaced cleanly.
func stampAuthorization(req *http.Request, tok *lib.VendorAccessToken) {
	if tok == nil {
		return
	}
	req.Header.Set("Authorization", tok.AuthorizationHeader())
}

// Ensure OAuthRoundTripper satisfies http.RoundTripper at compile time
// so future refactors can't silently break the interface fit.
var _ http.RoundTripper = (*OAuthRoundTripper)(nil)
