// Package commontest hosts test fixtures for the OAuth connector base.
// It lives in its own subpackage so production code in
// connectors/common never imports test servers, and so concrete
// connectors (Stripe, Linear, Google Drive when they land) can reuse
// the same fixtures without copy-paste.
//
// The two servers below simulate the smallest possible slice of Core +
// vendor behavior an OAuth-backed connector needs to be exercised
// end-to-end:
//
//   - FakeCore serves Core's POST /api/v1/system/oauth/access-token
//     endpoint, including the Phase 3 force_refresh flag. It rotates
//     its "stored" token when forced so tests can assert the retry
//     actually reached Core.
//   - FakeVendor serves an arbitrary vendor API endpoint with
//     configurable per-request behavior — most usefully, "reject the
//     first request with 401, then accept the second after the caller
//     force-refreshed."
//
// Together they let a test drive the OAuthRoundTripper through the
// retry loop without a single mock; every I/O path hits a real
// httptest server.
package commontest

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
)

// --- FakeCore ----------------------------------------------------------------

// FakeCore is an in-process stand-in for Irmin Core's internal
// access-token endpoint. The zero value is not useful; call NewFakeCore.
//
// The server honors the force_refresh flag: when true, it swaps its
// "stored" token for the next pre-seeded value. Tests use this to
// assert the retry path actually forced Core to rotate rather than
// silently replaying the lazy-cached token.
type FakeCore struct {
	// Server is the underlying httptest.Server. Callers read its URL
	// to configure an OAuthTokenClient.
	Server *httptest.Server

	// SystemToken is the Bearer token the server expects in the
	// Authorization header. Requests missing or mismatching it get 401.
	SystemToken string

	mu sync.Mutex
	// tokens is the queue of access_token values the server hands out.
	// Index 0 is the lazy-path response; force_refresh calls advance
	// the index so each force-refresh sees a distinct token.
	tokens []string
	// served records the last token handed out, for assertions.
	served string
	// callsLazy and callsForce count the two paths for test assertions.
	callsLazy  int
	callsForce int
}

// NewFakeCore starts an httptest server pre-seeded with the given
// sequence of access-token values. The first is returned on lazy
// fetches; each force_refresh:true call advances to the next one.
//
// systemToken is the Bearer credential the server will check for on
// inbound requests; supply the same value to NewOAuthTokenClient so
// the signing round-trips match.
func NewFakeCore(t *testing.T, systemToken string, tokenSequence ...string) *FakeCore {
	t.Helper()
	fc := &FakeCore{
		SystemToken: systemToken,
		tokens:      append([]string{}, tokenSequence...),
	}
	fc.Server = httptest.NewServer(http.HandlerFunc(fc.handle))
	t.Cleanup(fc.Server.Close)
	return fc
}

// BaseURL returns the server's root URL for passing into
// NewOAuthTokenClient.
func (fc *FakeCore) BaseURL() string { return fc.Server.URL }

// LazyCalls returns the number of non-force access-token fetches served.
func (fc *FakeCore) LazyCalls() int {
	fc.mu.Lock()
	defer fc.mu.Unlock()
	return fc.callsLazy
}

// ForceCalls returns the number of force_refresh:true fetches served.
func (fc *FakeCore) ForceCalls() int {
	fc.mu.Lock()
	defer fc.mu.Unlock()
	return fc.callsForce
}

// LastServedToken returns the value of the most recent access_token
// the server handed out. Handy for assertions that verify the
// round-tripper actually stamped the right header.
func (fc *FakeCore) LastServedToken() string {
	fc.mu.Lock()
	defer fc.mu.Unlock()
	return fc.served
}

// handle is the access-token endpoint implementation. Kept small so
// tests can read it as documentation of the contract the real Core
// endpoint honors.
func (fc *FakeCore) handle(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/api/v1/system/oauth/access-token" {
		http.NotFound(w, r)
		return
	}
	if r.Header.Get("Authorization") != "Bearer "+fc.SystemToken {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var req struct {
		ConnectionID uint `json:"connection_id"`
		ForceRefresh bool `json:"force_refresh"`
	}
	body, _ := io.ReadAll(r.Body)
	if err := json.Unmarshal(body, &req); err != nil {
		http.Error(w, "bad json", http.StatusBadRequest)
		return
	}
	if req.ConnectionID == 0 {
		http.Error(w, "connection_id required", http.StatusBadRequest)
		return
	}
	fc.mu.Lock()
	defer fc.mu.Unlock()
	if req.ForceRefresh {
		fc.callsForce++
		// Advance the queue so the next token served is distinct. If
		// the queue runs dry, reuse the last-known value — real Core
		// just re-serves whatever the vendor last returned.
		if len(fc.tokens) > 1 {
			fc.tokens = fc.tokens[1:]
		}
	} else {
		fc.callsLazy++
	}
	if len(fc.tokens) == 0 {
		http.Error(w, "no tokens seeded", http.StatusInternalServerError)
		return
	}
	fc.served = fc.tokens[0]
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"data": map[string]any{
			"access_token": fc.served,
			"token_type":   "Bearer",
		},
	})
}

