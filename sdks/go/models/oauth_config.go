package irminmodels

// ConnectionOAuthConfig is the vendor-side OAuth 2.0 metadata a connector
// declares on its /info response when it wants Irmin to run an
// authorization-code + PKCE flow on the user's behalf for a Connection.
// Fields map directly to RFC 6749 / RFC 7591 concepts; the Irmin Core
// OAuth service consumes them as-is.
//
// The "Connection" prefix disambiguates this from other OAuth concepts
// Irmin may grow later (internal service-to-service OAuth, MCP-client
// OAuth, etc.). This type is exclusively about authenticating a user's
// Connection to an external vendor.
//
// Connectors that don't support OAuth omit this block entirely — the
// existing DynamicField form path still works for password / API-key auth.
//
// Invariants the Core enforces (connectors don't need to duplicate):
//   - PKCE must be true for any new connector. The Core refuses to run a
//     flow when PKCE is false.
//   - AuthorizationURL and TokenURL must be absolute https:// URLs.
//   - ExtraParams may not override the security-critical OAuth params
//     (response_type, client_id, redirect_uri, state, code_challenge,
//     code_challenge_method); entries with those keys are ignored.
type ConnectionOAuthConfig struct {
	// Provider is a short canonical identifier for the vendor, e.g.
	// "hubspot", "stripe", "intercom". Used in logs + error messages.
	Provider string `json:"provider" validate:"required,max=64" example:"hubspot"`

	// AuthorizationURL is the user-agent-facing endpoint where the end
	// user approves the connection. Absolute https:// URL.
	AuthorizationURL string `json:"authorization_url" validate:"required,validurl" example:"https://app.hubspot.com/oauth/authorize"`

	// TokenURL is the token endpoint (RFC 6749 §3.2). Absolute https:// URL.
	TokenURL string `json:"token_url" validate:"required,validurl" example:"https://api.hubapi.com/oauth/v1/token"`

	// RevocationURL is optional (RFC 7009). When set, the Core POSTs the
	// token here on disconnect so the vendor drops the grant immediately.
	RevocationURL string `json:"revocation_url,omitempty" validate:"omitempty,validurl" example:"https://api.example.com/oauth/revoke"`

	// DCREndpoint is optional (RFC 7591). When set, the Core can
	// dynamically register an OAuth client per workspace on first use,
	// skipping the need for an admin-configured app. MCP-compatible
	// vendors (Intercom, Linear, Sentry, ...) typically provide this.
	DCREndpoint string `json:"dcr_endpoint,omitempty" validate:"omitempty,validurl" example:"https://api.example.com/oauth/register"`

	// Scopes is the set of OAuth scopes the connector declares it needs.
	// Read-only by default; connectors should follow least-privilege.
	Scopes []string `json:"scopes" validate:"required,dive,min=1,max=128" example:"crm.objects.contacts.read,crm.objects.deals.read"`

	// PKCE must be true for new connectors. The Core refuses to run a
	// flow when this is false. Retained as a field (rather than an
	// always-true default) so the contract is explicit on the wire.
	PKCE bool `json:"pkce" example:"true"`

	// UserinfoURL is optional. When set, the Core may call it after a
	// successful exchange to populate a friendly "connected as <who>"
	// label in the UI. Not used in the Phase 2 wiring; reserved.
	UserinfoURL string `json:"userinfo_url,omitempty" validate:"omitempty,validurl" example:"https://api.example.com/oauth/userinfo"`

	// ExtraParams are vendor-specific parameters appended to the
	// authorization request (e.g., access_type=offline, prompt=consent).
	// Keys that would override security-critical OAuth params are
	// silently dropped by the Core.
	ExtraParams map[string]string `json:"extra_params,omitempty" example:"access_type:offline"`
}
