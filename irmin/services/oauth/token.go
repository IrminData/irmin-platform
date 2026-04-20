package oauth

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"irmin-api/db"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// ConnectionStatus is the small shape consoles need to render a
// Connect / Reconnect / Disconnect UI without having to reason about
// encrypted rows or sentinel errors.
//
// Connected = false means the Connection has no token row yet (ErrNotConnected
// when fetching). The remaining fields apply when Connected = true.
//
// ExpiresAt is nil for non-expiring tokens; Scope is the space-separated
// string the vendor returned; TokenType is usually "Bearer". LastRefreshAt
// is nil if the original issuance is still current.
type ConnectionStatus struct {
	Connected     bool       `json:"connected"`
	ExpiresAt     *time.Time `json:"expires_at,omitempty"`
	Scope         string     `json:"scope,omitempty"`
	TokenType     string     `json:"token_type,omitempty"`
	LastRefreshAt *time.Time `json:"last_refresh_at,omitempty"`
	// NeedsRefresh flags that the current access token is inside the
	// refresh skew window and the next GetAccessToken will trigger a
	// refresh. Useful for UIs that want to hint "reconnecting..." before
	// the user initiates an action.
	NeedsRefresh bool `json:"needs_refresh"`
}

// GetConnectionOAuthStatus returns a read-only snapshot of the OAuth
// status for a connection. Intended for console UIs that render the
// Connect/Reconnect/Disconnect button. Never refreshes tokens.
//
// Returns (status{Connected:false}, nil) when the connection has no token
// row — that's a normal "not connected yet" state, not an error.
func (s *Service) GetConnectionOAuthStatus(
	_ context.Context,
	connectionID uint,
) (*ConnectionStatus, error) {
	if connectionID == 0 {
		return &ConnectionStatus{Connected: false}, nil
	}
	token, err := s.db.GetConnectionOAuthTokenByConnectionID(connectionID)
	if err != nil {
		if errors.Is(err, db.ErrConnectionOAuthTokenNotFound) {
			return &ConnectionStatus{Connected: false}, nil
		}
		return nil, fmt.Errorf("oauth: load token for status: %w", err)
	}
	return &ConnectionStatus{
		Connected:     true,
		ExpiresAt:     token.ExpiresAt,
		Scope:         token.Scope,
		TokenType:     token.TokenType,
		LastRefreshAt: token.LastRefreshAt,
		NeedsRefresh:  s.needsRefresh(token),
	}, nil
}

// AccessToken is the minimal view of a token that downstream callers need.
// Returned by GetAccessToken so callers don't have to know how the DB row
// is shaped or refresh it themselves.
type AccessToken struct {
	Value     string
	TokenType string
	ExpiresAt *time.Time
	Scope     string
}

// GetAccessToken returns a fresh access token for the connection. If the
// current token is expired — or within RefreshSkew of expiring — the
// refresh flow runs transparently before returning.
//
// Returns ErrNotConnected when the connection has no token row.
// Returns ErrRefreshRejected if the vendor rejects the refresh (the user
// has likely revoked the app on the vendor side; the caller should prompt
// for reconnection). Other vendor errors bubble up as *VendorError.
func (s *Service) GetAccessToken(ctx context.Context, connectionID uint) (*AccessToken, error) {
	token, err := s.db.GetConnectionOAuthTokenByConnectionID(connectionID)
	if err != nil {
		if errors.Is(err, db.ErrConnectionOAuthTokenNotFound) {
			return nil, ErrNotConnected
		}
		return nil, fmt.Errorf("oauth: load token: %w", err)
	}

	if !s.needsRefresh(token) {
		return accessTokenFromRow(token), nil
	}

	refreshed, refreshErr := s.RefreshToken(ctx, connectionID)
	if refreshErr != nil {
		return nil, refreshErr
	}
	return accessTokenFromRow(refreshed), nil
}

// ForceRefreshAccessToken rotates the stored token unconditionally and
// returns the freshly-issued access token. Callers use this when the
// vendor rejected a previously-cached token mid-operation (401 on a
// token that hadn't yet entered the skew window) — the only remedy is
// to force a refresh regardless of local expiry state.
//
// Returns ErrNotConnected when the connection has no token row.
// Returns ErrRefreshRejected if the vendor rejects the refresh.
func (s *Service) ForceRefreshAccessToken(
	ctx context.Context,
	connectionID uint,
) (*AccessToken, error) {
	refreshed, err := s.refreshToken(ctx, connectionID, true /* force */)
	if err != nil {
		return nil, err
	}
	return accessTokenFromRow(refreshed), nil
}

