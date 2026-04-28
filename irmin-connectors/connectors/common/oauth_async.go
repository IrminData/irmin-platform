// oauth_async.go is the async-job equivalent of OAuthRoundTripper /
// WrapHTTPClient. The synchronous variants in oauth_client.go capture
// a fiber.Ctx at construction so they can read X-Irmin-Connection-Id
// on every retry. That doesn't work for connectors whose vendor I/O
// runs inside a JobManager worker — by the time the worker runs,
// fiber.Ctx is no longer alive and dereferencing it crashes.
//
// AsyncOAuthRoundTripper takes the connection ID as a plain uint
// (captured up-front in the request handler), uses each request's own
// context for cancellation, and otherwise behaves exactly like the
// synchronous variant: stamp Authorization, retry once on 401 after
// forcing Core to rotate.

package common

import (
	"errors"
	"io"
	"net/http"

	"irmin-connectors/lib"
)

// AsyncOAuthRoundTripper is the worker-safe outbound middleware. Wrap
// the connector's *http.Client transport with this once at the start
// of the worker, then drive the client normally — no fiber.Ctx
// required.
type AsyncOAuthRoundTripper struct {
	// Base is the transport we wrap. Must not be nil after construction
	// (NewAsyncOAuthRoundTripper installs http.DefaultTransport when
	// the caller passes nil).
	Base http.RoundTripper

	// TokenClient talks to Core's internal access-token endpoint. Same
	// instance the OAuthConnector base holds — workers reach for it via
	// (*OAuthConnector).TokenClient at request time and pass it here.
	TokenClient *lib.OAuthTokenClient

	// ConnectionID identifies which Connection's token to fetch on
	// every outbound request. Captured from the inbound fiber.Ctx in
	// the handler before the worker is launched; never changes during
	// the worker's lifetime.
	ConnectionID uint
}

// ErrAsyncOAuthMissingDeps is returned when the round-tripper is
// constructed without a token client or with a zero connection ID.
// Surfaces a wiring bug rather than a transient failure.
var ErrAsyncOAuthMissingDeps = errors.New(
	"oauth_async: token client or connection id not configured",
)

// NewAsyncOAuthRoundTripper constructs a round-tripper for the given
// connection. Base defaults to http.DefaultTransport when nil.
func NewAsyncOAuthRoundTripper(
	base http.RoundTripper,
	tc *lib.OAuthTokenClient,
	connectionID uint,
) *AsyncOAuthRoundTripper {
	if base == nil {
		base = http.DefaultTransport
	}
	return &AsyncOAuthRoundTripper{Base: base, TokenClient: tc, ConnectionID: connectionID}
}

// WrapHTTPClientForJob returns a new *http.Client whose Transport is
// an AsyncOAuthRoundTripper around the input client's transport.
// Mirrors WrapHTTPClient (the sync variant) but takes the connection
// ID + token client directly so the result is safe to use inside a
// worker goroutine.
func WrapHTTPClientForJob(
	client *http.Client,
	tc *lib.OAuthTokenClient,
	connectionID uint,
) *http.Client {
	if client == nil {
		client = &http.Client{}
	}
	wrapped := *client
	wrapped.Transport = NewAsyncOAuthRoundTripper(client.Transport, tc, connectionID)
	return &wrapped
}

// RoundTrip stamps Authorization and retries once on 401 with a
// forced refresh, mirroring OAuthRoundTripper but driven from
// req.Context() instead of a captured fiber.Ctx.
func (rt *AsyncOAuthRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	if rt.TokenClient == nil || rt.ConnectionID == 0 {
		return nil, ErrAsyncOAuthMissingDeps
	}

	bodyBytes, snapshotErr := snapshotRequestBody(req)
	if snapshotErr != nil {
		return nil, snapshotErr
	}

	firstTok, tokErr := rt.TokenClient.FetchVendorAccessToken(req.Context(), rt.ConnectionID)
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

	// 401 — drain + close, then force-refresh and retry once.
	_, _ = io.Copy(io.Discard, resp.Body)
	_ = resp.Body.Close()

	retryReq, retryErr := rebuildRequestForRetry(req, bodyBytes)
	if retryErr != nil {
		return nil, retryErr
	}
	forcedTok, forceErr := rt.TokenClient.ForceRefreshVendorAccessToken(req.Context(), rt.ConnectionID)
	if forceErr != nil {
		return nil, forceErr
	}
	stampAuthorization(retryReq, forcedTok)
	return rt.Base.RoundTrip(retryReq)
}

// Verify shape at compile time — same convention as the sync variant.
var _ http.RoundTripper = (*AsyncOAuthRoundTripper)(nil)
