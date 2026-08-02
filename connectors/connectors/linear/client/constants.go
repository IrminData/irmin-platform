// MCP OAuth endpoints. See client.go for the package-level overview.
package linearclient

// Linear MCP OAuth 2.1 endpoints, confirmed against
// https://mcp.linear.app/.well-known/oauth-authorization-server.
// RFC 7591 Dynamic Client Registration is supported via DCREndpoint.
const (
	// AuthorizationURL is where the user-agent goes to approve the
	// OAuth grant (RFC 6749 §3.1).
	AuthorizationURL = "https://mcp.linear.app/authorize"

	// TokenURL is the OAuth token endpoint (RFC 6749 §3.2).
	TokenURL = "https://mcp.linear.app/token" //nolint:gosec // OAuth endpoint URL, not a credential

	// DCREndpoint is the RFC 7591 dynamic client registration endpoint.
	// Irmin Core registers a per-workspace OAuth client here on first
	// use, skipping the need for an admin-configured static app.
	DCREndpoint = "https://mcp.linear.app/register"

	// RevocationURL is where Core POSTs the token on disconnect.
	// Linear's discovery document points the revocation endpoint at
	// the same URL as the token endpoint — unusual but documented; the
	// /token endpoint accepts the RFC 7009 revoke shape.
	RevocationURL = "https://mcp.linear.app/token"
)

// DefaultScopes returns the OAuth scopes this connector requests.
// `read` is sufficient for pulling issues / projects / cycles /
// teams; `write` is required for the create / update mutations the
// push + patch handlers use. Returned as a fresh slice each call
// (lint disallows package-level slice variables) — callers may store
// the result.
func DefaultScopes() []string {
	return []string{"read", "write"}
}

// DefaultMCPEndpoint is Linear's MCP server (Streamable HTTP). Tokens
// issued at TokenURL are bound to this resource per Linear's RFC 9728
// oauth-protected-resource document. Tests override via the
// `mcp_endpoint` setting on the Connection.
const DefaultMCPEndpoint = "https://mcp.linear.app/mcp"