// RefreshToken rotates the stored access token using the refresh token.
// Runs inside a transaction with SELECT ... FOR UPDATE on the token row,
// so concurrent callers (two connector requests, or a scheduled sweep
// plus a user-triggered call) serialize cleanly — the second caller
// observes the first caller's freshly-written token and skips the
// network round-trip when still valid.
//
// Returns the (possibly untouched) up-to-date row. Returns ErrNotConnected
// if no token row exists. Returns ErrRefreshRejected when the vendor
// responds 400/401 to the refresh request (commonly "user revoked").
func (s *Service) RefreshToken(
	ctx context.Context,
	connectionID uint,
) (*db.ConnectionOAuthToken, error) {
	return s.refreshToken(ctx, connectionID, false /* force */)
}

// refreshToken is the shared implementation for both lazy and forced
// refresh. When force is false, the lock-holder short-circuits if
// another caller has already written a fresh row; when true, we always
// hit the vendor regardless of local expiry state. Force is how the
// connectors service recovers from a vendor-side mid-flight revocation
// that arrives before the token's ExpiresAt lands in the skew window.
func (s *Service) refreshToken(
	ctx context.Context,
	connectionID uint,
	force bool,
) (*db.ConnectionOAuthToken, error) {
	if connectionID == 0 {
		return nil, ErrNotConnected
	}
	var result *db.ConnectionOAuthToken
	txErr := s.db.Transaction(func(tx *gorm.DB) error {
		// Row-lock the token so only one refresh runs per connection across
		// all app instances. Another caller arriving at the same instant
		// will block here, then find an already-fresh row and skip the
		// network call. `FOR UPDATE` works on Postgres; the existing codebase
		// uses it via Clauses in lib/lockKeyTx.go-style patterns.
		row, loadErr := s.loadLockedTokenRow(tx, connectionID)
		if loadErr != nil {
			return loadErr
		}

		// Double-checked freshness: another caller may have just refreshed
		// while we were waiting for the lock. Force-refresh callers skip
		// this and always re-hit the vendor — they're recovering from a
		// mid-flight revocation that won't be visible in local state.
		if !force && !s.needsRefresh(row) {
			result = row
			return nil
		}

		refreshed, runErr := s.performRefresh(ctx, tx, row)
		if runErr != nil {
			return runErr
		}
		result = refreshed
		return nil
	})
	if txErr != nil {
		return nil, txErr
	}
	return result, nil
}

// loadLockedTokenRow grabs the token row under SELECT ... FOR UPDATE.
// Mapped separately from refreshToken so the surrounding transaction
// function stays within gocognit limits even after the force-refresh
// branch.
func (s *Service) loadLockedTokenRow(
	tx *gorm.DB,
	connectionID uint,
) (*db.ConnectionOAuthToken, error) {
	var row db.ConnectionOAuthToken
	getErr := tx.
		Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("connection_id = ?", connectionID).
		First(&row).Error
	if errors.Is(getErr, gorm.ErrRecordNotFound) {
		return nil, ErrNotConnected
	}
	if getErr != nil {
		return nil, fmt.Errorf("load token under lock: %w", getErr)
	}
	return &row, nil
}

