package db

import (
	"errors"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// oauthBase is the minimal subset of gorm.Model for OAuth rows. We keep ID
// and timestamps but intentionally drop DeletedAt: OAuth artifacts (tokens,
// sessions, clients) have no audit value after removal. A soft-deleted
// ghost row would also collide with the unique index on connection_id and
// silently defeat later upserts.
type oauthBase struct {
	ID        uint      `json:"id"         gorm:"primarykey"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Secret-map keys used by the ConnectionOAuth* tables. Values live in the
// `Secrets` column of the respective model, which is encrypted at rest via
// the encrypted_json GORM serializer. Constants keep key strings from
// drifting across the services/oauth package and the DB layer.
//
// These constants are map keys, not credentials themselves — gosec's G101
// pattern match on names like "token"/"secret" is a false positive here.
//
//nolint:gosec // map keys, not hardcoded credentials
const (
	ConnectionOAuthSecretKeyClientSecret = "client_secret"
	ConnectionOAuthSecretKeyAccessToken  = "access_token"
	ConnectionOAuthSecretKeyRefreshToken = "refresh_token"
	ConnectionOAuthSecretKeyPKCEVerifier = "pkce_verifier"
	// ConnectionOAuthSecretKeyRegistrationToken is the RFC 7592 bearer
	// token returned by a DCR endpoint so a client can later read, update,
	// or delete its own registration. Stored alongside the client secret
	// because it confers comparable authority.
	ConnectionOAuthSecretKeyRegistrationToken = "registration_access_token"
)

// ConnectionOAuthClient is a registered OAuth application for a
// (connector, workspace) pair — either DCR-registered for a single workspace,
// or an admin-configured app shared across all workspaces connecting to the
// same vendor.
//
// `WorkspaceID == nil` flags a global client (admin-configured, e.g. the
// Irmin-owned HubSpot or Stripe app). A non-nil `WorkspaceID` came from
// RFC 7591 Dynamic Client Registration against the vendor's MCP server.
type ConnectionOAuthClient struct {
	oauthBase

	ConnectorID uint      `json:"connector_id" gorm:"index;not null"`
	Connector   Connector `json:"connector"    gorm:"foreignKey:ConnectorID"`

	// WorkspaceID nil = global/admin-configured client. Non-nil = DCR-registered
	// for that workspace only. GORM encodes nullable fk as *uint.
	WorkspaceID *uint      `json:"workspace_id,omitempty" gorm:"index"`
	Workspace   *Workspace `json:"workspace,omitempty"    gorm:"foreignKey:WorkspaceID"`

	// ClientID is the public identifier issued by the vendor. Stored in the
	// clear because it is not a secret and we often need to include it in
	// diagnostic logs.
	ClientID string `json:"client_id" gorm:"not null"`

	// RedirectURI is the exact URI registered with the vendor. Stored per
	// row so it can vary between admin-configured and DCR-registered clients.
	RedirectURI string `json:"redirect_uri" gorm:"not null"`

	// Secrets holds encrypted values. Only key: ConnectionOAuthSecretKeyClientSecret.
	Secrets CustomFieldValues `json:"-" gorm:"type:jsonb;serializer:encrypted_json"`

	// RegistrationMetadata is the non-sensitive DCR response payload (issuer,
	// token_endpoint_auth_method, etc.). Nil for admin-configured clients.
	RegistrationMetadata CustomFieldValues `json:"registration_metadata,omitempty" gorm:"type:jsonb;serializer:json"`
}

// ConnectionOAuthSession tracks one in-flight authorization code flow. Rows
// are short-lived (10 min TTL) and single-use — deleted after the callback
// successfully exchanges the code for tokens, and swept by cron otherwise.
type ConnectionOAuthSession struct {
	oauthBase

	ConnectionID uint       `json:"connection_id" gorm:"index;not null"`
	Connection   Connection `json:"connection"    gorm:"foreignKey:ConnectionID"`

	// InitiatingUserID records which user clicked "Connect" to start this
	// flow. The callback is public (no user in context), so we persist the
	// initiator at StartFlow time and credit the audit event on completion
	// back to them instead of the connection owner. Nullable because older
	// rows (pre-hardening) and server-initiated flows may not have a user.
	InitiatingUserID *uint `json:"initiating_user_id,omitempty" gorm:"index"`
	InitiatingUser   *User `json:"initiating_user,omitempty"    gorm:"foreignKey:InitiatingUserID"`

	// StateHMAC is what we send to the vendor as the `state` parameter.
	//
	// Implementation note: the column name reads as "HMAC" for historical
	// schema reasons, but the value stored here is a 256-bit cryptographic
	// random string produced by the services/oauth package — not an HMAC.
	// The callback looks up the session by exact-match on this column, so
	// any unguessable, unique-per-session value works. The uniqueIndex
	// converts a replayed state into a DB-level collision at session create
	// time and makes callback lookups O(1).
	StateHMAC string `json:"state_hmac" gorm:"uniqueIndex;not null"`

	// Secrets holds the PKCE code verifier under ConnectionOAuthSecretKeyPKCEVerifier.
	// Encrypted at rest so a DB snapshot alone cannot complete an in-flight
	// flow against an attacker-known authorization code.
	Secrets CustomFieldValues `json:"-" gorm:"type:jsonb;serializer:encrypted_json"`

	// ExpiresAt is when this session stops being valid. 10-minute TTL by
	// default; the callback handler rejects sessions past this time.
	ExpiresAt time.Time `json:"expires_at" gorm:"index;not null"`
}

// ConnectionOAuthToken holds the persistent bearer-token material for a
// Connection. One row per connection; deleted when the user disconnects or
// the Connection itself is deleted. Kept in a separate table from
// Connection.Details so the existing secret-mask/merge logic doesn't need to
// know about OAuth tokens.
type ConnectionOAuthToken struct {
	oauthBase

	// ConnectionID is the owner of the token set. UniqueIndex ensures one
	// row per Connection — a Connection either uses OAuth or doesn't.
	ConnectionID uint       `json:"connection_id" gorm:"uniqueIndex;not null"`
	Connection   Connection `json:"connection"    gorm:"foreignKey:ConnectionID"`

	// Secrets holds the encrypted token material. Expected keys:
	// ConnectionOAuthSecretKeyAccessToken, ConnectionOAuthSecretKeyRefreshToken.
	Secrets CustomFieldValues `json:"-" gorm:"type:jsonb;serializer:encrypted_json"`

	// ExpiresAt is the absolute expiry of the current access token. Nil
	// means "never expires" (rare but valid for some vendors).
	ExpiresAt *time.Time `json:"expires_at,omitempty" gorm:"index"`

	// Scope is the space-separated scope string granted by the vendor.
	// Useful for UI display and for detecting scope downgrades.
	Scope string `json:"scope"`

	// TokenType is the `token_type` from the vendor, e.g. "Bearer".
	TokenType string `json:"token_type"`

	// LastRefreshAt records the most recent successful refresh, for
	// diagnostics. nil = never refreshed (original issuance still current).
	LastRefreshAt *time.Time `json:"last_refresh_at,omitempty"`
}

// TableName overrides GORM's default pluralizer for the three OAuth tables.
//
// GORM's namer splits on uppercase boundaries, so `ConnectionOAuthClient`
// would become `connection_o_auth_clients` (note the spurious `o_auth`).
// Every other reference in this project — the handbook, the partial unique
// index DDL in db.go, the roadmap doc — uses the human-readable
// `connection_oauth_*`. Forcing the name here keeps those call sites
// working and prevents a silent schema drift between AutoMigrate and the
// raw SQL that follows it.
func (ConnectionOAuthClient) TableName() string  { return "connection_oauth_clients" }
func (ConnectionOAuthSession) TableName() string { return "connection_oauth_sessions" }
func (ConnectionOAuthToken) TableName() string   { return "connection_oauth_tokens" }

// Sentinel errors returned from the lookup helpers so callers can distinguish
// "no such row" from transport/DB errors without reaching into GORM.
var (
	ErrConnectionOAuthTokenNotFound   = errors.New("connection oauth token not found")
	ErrConnectionOAuthClientNotFound  = errors.New("connection oauth client not found")
	ErrConnectionOAuthSessionNotFound = errors.New("connection oauth session not found")
)

// --- ConnectionOAuthToken -----------------------------------------------------

// GetConnectionOAuthTokenByConnectionID returns the token row for a
// connection, or ErrConnectionOAuthTokenNotFound.
//
// Rejects connectionID == 0 up front so a buggy caller can't accidentally
// match an arbitrary row via GORM's zero-value Where semantics.
func (d *Database) GetConnectionOAuthTokenByConnectionID(connectionID uint) (*ConnectionOAuthToken, error) {
	if connectionID == 0 {
		return nil, ErrConnectionOAuthTokenNotFound
	}
	var token ConnectionOAuthToken
	err := d.Where("connection_id = ?", connectionID).First(&token).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrConnectionOAuthTokenNotFound
	}
	if err != nil {
		return nil, err
	}
	return &token, nil
}

// UpsertConnectionOAuthToken writes the given token, replacing any existing
// row for the same connection atomically via ON CONFLICT DO UPDATE. Used by
// the callback handler (new connection) and the refresh flow (rotated access
// + refresh tokens). Safe under concurrent callers: the unique index on
// connection_id converts races into a single well-defined upsert.
func (d *Database) UpsertConnectionOAuthToken(tx *gorm.DB, token *ConnectionOAuthToken) error {
	if token == nil {
		return errors.New("nil token")
	}
	if token.ConnectionID == 0 {
		return errors.New("token has zero ConnectionID")
	}
	return tx.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "connection_id"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"secrets",
			"expires_at",
			"scope",
			"token_type",
			"last_refresh_at",
			"updated_at",
		}),
	}).Create(token).Error
}

// DeleteConnectionOAuthTokenByConnectionID removes the token row for a
// connection. No-op if the row doesn't exist. Rejects connectionID == 0 to
// prevent a wildcard-delete footgun.
func (d *Database) DeleteConnectionOAuthTokenByConnectionID(tx *gorm.DB, connectionID uint) error {
	if connectionID == 0 {
		return errors.New("zero connectionID")
	}
	return tx.Where("connection_id = ?", connectionID).Delete(&ConnectionOAuthToken{}).Error
}

// --- ConnectionOAuthClient ----------------------------------------------------

// GetConnectionOAuthClientForConnector looks up the client row for a
// (connector, workspace) pair. Falls back to the global (workspace_id NULL)
// row when no workspace-scoped client is registered — the common case for
// admin-configured apps like HubSpot/Stripe.
func (d *Database) GetConnectionOAuthClientForConnector(
	connectorID uint,
	workspaceID uint,
) (*ConnectionOAuthClient, error) {
	if connectorID == 0 {
		return nil, ErrConnectionOAuthClientNotFound
	}
	var client ConnectionOAuthClient

	// Prefer a workspace-scoped row (DCR-registered).
	if workspaceID != 0 {
		err := d.Where("connector_id = ? AND workspace_id = ?", connectorID, workspaceID).
			First(&client).Error
		if err == nil {
			return &client, nil
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
	}

	// Fall back to the global (admin-configured) row.
	err := d.Where("connector_id = ? AND workspace_id IS NULL", connectorID).First(&client).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrConnectionOAuthClientNotFound
	}
	if err != nil {
		return nil, err
	}
	return &client, nil
}

// CreateConnectionOAuthClient inserts a new client row. Callers are expected
// to have checked that one doesn't already exist for the same (connector,
// workspace).
func (d *Database) CreateConnectionOAuthClient(tx *gorm.DB, client *ConnectionOAuthClient) error {
	if client == nil {
		return errors.New("nil client")
	}
	if client.ConnectorID == 0 {
		return errors.New("client has zero ConnectorID")
	}
	return tx.Create(client).Error
}

// --- ConnectionOAuthSession ---------------------------------------------------

// CreateConnectionOAuthSession inserts a new session row.
func (d *Database) CreateConnectionOAuthSession(tx *gorm.DB, session *ConnectionOAuthSession) error {
	if session == nil {
		return errors.New("nil session")
	}
	if session.ConnectionID == 0 {
		return errors.New("session has zero ConnectionID")
	}
	if session.StateHMAC == "" {
		return errors.New("session has empty StateHMAC")
	}
	return tx.Create(session).Error
}

// GetConnectionOAuthSessionByStateHMAC looks up a session by the state
// parameter the vendor sent us back. Returns ErrConnectionOAuthSessionNotFound
// if no match — the service layer treats that as "state expired, replayed, or
// forged" and 400s the callback.
func (d *Database) GetConnectionOAuthSessionByStateHMAC(stateHMAC string) (*ConnectionOAuthSession, error) {
	if stateHMAC == "" {
		return nil, ErrConnectionOAuthSessionNotFound
	}
	var session ConnectionOAuthSession
	err := d.Preload("Connection").
		Where("state_hmac = ?", stateHMAC).
		First(&session).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrConnectionOAuthSessionNotFound
	}
	if err != nil {
		return nil, err
	}
	return &session, nil
}

// DeleteConnectionOAuthSession removes a session row by ID. Called after a
// successful callback to enforce the single-use property of the state
// parameter.
func (d *Database) DeleteConnectionOAuthSession(tx *gorm.DB, sessionID uint) error {
	if sessionID == 0 {
		return errors.New("zero sessionID")
	}
	return tx.Delete(&ConnectionOAuthSession{}, sessionID).Error
}

// DeleteConnectionOAuthSessionsByConnectionID removes every pending session
// belonging to the given connection. Used by the disconnect path and by
// the connection-delete cascade — both need to evict in-flight flows so a
// stray callback can't re-create tokens after the user has said "stop".
// Rejects zero connectionID to prevent a wildcard-delete footgun.
func (d *Database) DeleteConnectionOAuthSessionsByConnectionID(tx *gorm.DB, connectionID uint) error {
	if connectionID == 0 {
		return errors.New("zero connectionID")
	}
	return tx.Where("connection_id = ?", connectionID).Delete(&ConnectionOAuthSession{}).Error
}

// DeleteExpiredConnectionOAuthSessions sweeps rows whose ExpiresAt is in the
// past. Intended for a periodic job; returns the number removed.
func (d *Database) DeleteExpiredConnectionOAuthSessions(now time.Time) (int64, error) {
	res := d.Where("expires_at < ?", now).Delete(&ConnectionOAuthSession{})
	return res.RowsAffected, res.Error
}
