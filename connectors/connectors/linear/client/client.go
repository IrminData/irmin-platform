// Package linearclient is a small MCP client for Linear's official MCP
// server (https://mcp.linear.app/mcp). It is intentionally not a full
// Linear SDK — only the tool calls the Irmin connector needs (pull
// issues / projects / cycles / teams; create + update issues) are
// implemented. Auth is OAuth 2.1 via DCR + PKCE; tokens are bound to
// the mcp.linear.app resource per Linear's RFC 9728 metadata.
package linearclient

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"

	"irmin-connectors/lib"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// Client wraps a live MCP client session against Linear's MCP server.
// One Client per connector operation — sessions are not designed to be
// reused across handler invocations because the underlying transport
// holds a long-lived HTTP/SSE connection. Callers construct a Client
// via OpenSession (production) or NewWithSession (tests), and MUST
// invoke the returned cleanup func when done.
//
// All public methods return JSON via `json.RawMessage` so the on-disk
// pull file format passes Linear's payload through verbatim — a Linear
// API change adding a field cannot silently drop data from a snapshot,
// and the post-processing pipeline (DuckDB ingest, schema validation)
// stays decoupled from the wire shape.
type Client struct {
	// Session is the live MCP client session. CallTool calls flow
	// through here. Tests substitute a session connected to an
	// in-process MCP stub (commontest/mcp_fixture.go).
	Session *mcp.ClientSession
}

// NewWithSession constructs a Client around an already-connected MCP
// session. Used by tests that wire a stub server directly via the SDK's
// in-memory or httptest transport.
func NewWithSession(session *mcp.ClientSession) *Client {
	return &Client{Session: session}
}

// OpenSession is the production constructor. It dials Linear's MCP
// server using the connection's OAuth token (refreshed transparently
// by the round-tripper inside lib.NewMCPSession) and returns a Client
// plus a cleanup func.
//
// endpoint is typically DefaultMCPEndpoint; tests override it to point
// at a local httptest stub.
//
// httpClient is the base HTTP transport (typically http.DefaultClient).
// It is wrapped with the OAuth round-tripper before being handed to
// the MCP transport, so the same auth + force-refresh path that other
// connectors use also covers MCP tool calls.
//
// logger receives the round-tripper's diagnostic Warn events (e.g.,
// vendor 401-after-refresh body snippets). Pass the connector's job-
// scoped logger so the events land in the operation log; nil falls
// back to slog.Default().
func OpenSession(
	ctx context.Context,
	endpoint string,
	tokenClient *lib.OAuthTokenClient,
	connectionID uint,
	httpClient *http.Client,
	logger *slog.Logger,
) (*Client, func(), error) {
	session, cleanup, err := lib.NewMCPSession(
		ctx, endpoint, tokenClient, connectionID, httpClient, logger,
	)
	if err != nil {
		return nil, nil, fmt.Errorf("linear: open mcp session: %w", err)
	}
	return &Client{Session: session}, cleanup, nil
}

// CallTool invokes an MCP tool by name and returns the inner JSON
// payload. Linear's tools all return a single TextContent block whose
// text is a JSON document — typically `{"<resource>": [...], "hasNextPage": bool, "cursor": "..."}`.
//
// Error cases:
//   - Tool returned IsError=true: the message from the first text block
//     is wrapped as a Go error so the caller surfaces a meaningful log.
//   - No content blocks: caller passed a tool name the server doesn't
//     support, or the server is misbehaving — bubbled up as an error.
//   - Content[0] not text: future-proofing; Linear may add typed
//     embedded resources for some tools, in which case this client
//     needs to be extended.
func (c *Client) CallTool(
	ctx context.Context,
	name string,
	args map[string]any,
) (json.RawMessage, error) {
	if c == nil || c.Session == nil {
		return nil, errors.New("linear: nil MCP session")
	}
	res, err := c.Session.CallTool(ctx, &mcp.CallToolParams{
		Name:      name,
		Arguments: args,
	})
	if err != nil {
		return nil, fmt.Errorf("linear: call tool %q: %w", name, err)
	}
	if res.IsError {
		return nil, fmt.Errorf("linear: tool %q returned error: %s", name, firstTextContent(res))
	}
	if len(res.Content) == 0 {
		return nil, fmt.Errorf("linear: tool %q returned no content", name)
	}
	tc, ok := res.Content[0].(*mcp.TextContent)
	if !ok {
		return nil, fmt.Errorf(
			"linear: tool %q returned unexpected content type %T (this client only supports text)",
			name, res.Content[0],
		)
	}
	if tc.Text == "" {
		// Empty-string text blocks are not strictly invalid, but every
		// Linear tool we use returns a JSON object. Bail rather than
		// produce a downstream "invalid character" parse error.
		return nil, fmt.Errorf("linear: tool %q returned empty text content", name)
	}
	return json.RawMessage(tc.Text), nil
}

// firstTextContent returns the first TextContent block's text, or a
// placeholder if Content is empty / non-text. Used only in the
// IsError path to extract a useful log line.
func firstTextContent(res *mcp.CallToolResult) string {
	for _, c := range res.Content {
		if tc, ok := c.(*mcp.TextContent); ok && tc.Text != "" {
			return tc.Text
		}
	}
	return "<no error message in result>"
}
