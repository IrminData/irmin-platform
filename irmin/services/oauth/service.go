// Package oauth implements the authorization-code + PKCE OAuth 2.0 flow
// that users go through when connecting Irmin to an external SaaS vendor.
//
// The package owns five responsibilities:
//
//  1. StartFlow: build an authorization URL, persisting per-attempt state
//     (opaque state value + PKCE verifier) in a short-lived session row.
//  2. HandleCallback: exchange the returned authorization code for
//     access + refresh tokens, store them encrypted, and delete the session.
//  3. GetAccessToken: return a fresh access token for a Connection,
//     refreshing transparently if the current one is expiring.
//  4. RefreshToken: explicit refresh entry point, used by GetAccessToken
//     and by any future background-refresh sweeper. Serializes concurrent
//     refreshes per connection via SELECT ... FOR UPDATE.
//  5. Revoke: hit the vendor's revocation endpoint (best-effort) and delete
//     the stored token row.
//
// The package does not know how to talk to irmin-connectors. The vendor's
// OAuth metadata (auth URL, token URL, scopes, PKCE requirement, ...) is
// injected via a ConfigProvider so tests can supply a fake. In production
// wiring, the provider calls through to irmin-connectors via the connectors
// client, reading the OAuthConfig block the connector declares.
//
// All stored secrets go through the encrypted_json GORM serializer; this
// package only sees plaintext values in memory.
package oauth

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"irmin-api/db"
)

// Config is the vendor-side OAuth metadata needed to run a flow. All URLs
// are expected to be absolute https:// URLs; scopes are space-joined on the
// wire but kept as a slice here for legibility and lint-friendliness.
//
// This mirrors the OAuthConfig shape we will later declare in the SDK. We
// define a local copy so this package can be built independently of the
// SDK extension.
type Config struct {
	// Provider is a short canonical identifier for the vendor: "hubspot",
	// "stripe", "intercom", etc. Used in audit logs and error messages.
	Provider string

	// AuthorizationURL is the user-agent-facing endpoint where the user
	// approves the connection.
	AuthorizationURL string

	// TokenURL exchanges authorization codes and refresh tokens for
	// access tokens.
	TokenURL string

	// RevocationURL is optional. When non-empty, Revoke POSTs the token
	// here so the vendor drops the grant immediately.
	RevocationURL string

	// DCREndpoint is optional (RFC 7591). When set, the DCR helper can
	// dynamically register a client per workspace. Unused in Phase 2b.
	DCREndpoint string

	// Scopes is the set of OAuth scopes the connector declares it needs.
	// Read-only by default; connectors should follow least-privilege.
	Scopes []string

	// PKCE should always be true for new connectors. Flow code refuses
	// to start a flow when false — there is no reason to run without it.
	PKCE bool

	// UserinfoURL is optional. If set, the service can populate a friendly
	// "connected as <who>" label in the UI after a successful exchange.
	// Not used in Phase 2b wiring; reserved for future work.
	UserinfoURL string

	// ExtraParams are vendor-specific parameters appended to the
	// authorization request (e.g., access_type=offline, prompt=consent).
	ExtraParams map[string]string
}

// ConfigProvider returns the OAuth metadata for a given connector. The
// real implementation calls irmin-connectors through the connectors client;
// tests inject a stub.
type ConfigProvider interface {
	GetOAuthConfig(ctx context.Context, connector *db.Connector) (*Config, error)
}

// Clock is injected for testability. Production wiring uses realClock{}.
type Clock interface {
	Now() time.Time
}

type realClock struct{}

func (realClock) Now() time.Time { return time.Now() }

// Service orchestrates OAuth flows for connections. It is safe for use by
// multiple goroutines; the only mutable state is the HTTP client
// (concurrency-safe by design).
type Service struct {
	db         *db.Database
	provider   ConfigProvider
	httpClient *http.Client
	logger     *slog.Logger
	clock      Clock

	// RedirectURI is the exact callback URL registered with every vendor
	// (e.g. "https://api.irmin.dev/api/v1/oauth/callback"). Kept as a
	// service-level constant because the URI is part of the token exchange
	// and must match byte-for-byte what the vendor has on file.
	RedirectURI string

	// SessionTTL bounds how long an in-flight authorization flow can stay
	// open. 10 minutes is plenty — the user is interactively clicking
	// through consent pages.
	SessionTTL time.Duration

	// RefreshSkew is the safety margin before token expiry at which
	// GetAccessToken proactively refreshes. Prevents downstream calls
	// that land right at the expiry instant.
	RefreshSkew time.Duration
}

