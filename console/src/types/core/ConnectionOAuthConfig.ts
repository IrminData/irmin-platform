/**
 * Vendor-side OAuth 2.0 metadata a connector declares on its /info
 * response. Mirrors `irminmodels.ConnectionOAuthConfig` from the Go SDK.
 *
 * The console reads this off the connector's `connection_oauth_config`
 * to decide whether to run the OAuth flow instead of rendering
 * password / API-key inputs in the connection wizard.
 */
export interface ConnectionOAuthConfig {
  /** Short canonical vendor identifier (e.g. "linear", "hubspot"). */
  provider: string;
  /** User-facing authorize endpoint. Absolute https:// URL. */
  authorization_url: string;
  /** OAuth 2.0 token endpoint. Absolute https:// URL. */
  token_url: string;
  /** Optional RFC 7009 revocation endpoint. */
  revocation_url?: string;
  /** Optional RFC 7591 dynamic-client-registration endpoint. */
  dcr_endpoint?: string;
  /** OAuth scopes the connector requests. */
  scopes: string[];
  /** PKCE flag (must be true for new connectors). */
  pkce: boolean;
  /** Optional userinfo endpoint (reserved; not yet wired). */
  userinfo_url?: string;
  /** Vendor-specific authorize-request params (e.g. access_type=offline). */
  extra_params?: Record<string, string>;
}