// performRefresh resolves the vendor config, posts the refresh-grant,
// and upserts the rotated row. Returns the persisted row on success.
// Extracted from refreshToken so the transaction callback stays simple
// enough for gocognit (<= 20).
func (s *Service) performRefresh(
	ctx context.Context,
	tx *gorm.DB,
	row *db.ConnectionOAuthToken,
) (*db.ConnectionOAuthToken, error) {
	refreshToken := row.Secrets[db.ConnectionOAuthSecretKeyRefreshToken]
	if refreshToken == "" {
		// No refresh token on file — we can't refresh silently. The
		// caller needs to prompt the user to reconnect.
		return nil, ErrNotConnected
	}

	// We need the Config + client to know the TokenURL + creds. Fetch
	// here rather than at service-construction time so config changes
	// (rare) take effect without a restart.
	connection, connErr := s.db.GetConnectionByID(row.ConnectionID)
	if connErr != nil {
		return nil, fmt.Errorf("load connection: %w", connErr)
	}
	cfg, client, resolveErr := s.resolveConnectorOAuth(ctx, connection)
	if resolveErr != nil {
		return nil, resolveErr
	}

	resp, exchangeErr := s.exchangeRefreshToken(ctx, cfg, client, refreshToken)
	if exchangeErr != nil {
		return nil, s.classifyRefreshError(exchangeErr)
	}

	next := buildTokenRow(row.ConnectionID, resp, s.clock.Now(), true /* isRefresh */)
	// Carry forward the old refresh_token if the vendor didn't rotate
	// it — many don't, and losing it would brick the connection on
	// the next refresh.
	if _, ok := next.Secrets[db.ConnectionOAuthSecretKeyRefreshToken]; !ok {
		next.Secrets[db.ConnectionOAuthSecretKeyRefreshToken] = refreshToken
	}
	if upsertErr := s.db.UpsertConnectionOAuthToken(tx, next); upsertErr != nil {
		return nil, fmt.Errorf("upsert refreshed token: %w", upsertErr)
	}
	return next, nil
}

// Revoke calls the vendor's revocation endpoint (if one is configured)
// and removes the stored token row. A vendor-side revoke is best-effort:
// we always delete our local state, even if the vendor returns an error,
// because the user's intent is clear and failing to delete locally would
// leave them unable to reconnect without admin help.
func (s *Service) Revoke(ctx context.Context, connectionID uint) error {
	if connectionID == 0 {
		return nil
	}
	token, err := s.db.GetConnectionOAuthTokenByConnectionID(connectionID)
	if err != nil {
		if errors.Is(err, db.ErrConnectionOAuthTokenNotFound) {
			return nil // already gone; idempotent
		}
		return fmt.Errorf("oauth: load token for revoke: %w", err)
	}
	// Best-effort vendor revoke; log failures but don't block local delete.
	// We deliberately avoid resolveConnectorOAuth here: that path lazy-DCRs
	// when no client row exists, which would block disconnect on a slow
	// vendor DCR endpoint AND register a fresh client only to then fail
	// the revocation (wrong client for this token). If the client row is
	// missing we skip vendor revoke entirely — local delete still runs.
	if cfg, client, ok := s.lookupConfigAndClient(ctx, connectionID); ok {
		if cfg.RevocationURL != "" {
			s.revokeAtVendor(ctx, cfg, client, token)
		}
	}
	return s.db.Transaction(func(tx *gorm.DB) error {
		// Delete the token row AND any in-flight session rows in one
		// transaction. Leaving sessions alive would let a late callback
		// silently re-create the token we just asked to revoke.
		if delTokenErr := s.db.DeleteConnectionOAuthTokenByConnectionID(tx, connectionID); delTokenErr != nil {
			return delTokenErr
		}
		return s.db.DeleteConnectionOAuthSessionsByConnectionID(tx, connectionID)
	})
}

// lookupConfigAndClient resolves the Config + OAuth client for the given
// connection without any side effects. Intended for paths (like Revoke)
// that must not trigger DCR: they return false and fall back to local-only
// behavior when either piece is missing.
func (s *Service) lookupConfigAndClient(
	ctx context.Context,
	connectionID uint,
) (*Config, *db.ConnectionOAuthClient, bool) {
	connection, err := s.db.GetConnectionByID(connectionID)
	if err != nil {
		return nil, nil, false
	}
	connector := connection.Connector
	if connector.ID == 0 {
		fetched, fetchErr := s.db.GetConnector(connection.ConnectorID)
		if fetchErr != nil {
			return nil, nil, false
		}
		connector = *fetched
	}
	cfg, cfgErr := s.provider.GetOAuthConfig(ctx, &connector)
	if cfgErr != nil || cfg == nil {
		return nil, nil, false
	}
	client, clientErr := s.db.GetConnectionOAuthClientForConnector(
		connector.ID,
		connection.WorkspaceID,
	)
	if clientErr != nil {
		return nil, nil, false
	}
	return cfg, client, true
}

// needsRefresh reports whether token is expired or will expire within
// RefreshSkew. Tokens with no ExpiresAt (nil) are assumed non-expiring.
func (s *Service) needsRefresh(token *db.ConnectionOAuthToken) bool {
	if token.ExpiresAt == nil {
		return false
	}
	return !s.clock.Now().Add(s.RefreshSkew).Before(*token.ExpiresAt)
}

