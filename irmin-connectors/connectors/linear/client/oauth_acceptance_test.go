package linearclient_test

// This is the OAuth roadmap's Phase-4 acceptance test for the Linear
// connector: a real MCP server fixture, the shared FakeCore, and the
// OAuth round-tripper inside lib.NewMCPSession, exercising the canonical
// "vendor-revoked-mid-flight" recovery path end-to-end without mocks.
// Mirrors connectors/common/oauth_fake_vendor_test.go.
//
// The retry path here is at the HTTP transport layer: the OAuth round-
// tripper sits between the MCP SDK's StreamableClientTransport and the
// network. When the vendor 401s an outbound MCP request (e.g., the
// initialize handshake), the round-tripper drains, asks Core to rotate
// the bearer, and replays the request once. The MCP SDK never sees the
// 401 — it sees a clean 200 with a fresh session.
//
// The test stubs the Linear MCP server with httptest + the SDK's
// NewStreamableHTTPHandler, then puts a 401-on-first-request middleware
// in front so the round-tripper observes the rotation trigger.

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"

	"irmin-connectors/connectors/common/commontest"
	linearclient "irmin-connectors/connectors/linear/client"
	"irmin-connectors/lib"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// vendorOnce401 wraps an MCP HTTP handler with a one-shot 401. The
// first POST hits the gate and returns 401 with the auth header
// recorded; every subsequent request passes through to the real MCP
// handler so the SDK can complete its handshake and tool call.
type vendorOnce401 struct {
	mu       sync.Mutex
	calls    int
	auths    []string
	upstream http.Handler
}

func (v *vendorOnce401) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	v.mu.Lock()
	v.calls++
	v.auths = append(v.auths, r.Header.Get("Authorization"))
	isFirst := v.calls == 1
	v.mu.Unlock()

	if isFirst {
		// Drain so the body isn't reset for the retry — the round-
		// tripper rewinds via the snapshotted body bytes, not by
		// re-reading our copy. Mirrors the GraphQL acceptance test
		// pattern.
		_, _ = io.Copy(io.Discard, r.Body)
		_ = r.Body.Close()
		http.Error(w, "vendor: token rejected", http.StatusUnauthorized)
		return
	}
	v.upstream.ServeHTTP(w, r)
}

func (v *vendorOnce401) auth(i int) string {
	v.mu.Lock()
	defer v.mu.Unlock()
	if i >= len(v.auths) {
		return ""
	}
	return v.auths[i]
}

// TestLinearAcceptance_OAuthRetryOn401 is the Phase-4 acceptance scenario
// in one test:
//
//   - FakeCore hands out access-1 on the lazy fetch and access-2 on the
//     forced refresh.
//   - The vendor 401s the first MCP request (the user revoked Irmin
//     mid-flight) and 200s the second.
//   - The connector's MCP transport is wrapped by lib.NewMCPSession's
//     OAuth round-tripper; on the 401 it should ask Core to rotate
//     (ForceCalls() == 1) and retry once with the rotated token. The
//     handshake and a follow-up tools/list both succeed.
//
// If this test ever fails, either the linear client diverged from the
// round-tripper contract or the round-tripper itself regressed.
func TestLinearAcceptance_OAuthRetryOn401(t *testing.T) {
	core := commontest.NewFakeCore(t, "sys-token", "access-1", "access-2")

	// Stand up a real MCP server with a single trivial tool. The
	// purpose of the tool is just to give tools/list a non-empty
	// surface; the auth retry happens before we get to call it.
	mcpServer := mcp.NewServer(&mcp.Implementation{
		Name:    "linear-acceptance-fake",
		Version: "0.0.1",
	}, nil)
	mcp.AddTool(mcpServer, &mcp.Tool{
		Name:        "ping",
		Description: "no-op tool used only to make tools/list non-empty",
		InputSchema: nil,
	}, func(ctx context.Context, _ *mcp.CallToolRequest, _ map[string]any) (*mcp.CallToolResult, any, error) {
		return &mcp.CallToolResult{
			Content: []mcp.Content{&mcp.TextContent{Text: `{"ok":true}`}},
		}, nil, nil
	})

	mcpHandler := mcp.NewStreamableHTTPHandler(
		func(_ *http.Request) *mcp.Server { return mcpServer }, nil,
	)

	gate := &vendorOnce401{upstream: mcpHandler}
	server := httptest.NewServer(gate)
	t.Cleanup(server.Close)

	tokenClient := lib.NewOAuthTokenClient(core.BaseURL(), core.SystemToken)
	const connectionID = 7

	// OpenSession internally wraps http.DefaultClient with the OAuth
	// round-tripper, so we don't pre-wrap here. The session's first
	// request — initialize — gets the 401, the round-tripper rotates,
	// and the retry succeeds with access-2.
	c, cleanup, err := linearclient.OpenSession(
		context.Background(),
		server.URL,
		tokenClient,
		connectionID,
		nil, // use default http.Client; round-tripper added inside
		nil, // logger — falls back to slog.Default()
	)
	if err != nil {
		t.Fatalf("OpenSession: %v", err)
	}
	t.Cleanup(cleanup)

	// Issue a tool call so we know the session is fully usable post-
	// retry, not just that the initialize handshake recovered.
	if _, callErr := c.CallTool(context.Background(), "ping", nil); callErr != nil {
		t.Fatalf("CallTool ping: %v", callErr)
	}

	// One forced refresh exactly — no more, no less. More than one
	// would mean the retry loop is firing on every request; zero
	// would mean the 401 was never observed.
	if got := core.ForceCalls(); got != 1 {
		t.Fatalf("expected exactly 1 force-refresh, got %d", got)
	}

	// First attempt carried the lazy-fetched token; second attempt
	// carried the rotated token. Asserts the round-tripper actually
	// stamped the new token on retry rather than reusing the stale
	// one.
	if first := gate.auth(0); first != "Bearer access-1" {
		t.Fatalf("first attempt auth = %q, want Bearer access-1", first)
	}
	if second := gate.auth(1); second != "Bearer access-2" {
		t.Fatalf("retry auth = %q, want Bearer access-2", second)
	}
}