// --- FakeVendor --------------------------------------------------------------

// FakeVendor is an in-process stand-in for a vendor API. The behavior
// per request is caller-configurable via SetHandler; the default
// handler rejects everything until explicitly wired.
//
// The server keeps a running count of the Authorization headers it
// saw, so tests can assert both "did the first call carry access-1"
// and "did the retry carry access-2 (the force-refreshed value)."
type FakeVendor struct {
	Server *httptest.Server

	mu            sync.Mutex
	authsObserved []string
	handler       http.HandlerFunc
}

// NewFakeVendor starts an httptest server with a no-op default handler.
// Call SetHandler to install the behavior a given test wants.
func NewFakeVendor(t *testing.T) *FakeVendor {
	t.Helper()
	fv := &FakeVendor{
		handler: func(w http.ResponseWriter, _ *http.Request) {
			http.Error(w, "no handler installed", http.StatusTeapot)
		},
	}
	fv.Server = httptest.NewServer(http.HandlerFunc(fv.handle))
	t.Cleanup(fv.Server.Close)
	return fv
}

// URL returns the vendor's root URL. Tests use this as the base for
// any vendor-bound request they drive through the round-tripper.
func (fv *FakeVendor) URL() string { return fv.Server.URL }

// SetHandler replaces the active request handler atomically. Safe to
// call mid-test to flip behavior between scenarios (e.g., first run
// returns 401, next run returns 200).
func (fv *FakeVendor) SetHandler(h http.HandlerFunc) {
	fv.mu.Lock()
	fv.handler = h
	fv.mu.Unlock()
}

// AuthHeaders returns a snapshot of the Authorization header values
// every inbound request carried, in arrival order. Callers assert on
// this to prove the round-tripper stamped the right token on each
// attempt (first = cached, second = force-refreshed).
func (fv *FakeVendor) AuthHeaders() []string {
	fv.mu.Lock()
	defer fv.mu.Unlock()
	out := make([]string, len(fv.authsObserved))
	copy(out, fv.authsObserved)
	return out
}

// RejectOnceThenAccept installs a handler that 401s the first request
// and 200s every subsequent one. The canonical "vendor revoked the
// token mid-flight" scenario the retry loop exists to handle.
func (fv *FakeVendor) RejectOnceThenAccept(successBody string) {
	var calls int
	var mu sync.Mutex
	fv.SetHandler(func(w http.ResponseWriter, _ *http.Request) {
		mu.Lock()
		calls++
		isFirst := calls == 1
		mu.Unlock()
		if isFirst {
			http.Error(w, "vendor: token rejected", http.StatusUnauthorized)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, successBody)
	})
}

// AlwaysReject installs a handler that returns 401 unconditionally.
// Mirrors the "user revoked the app at the vendor" terminal state —
// the retry loop hits it, force-refreshes, retries, and still gets
// 401; the connector should then surface the failure.
func (fv *FakeVendor) AlwaysReject() {
	fv.SetHandler(func(w http.ResponseWriter, _ *http.Request) {
		http.Error(w, "vendor: token rejected", http.StatusUnauthorized)
	})
}

// handle is the internal request entry point. It records the auth
// header and delegates to the currently-installed handler. The handler
// is responsible for reading r.Body if it cares; we deliberately don't
// drain it here because future Stripe/Linear/Google Drive test suites
// will inspect request bodies (idempotency keys, JSON-Patch ops,
// uploaded blobs) and a pre-handler drain would silently hand them
// empty bytes.
func (fv *FakeVendor) handle(w http.ResponseWriter, r *http.Request) {
	fv.mu.Lock()
	fv.authsObserved = append(fv.authsObserved, r.Header.Get("Authorization"))
	h := fv.handler
	fv.mu.Unlock()
	h(w, r)
}

// --- misc helpers ------------------------------------------------------------

// ReadBody returns the response body as a string. Wraps the usual
// io.ReadAll + Close dance tests otherwise repeat a dozen times.
func ReadBody(t *testing.T, resp *http.Response) string {
	t.Helper()
	defer func() { _ = resp.Body.Close() }()
	b, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}
	return string(bytes.TrimSpace(b))
}
