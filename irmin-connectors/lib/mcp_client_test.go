// Internal tests for the MCP client wrapper. These exercise the
// scaffolding (auth gate, endpoint validation, round-tripper wiring) but
// do NOT test against a real MCP server — that's the connector's job.
// The acceptance test for end-to-end OAuth + MCP lives in
// connectors/linear/client/oauth_acceptance_test.go.
//
//nolint:testpackage // intentional internal test for unexported helpers
package lib

import (
	"bytes"
	"context"
	"errors"
	"io"
	"net/http"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"irmin-connectors/connectors/common/commontest"
)

func TestNewMCPSessionRequiresTokenClient(t *testing.T) {
	_, _, err := NewMCPSession(context.Background(), "https://example.com", nil, 1, nil, nil)
	if !errors.Is(err, ErrMCPMissingDeps) {
		t.Fatalf("got %v, want ErrMCPMissingDeps", err)
	}
}

func TestNewMCPSessionRequiresConnectionID(t *testing.T) {
	tc := NewOAuthTokenClient("https://core.example", "tok")
	_, _, err := NewMCPSession(context.Background(), "https://example.com", tc, 0, nil, nil)
	if !errors.Is(err, ErrMCPMissingDeps) {
		t.Fatalf("got %v, want ErrMCPMissingDeps", err)
	}
}

func TestNewMCPSessionRequiresEndpoint(t *testing.T) {
	tc := NewOAuthTokenClient("https://core.example", "tok")
	_, _, err := NewMCPSession(context.Background(), "", tc, 1, nil, nil)
	if err == nil || err.Error() == "" {
		t.Fatalf("empty endpoint must error, got %v", err)
	}
}

// roundTripperFunc adapts a function to http.RoundTripper. Local copy
// to avoid pulling more imports than the small surface needs.
type roundTripperFunc func(*http.Request) (*http.Response, error)

func (f roundTripperFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}

// TestMCPRoundTripper_NoInfiniteRetryOn401 pins the cap-at-one-retry
// invariant. Without it, a vendor that holds the connection in a
// permanent 401 state could drive the round-tripper through unbounded
// recursive force-refreshes, hammering Core for the user's token
// every cycle. The retry must surface the second 401 cleanly and
// stop.
func TestMCPRoundTripper_NoInfiniteRetryOn401(t *testing.T) {
	t.Parallel()
	core := commontest.NewFakeCore(t, "sys-tok", "access-1", "access-2")
	tc := NewOAuthTokenClient(core.BaseURL(), "sys-tok")

	var calls atomic.Int32
	base := roundTripperFunc(func(_ *http.Request) (*http.Response, error) {
		calls.Add(1)
		// Always 401 — the round-tripper must force-refresh once and
		// then surface the second 401 without recursing.
		return &http.Response{
			StatusCode: http.StatusUnauthorized,
			Body:       io.NopCloser(strings.NewReader("nope")),
			Header:     make(http.Header),
		}, nil
	})

	rt := newAsyncOAuthRoundTripperFor(base, tc, 7, nil)
	req, _ := http.NewRequestWithContext(
		context.Background(), http.MethodPost, "https://example/x",
		bytes.NewReader([]byte(`{}`)),
	)

	done := make(chan struct{})
	var resp *http.Response
	var err error
	go func() {
		resp, err = rt.RoundTrip(req)
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("infinite-retry guard failed: round-tripper never returned")
	}
	if err != nil {
		t.Fatalf("RoundTrip returned err %v, want surfaced 401 response", err)
	}
	if resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("status = %d, want 401 surfaced", resp.StatusCode)
	}
	if got := calls.Load(); got != 2 {
		t.Errorf("base RoundTrip called %d times, want exactly 2 (initial + one retry)", got)
	}
	if got := core.ForceCalls(); got != 1 {
		t.Errorf("force-refresh called %d times, want exactly 1", got)
	}
}
