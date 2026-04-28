// mcp_fixture.go provides an in-memory MCP server stub for connector
// tests. Mirrors oauth_fixture.go's role for the OAuth token client:
// cheap setup, register a tool by name, drive the connector against
// the resulting session.
//
// Wire it into a connector test via:
//
//	fake := commontest.NewFakeMCPServer(t)
//	fake.OnTool("save_issue", func(args map[string]any) (json.RawMessage, error) {
//	    return json.RawMessage(`{"id":"IRM-1","title":"x"}`), nil
//	})
//	client := linearclient.NewWithSession(fake.Session())
//	// ... exercise client ...
//
// Per-call assertions (which args reached the tool) live in the test's
// own handler closure — capture them in a sync.Mutex-guarded slice on
// the test's local fake type. Keeps this fixture small and avoids
// accruing a tracking API that no current caller needs.
//
// For tests that need the OAuth round-tripper in the loop (HTTP-level
// retry on 401, etc.), use connectors/linear/client/oauth_acceptance_test.go's
// pattern instead — that test stands up the real Streamable HTTP
// handler behind an httptest.Server with a 401-once gate. This
// in-memory fixture skips the HTTP layer entirely.

package commontest

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// MCPToolHandler is the callback shape registered via OnTool. It
// receives the args map verbatim and returns the JSON document the
// tool should emit (which the SDK wraps in a TextContent block) or
// an error to surface as IsError=true on the result.
type MCPToolHandler func(args map[string]any) (json.RawMessage, error)

// FakeMCPServer is an in-memory MCP server with registerable tool
// callbacks. The zero value is not useful; call NewFakeMCPServer.
type FakeMCPServer struct {
	t       *testing.T
	server  *mcp.Server
	session *mcp.ClientSession
}

// NewFakeMCPServer stands up an in-memory MCP server connected to a
// matching client session via mcp.NewInMemoryTransports. The session
// is closed automatically via t.Cleanup so tests don't leak goroutines.
func NewFakeMCPServer(t *testing.T) *FakeMCPServer {
	t.Helper()
	f := &FakeMCPServer{t: t}
	f.server = mcp.NewServer(&mcp.Implementation{
		Name:    "commontest-fake-mcp",
		Version: "0.0.1",
	}, nil)

	clientTransport, serverTransport := mcp.NewInMemoryTransports()

	go func() {
		// The server.Run goroutine ends when the session closes via
		// the t.Cleanup below. Any error here is a test bug, not a
		// production code path; let testing.T surface it.
		if runErr := f.server.Run(context.Background(), serverTransport); runErr != nil {
			t.Logf("FakeMCPServer.Run returned: %v", runErr)
		}
	}()

	client := mcp.NewClient(&mcp.Implementation{
		Name:    "commontest-fake-mcp-client",
		Version: "0.0.1",
	}, nil)
	cs, connectErr := client.Connect(context.Background(), clientTransport, nil)
	if connectErr != nil {
		t.Fatalf("FakeMCPServer: connect: %v", connectErr)
	}
	f.session = cs
	t.Cleanup(func() { _ = cs.Close() })
	return f
}

// OnTool registers a handler for the given MCP tool name. Calling
// OnTool a second time for the same name registers another handler —
// the SDK invokes whichever one matches at dispatch time, so test
// code is expected to set up its expectations once and not re-register.
func (f *FakeMCPServer) OnTool(name string, handler MCPToolHandler) {
	f.t.Helper()
	mcp.AddTool(f.server, &mcp.Tool{
		Name:        name,
		Description: "fake tool registered by commontest.FakeMCPServer",
	}, func(_ context.Context, _ *mcp.CallToolRequest, args map[string]any) (*mcp.CallToolResult, any, error) {
		body, callErr := handler(args)
		if callErr != nil {
			// Mirror real MCP servers: surface the handler error as
			// IsError=true on the result AND return the Go error so
			// callers see it through CallTool's standard signature.
			return &mcp.CallToolResult{
				IsError: true,
				Content: []mcp.Content{&mcp.TextContent{Text: callErr.Error()}},
			}, nil, callErr
		}
		return &mcp.CallToolResult{
			Content: []mcp.Content{&mcp.TextContent{Text: string(body)}},
		}, nil, nil
	})
}

// Session returns the live MCP client session connected to the
// fixture. Callers wrap it in a connector-specific client (e.g.,
// linearclient.NewWithSession) and exercise that.
func (f *FakeMCPServer) Session() *mcp.ClientSession {
	return f.session
}
