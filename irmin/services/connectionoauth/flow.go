package connectionoauth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"irmin-api/db"

	"gorm.io/gorm"
)

// snippetLimit caps the body text captured in VendorError so we never
// spill megabytes of HTML into logs or error messages. bodyReadLimit is
// the number of body bytes we read before giving up — 4x the snippet so a
// short non-printable preamble can't starve us of signal in the snippet.
const (
	snippetLimit  = 500
	bodyReadLimit = snippetLimit * 4
)

// StartFlow creates a short-lived OAuthSession row for the connection and
// returns the URL the user's browser should be redirected to. The caller
// is responsible for opening the URL in a popup and watching for the
// callback completion signal.
//
// initiatingUserID identifies the user who clicked "Connect" and is
// persisted on the session row. The callback is a public endpoint, so the
// audit log uses this ID to credit completion to the actual clicker
// rather than the connection owner. Pass 0 for server-initiated flows.
func (s *Service) StartFlow(
	ctx context.Context,
	connection *db.Connection,
	initiatingUserID uint,
) (string, error) {
	if connection == nil {
		return "", errors.New("oauth: nil connection")
	}

	cfg, client, err := s.resolveConnectorOAuth(ctx, connection)
	if err != nil {
		return "", err
	}

	state, stateErr := generateState()
	if stateErr != nil {
		return "", stateErr
	}
	verifier, challenge, pkceErr := generatePKCE()
	if pkceErr != nil {
		return "", pkceErr
	}

	session := &db.ConnectionOAuthSession{
		ConnectionID: connection.ID,
		StateHMAC:    state,
		Secrets: db.CustomFieldValues{
			db.ConnectionOAuthSecretKeyPKCEVerifier: verifier,
		},
		ExpiresAt: s.clock.Now().Add(s.SessionTTL),
	}
	if initiatingUserID != 0 {
		id := initiatingUserID
		session.InitiatingUserID = &id
	}
	if createErr := s.db.CreateConnectionOAuthSession(s.db.DB, session); createErr != nil {
		return "", fmt.Errorf("oauth: persist session: %w", createErr)
	}

	return buildAuthURL(cfg, client, state, challenge, s.RedirectURI), nil
}

// CallbackResult bundles what a successful callback produces: the
// Connection the vendor was linked to, and the user who originally
// clicked "Connect" (pulled off the session row). Controllers use
// InitiatingUserID to credit the audit event back to the actual clicker,
// since the callback itself runs on a public endpoint with no user
// context.
type CallbackResult struct {
	Connection       *db.Connection
	InitiatingUserID *uint
}

// HandleCallback consumes the authorization code the vendor returned via
// the redirect. On success: tokens are stored encrypted, the session row
// is deleted (single-use), and a CallbackResult is returned so the caller
// can emit an audit event or redirect the browser.
//
// Failure modes are translated to the package sentinels: ErrStateInvalid
// for anything session-related (forged, expired, replayed) and
// *VendorError when the token endpoint itself returns non-2xx.
func (s *Service) HandleCallback(ctx context.Context, state, code string) (*CallbackResult, error) {
	if state == "" || code == "" {
		return nil, ErrStateInvalid
	}
	session, err := s.db.GetConnectionOAuthSessionByStateHMAC(state)
	if err != nil {
		if errors.Is(err, db.ErrConnectionOAuthSessionNotFound) {
			return nil, ErrStateInvalid
		}
		return nil, fmt.Errorf("oauth: lookup session: %w", err)
	}
	if !s.clock.Now().Before(session.ExpiresAt) {
		// Even if the row is still there, reject expired sessions.
		// Delete-best-effort so the row doesn't linger.
		_ = s.db.DeleteConnectionOAuthSessionByStateHMAC(s.db.DB, state)
		return nil, ErrStateInvalid
	}
	if session.Connection.ID == 0 {
		// Preload returned zero because the Connection was deleted.
		// Treat as session-invalid; the caller gets a generic error.
		_ = s.db.DeleteConnectionOAuthSessionByStateHMAC(s.db.DB, state)
		return nil, ErrStateInvalid
	}
	verifier := session.Secrets[db.ConnectionOAuthSecretKeyPKCEVerifier]
	if verifier == "" {
		// Should never happen — StartFlow always writes one — but a
		// missing verifier means we can't complete PKCE, so fail closed.
		return nil, ErrStateInvalid
	}

	cfg, client, resolveErr := s.resolveConnectorOAuth(ctx, &session.Connection)
	if resolveErr != nil {
		return nil, resolveErr
	}

	resp, tokenErr := s.exchangeAuthorizationCode(ctx, cfg, client, code, verifier)
	if tokenErr != nil {
		return nil, tokenErr
	}

	token := buildTokenRow(session.ConnectionID, resp, s.clock.Now(), false /* not a refresh */)
	txErr := s.db.Transaction(func(tx *gorm.DB) error {
		if upErr := s.db.UpsertConnectionOAuthToken(tx, token); upErr != nil {
			return fmt.Errorf("upsert token: %w", upErr)
		}
		if delErr := s.db.DeleteConnectionOAuthSessionByStateHMAC(tx, state); delErr != nil {
			return fmt.Errorf("delete session: %w", delErr)
		}
		return nil
	})
	if txErr != nil {
		return nil, fmt.Errorf("oauth: finalize callback: %w", txErr)
	}

	return &CallbackResult{
		Connection:       &session.Connection,
		InitiatingUserID: session.InitiatingUserID,
	}, nil
}