// Defaults applied by NewService when the caller doesn't override them.
const (
	defaultSessionTTL  = 10 * time.Minute
	defaultRefreshSkew = 60 * time.Second
)

// Options configures the Service at construction.
type Options struct {
	DB          *db.Database
	Provider    ConfigProvider
	HTTPClient  *http.Client // required; pass lib.NewSafeHTTPClient(ctx) in production
	Logger      *slog.Logger
	Clock       Clock // optional; defaults to realClock{}
	RedirectURI string
	SessionTTL  time.Duration // optional; defaults to 10m
	RefreshSkew time.Duration // optional; defaults to 60s
}

// NewService builds a Service. All required fields are validated; missing
// optional fields fall back to safe defaults.
func NewService(opts Options) (*Service, error) {
	if opts.DB == nil {
		return nil, errors.New("oauth: nil DB")
	}
	if opts.Provider == nil {
		return nil, errors.New("oauth: nil ConfigProvider")
	}
	if opts.HTTPClient == nil {
		return nil, errors.New("oauth: nil HTTPClient")
	}
	if opts.Logger == nil {
		return nil, errors.New("oauth: nil Logger")
	}
	if opts.RedirectURI == "" {
		return nil, errors.New("oauth: empty RedirectURI")
	}
	clock := opts.Clock
	if clock == nil {
		clock = realClock{}
	}
	sessionTTL := opts.SessionTTL
	if sessionTTL == 0 {
		sessionTTL = defaultSessionTTL
	}
	refreshSkew := opts.RefreshSkew
	if refreshSkew == 0 {
		refreshSkew = defaultRefreshSkew
	}
	return &Service{
		db:          opts.DB,
		provider:    opts.Provider,
		httpClient:  opts.HTTPClient,
		logger:      opts.Logger,
		clock:       clock,
		RedirectURI: opts.RedirectURI,
		SessionTTL:  sessionTTL,
		RefreshSkew: refreshSkew,
	}, nil
}

// Sentinel errors callers (controllers, connectors service) use to map
// failure modes onto HTTP responses without importing gorm or inspecting
// wrapped error text.
var (
	// ErrConfigUnavailable means the ConfigProvider returned no OAuth
	// metadata for the connector — either the connector does not support
	// OAuth, or the provider failed to reach it.
	ErrConfigUnavailable = errors.New("oauth: vendor config unavailable")

	// ErrPKCERequired is returned when a Config has PKCE=false. New
	// connectors must use PKCE; we do not fall back.
	ErrPKCERequired = errors.New("oauth: PKCE is required but the config disables it")

	// ErrClientUnconfigured means no OAuth client row exists for the
	// (connector, workspace) pair. For DCR-capable vendors the caller
	// should run the DCR flow; for static clients the admin must
	// configure one.
	ErrClientUnconfigured = errors.New("oauth: no client registered for connector+workspace")

	// ErrStateInvalid covers every "the vendor's reply doesn't match a
	// valid session" case — expired, missing, replayed, or forged state.
	// We use a single sentinel so the callback never reveals which.
	ErrStateInvalid = errors.New("oauth: state is invalid or expired")

	// ErrNotConnected means the connection has no token row yet — the
	// user never completed OAuth, or the row was revoked.
	ErrNotConnected = errors.New("oauth: connection has no oauth token")

	// ErrRefreshRejected indicates the vendor rejected a refresh attempt.
	// Usually means the user revoked the app on the vendor side; the
	// caller should surface a "reconnect" CTA.
	ErrRefreshRejected = errors.New("oauth: vendor rejected refresh token")
)

// VendorError wraps a non-2xx response from a vendor endpoint. Embeds the
// status code and a truncated, ASCII-safe body snippet for server-side
// debugging without leaking secrets back to end users.
//
// Stage names currently emitted: "token_exchange" (authorization-code
// exchange), "refresh" (refresh-token exchange), "dcr" (RFC 7591 dynamic
// client registration). Revoke failures are logged but never returned as
// VendorError — they are best-effort from the caller's perspective.
type VendorError struct {
	Stage      string
	StatusCode int
	Snippet    string // first 500 bytes of body, ascii-safe
}

func (e *VendorError) Error() string {
	return fmt.Sprintf("oauth: vendor %s returned HTTP %d: %s", e.Stage, e.StatusCode, e.Snippet)
}