// accessTokenFromRow flattens the DB row into the small struct callers want.
func accessTokenFromRow(token *db.ConnectionOAuthToken) *AccessToken {
	return &AccessToken{
		Value:     token.Secrets[db.ConnectionOAuthSecretKeyAccessToken],
		TokenType: token.TokenType,
		ExpiresAt: token.ExpiresAt,
		Scope:     token.Scope,
	}
}

// exchangeRefreshToken POSTs to the vendor's token endpoint with
// grant_type=refresh_token per RFC 6749 §6.
func (s *Service) exchangeRefreshToken(
	ctx context.Context,
	cfg *Config,
	client *db.ConnectionOAuthClient,
	refreshToken string,
) (*tokenResponse, error) {
	form := url.Values{}
	form.Set("grant_type", "refresh_token")
	form.Set("refresh_token", refreshToken)
	form.Set("client_id", client.ClientID)
	clientSecret := client.Secrets[db.ConnectionOAuthSecretKeyClientSecret]
	if clientSecret != "" {
		form.Set("client_secret", clientSecret)
	}
	// Some vendors (e.g. Stripe) require scope on refresh to re-issue
	// a token with the same scope set. Passing it is a no-op for vendors
	// that don't care.
	if len(cfg.Scopes) > 0 {
		form.Set("scope", strings.Join(cfg.Scopes, " "))
	}
	return s.postToken(ctx, cfg.TokenURL, form, client.ClientID, clientSecret, "refresh")
}

// classifyRefreshError maps vendor errors onto the package sentinels. A
// 400/401 during refresh almost always means the user revoked the app or
// the refresh token has aged out — we surface ErrRefreshRejected so the
// caller can prompt for reconnection rather than retry.
func (s *Service) classifyRefreshError(err error) error {
	var verr *VendorError
	if errors.As(err, &verr) {
		if verr.StatusCode == http.StatusBadRequest ||
			verr.StatusCode == http.StatusUnauthorized {
			return ErrRefreshRejected
		}
	}
	return err
}

// revokeAtVendor performs the RFC 7009 revocation POST. Best-effort: errors
// are logged at warn level; the caller proceeds to delete the local row
// regardless. We always try the access token first; if the vendor also
// supports revoking refresh tokens and one is present, revoke that too.
func (s *Service) revokeAtVendor(
	ctx context.Context,
	cfg *Config,
	client *db.ConnectionOAuthClient,
	token *db.ConnectionOAuthToken,
) {
	access := token.Secrets[db.ConnectionOAuthSecretKeyAccessToken]
	if access != "" {
		s.postRevoke(ctx, cfg, client, access, "access_token")
	}
	refresh := token.Secrets[db.ConnectionOAuthSecretKeyRefreshToken]
	if refresh != "" {
		s.postRevoke(ctx, cfg, client, refresh, "refresh_token")
	}
}

// postRevoke issues one revocation POST per RFC 7009. Failures are logged
// but never returned — revoke is best-effort from the caller's perspective.
func (s *Service) postRevoke(
	ctx context.Context,
	cfg *Config,
	client *db.ConnectionOAuthClient,
	tokenValue, hint string,
) {
	form := url.Values{}
	form.Set("token", tokenValue)
	form.Set("token_type_hint", hint)
	form.Set("client_id", client.ClientID)
	clientSecret := client.Secrets[db.ConnectionOAuthSecretKeyClientSecret]
	if clientSecret != "" {
		form.Set("client_secret", clientSecret)
	}
	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		cfg.RevocationURL,
		strings.NewReader(form.Encode()),
	)
	if err != nil {
		s.logger.WarnContext(ctx, "oauth: build revoke request", "error", err, "hint", hint)
		return
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	if clientSecret != "" {
		req.SetBasicAuth(client.ClientID, clientSecret)
	}
	resp, doErr := s.httpClient.Do(req)
	if doErr != nil {
		s.logger.WarnContext(ctx, "oauth: revoke transport", "error", doErr, "hint", hint)
		return
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, bodyReadLimit))
		s.logger.WarnContext(
			ctx,
			"oauth: revoke non-2xx",
			"status", resp.StatusCode,
			"hint", hint,
			"body", asciiSnippet(body, snippetLimit),
		)
	}
}