// resolveConnectorOAuth loads the Config and OAuth client for a connection.
// The connection must have a preloaded Connector (controllers load it via
// ConnectionMiddleware, HandleCallback gets it via the session preload).
func (s *Service) resolveConnectorOAuth(
	ctx context.Context,
	connection *db.Connection,
) (*Config, *db.ConnectionOAuthClient, error) {
	connector := connection.Connector
	if connector.ID == 0 {
		// The connection arrived without its Connector preloaded — fetch.
		fetched, err := s.db.GetConnector(connection.ConnectorID)
		if err != nil {
			return nil, nil, fmt.Errorf("oauth: load connector: %w", err)
		}
		connector = *fetched
	}
	cfg, err := s.provider.GetOAuthConfig(ctx, &connector)
	if err != nil {
		return nil, nil, fmt.Errorf("%w: %w", ErrConfigUnavailable, err)
	}
	if cfg == nil {
		return nil, nil, ErrConfigUnavailable
	}
	if !cfg.PKCE {
		return nil, nil, ErrPKCERequired
	}
	if cfg.AuthorizationURL == "" || cfg.TokenURL == "" {
		return nil, nil, fmt.Errorf(
			"%w: missing authorization_url or token_url",
			ErrConfigUnavailable,
		)
	}

	oauthClient, err := s.db.GetConnectionOAuthClientForConnector(
		connector.ID,
		connection.WorkspaceID,
	)
	if err == nil {
		return cfg, oauthClient, nil
	}
	if !errors.Is(err, db.ErrConnectionOAuthClientNotFound) {
		return nil, nil, fmt.Errorf("oauth: load client: %w", err)
	}

	// No client registered. For DCR-capable vendors, register one lazily
	// so the user doesn't see "admin must configure". For non-DCR vendors,
	// surface the sentinel so the controller can tell the user where to
	// turn.
	if cfg.DCREndpoint == "" {
		return nil, nil, ErrClientUnconfigured
	}
	registered, dcrErr := s.registerClientViaDCR(ctx, &connector, connection.WorkspaceID, cfg)
	if dcrErr != nil {
		return nil, nil, dcrErr
	}
	return cfg, registered, nil
}

// buildAuthURL assembles the vendor's authorization URL with all required
// and optional parameters. RFC 6749 §4.1.1 + RFC 7636 §4.3.
func buildAuthURL(
	cfg *Config,
	client *db.ConnectionOAuthClient,
	state, challenge, redirectURI string,
) string {
	q := url.Values{}
	q.Set("response_type", "code")
	q.Set("client_id", client.ClientID)
	q.Set("redirect_uri", redirectURI)
	q.Set("state", state)
	q.Set("code_challenge", challenge)
	q.Set("code_challenge_method", "S256")
	if len(cfg.Scopes) > 0 {
		q.Set("scope", strings.Join(cfg.Scopes, " "))
	}
	for k, v := range cfg.ExtraParams {
		// Don't let ExtraParams override the critical security params.
		switch k {
		case "response_type", "client_id", "redirect_uri",
			"state", "code_challenge", "code_challenge_method":
			continue
		}
		q.Set(k, v)
	}
	sep := "?"
	if strings.Contains(cfg.AuthorizationURL, "?") {
		sep = "&"
	}
	return cfg.AuthorizationURL + sep + q.Encode()
}

