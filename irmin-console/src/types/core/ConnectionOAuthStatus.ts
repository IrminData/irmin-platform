/**
 * Read-only OAuth status snapshot for a connection. Mirrors Core's
 * `services/oauth.ConnectionStatus` returned by
 * `GET /v1/workspaces/:w/connections/:c/oauth/status`.
 */
export interface ConnectionOAuthStatus {
  /** Whether a valid token is currently stored for the connection. */
  connected: boolean;
  /** Access-token expiry. ISO 8601. Absent when `connected` is false. */
  expires_at?: string;
  /** OAuth scopes granted by the vendor. */
  scope?: string;
  /** Token type returned by the vendor (typically "Bearer"). */
  token_type?: string;
  /** Last time Core successfully refreshed the access token. ISO 8601. */
  last_refresh_at?: string;
  /**
   * Whether the token is inside the refresh-skew window. The next
   * vendor call will trigger a lazy refresh.
   */
  needs_refresh: boolean;
}