// tokenResponse mirrors the RFC 6749 §5.1 token endpoint response, with
// extensions for refresh_token rotation. We only decode the fields we
// actually use — unknown fields are dropped.
type tokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"` // seconds; may be 0 for non-expiring tokens
	RefreshToken string `json:"refresh_token"`
	Scope        string `json:"scope"`
}

// exchangeAuthorizationCode POSTs to the vendor's token endpoint to trade
// an authorization code for tokens. Body is application/x-www-form-urlencoded
// per RFC 6749 §4.1.3.
func (s *Service) exchangeAuthorizationCode(
	ctx context.Context,
	cfg *Config,
	client *db.ConnectionOAuthClient,
	code, verifier string,
) (*tokenResponse, error) {
	form := url.Values{}
	form.Set("grant_type", "authorization_code")
	form.Set("code", code)
	form.Set("redirect_uri", s.RedirectURI)
	form.Set("code_verifier", verifier)
	// Some vendors accept client creds in the body, others only in HTTP
	// Basic auth. We send both — RFC 6749 §2.3.1 allows either, and most
	// vendors are forgiving.
	form.Set("client_id", client.ClientID)
	clientSecret := client.Secrets[db.ConnectionOAuthSecretKeyClientSecret]
	if clientSecret != "" {
		form.Set("client_secret", clientSecret)
	}
	return s.postToken(ctx, cfg.TokenURL, form, client.ClientID, clientSecret, "token_exchange")
}

// postToken performs the POST and parses the response. Shared by the code
// exchange and the refresh paths.
func (s *Service) postToken(
	ctx context.Context,
	tokenURL string,
	form url.Values,
	clientID, clientSecret, stage string,
) (*tokenResponse, error) {
	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		tokenURL,
		strings.NewReader(form.Encode()),
	)
	if err != nil {
		return nil, fmt.Errorf("oauth: build %s request: %w", stage, err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")
	if clientSecret != "" {
		// Dual auth — both the body (handled by caller) and HTTP Basic.
		req.SetBasicAuth(clientID, clientSecret)
	}

	resp, doErr := s.httpClient.Do(req)
	if doErr != nil {
		// Network / DNS / TLS failure reaching the vendor. Classify as
		// VendorError so the user sees "vendor_error" (the vendor side
		// is unreachable from our PoV), not "internal_error" which
		// implies an Irmin bug.
		return nil, &VendorError{
			Stage:      stage,
			StatusCode: 0,
			Snippet:    fmt.Sprintf("transport error: %v", doErr),
		}
	}
	defer func() { _ = resp.Body.Close() }()

	body, readErr := io.ReadAll(io.LimitReader(resp.Body, bodyReadLimit))
	if readErr != nil {
		return nil, &VendorError{
			Stage:      stage,
			StatusCode: resp.StatusCode,
			Snippet:    fmt.Sprintf("body read error: %v", readErr),
		}
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, &VendorError{
			Stage:      stage,
			StatusCode: resp.StatusCode,
			Snippet:    redactedSnippet(body, snippetLimit),
		}
	}

	var parsed tokenResponse
	if unmarshalErr := json.Unmarshal(body, &parsed); unmarshalErr != nil {
		// 2xx with un-parseable body — the vendor said success but we
		// can't read what they sent. That's their bug, not ours.
		// Body bytes flow into mapConnectionOAuthError's Warn log, so
		// any access_token / refresh_token plaintext is redacted before
		// they reach the snippet — a malformed-JSON body could still
		// contain partial token material around the parse error point.
		return nil, &VendorError{
			Stage:      stage,
			StatusCode: resp.StatusCode,
			Snippet: fmt.Sprintf("malformed JSON: %v; body: %s",
				unmarshalErr, redactedSnippet(body, snippetLimit)),
		}
	}
	if parsed.AccessToken == "" {
		// 2xx, valid JSON, but no access_token field. Same story:
		// vendor protocol violation. The body parsed cleanly so we know
		// it doesn't have an `access_token` key, but it could still have
		// `refresh_token`, `id_token`, or vendor-specific credential
		// keys we redact defensively.
		return nil, &VendorError{
			Stage:      stage,
			StatusCode: resp.StatusCode,
			Snippet: "response missing access_token; body: " +
				redactedSnippet(body, snippetLimit),
		}
	}
	return &parsed, nil
}

// buildTokenRow converts a vendor response into a DB row. When isRefresh
// is true the caller must merge the result with the existing row before
// Upsert to preserve the refresh_token in case the vendor omitted it
// (common — only some vendors rotate refresh tokens).
//
// LastRefreshAt is stamped on every grant — both initial and refresh. The
// field's semantic is "when did this row last receive a freshly-issued
// token from the vendor", which is meaningful for either case. The
// Console's status-poll fallback (useOAuthFlow.tsx) detects fresh
// issuance on Reconnect by comparing the polled value to the pre-flight
// snapshot — without stamping it on initial grants, the polling path
// can never resolve a Reconnect when COOP severs window.opener, and the
// user falls through to a popup-closed timeout. The isRefresh flag is
// kept for callers that want to distinguish in audit/log lines but no
// longer gates the timestamp.
func buildTokenRow(
	connectionID uint,
	resp *tokenResponse,
	now time.Time,
	_ bool, // isRefresh — retained for signature compatibility; see doc above
) *db.ConnectionOAuthToken {
	secrets := db.CustomFieldValues{
		db.ConnectionOAuthSecretKeyAccessToken: resp.AccessToken,
	}
	if resp.RefreshToken != "" {
		secrets[db.ConnectionOAuthSecretKeyRefreshToken] = resp.RefreshToken
	}
	var expiresAt *time.Time
	if resp.ExpiresIn > 0 {
		t := now.Add(time.Duration(resp.ExpiresIn) * time.Second)
		expiresAt = &t
	}
	nowCopy := now
	return &db.ConnectionOAuthToken{
		ConnectionID:  connectionID,
		Secrets:       secrets,
		ExpiresAt:     expiresAt,
		Scope:         resp.Scope,
		TokenType:     resp.TokenType,
		LastRefreshAt: &nowCopy,
	}
}

// asciiSnippet returns up to max bytes of b, filtered to printable ASCII
// so we can safely include it in error messages + logs without mojibake.
func asciiSnippet(b []byte, maxBytes int) string {
	if len(b) > maxBytes {
		b = b[:maxBytes]
	}
	var out strings.Builder
	out.Grow(len(b))
	for _, c := range b {
		if c >= 0x20 && c < 0x7f {
			out.WriteByte(c)
		} else if c == '\n' || c == '\t' {
			out.WriteByte(' ')
		}
	}
	return out.String()
}

// redactedTokenKeysPattern matches values for any of the credential-bearing
// JSON keys we know vendors use, in either JSON ("key":"value"), form-encoded
// (key=value), or sloppy mixtures. The value is matched with `+` rather than
// a bounded repetition because (a) the input is already capped by
// asciiSnippet/snippetLimit, and (b) RE2 caps `{n,m}` at 1000 anyway. The
// terminator class (`,`/`"`/`&`/whitespace/`}`) ensures we stop at the next
// JSON or form delimiter so adjacent fields aren't swallowed. Used by
// redactedSnippet so a 2xx-malformed-JSON or 2xx-missing-access_token
// vendor body cannot leak token plaintext into VendorError.Snippet (which
// mapConnectionOAuthError logs at slog.Warn).
var redactedTokenKeysPattern = regexp.MustCompile(
	`(?i)("?(?:access_token|refresh_token|id_token|client_secret|registration_access_token)"?\s*[:=]\s*"?)[^",&\s}]+("?)`,
)

// redactedSnippet is asciiSnippet followed by a token-redaction pass. Use
// for any snippet derived from a vendor response body — the 4xx/5xx
// rejection bucket, the 2xx-with-malformed-JSON bucket, and the 2xx-
// missing-access_token bucket all flow through here. Transport / body-
// read errors don't carry response bytes and use asciiSnippet directly.
func redactedSnippet(b []byte, maxBytes int) string {
	return redactedTokenKeysPattern.ReplaceAllString(
		asciiSnippet(b, maxBytes), `${1}REDACTED${2}`)
}
