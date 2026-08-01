// Package common hosts the shared pieces every connector composes into
// its own controller. oauth_base.go introduces OAuthConnector — an
// embeddable struct that handles the grunt work of authenticating a
// connector request against Core's OAuth system:
//
//   - Reads X-Irmin-Connection-Id from the inbound Fiber request.
//   - Calls lib.OAuthTokenClient.FetchVendorAccessToken (and the force
//     variant on retry) so the vendor always sees a currently-valid
//     bearer token.
//   - Maps the package sentinel errors from lib onto HTTP status codes
//     Core knows how to surface in the console ("reconnect required" →
//     428, Core unreachable → 502, bad inbound header → 400).
//   - Stamps the connector's declared ConnectionOAuthConfig onto the
//     /info response so the console can render the Connect button for
//     OAuth-backed connectors without a separate metadata call.
//
// Concrete connectors compose *OAuthConnector into their Controllers
// struct. Static-credential connectors (HTTP, Postgres, etc.) can embed
// it too — the helpers no-op cleanly when ConnectionOAuthConfig is nil,
// which keeps the embed uniform across the connector family.
package common

import (
	"errors"

	"irmin-connectors/lib"
	"irmin-connectors/models"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	"github.com/gofiber/fiber/v3"
)

// OAuthConnector holds the shared OAuth machinery a concrete connector
// composes into its controller. One instance per connector process;
// safe for concurrent use (every method operates on the immutable
// Config + a stateless token client).
//
// TokenClient may be nil when the connector doesn't use OAuth — in
// that case every helper short-circuits to the equivalent no-op, which
// means static-credential connectors can embed *OAuthConnector
// uniformly without conditional wiring in each call site.
type OAuthConnector struct {
	// Config is the vendor-side OAuth metadata this connector declares.
	// When nil, the connector is static-credential and
	// InjectInfoOAuthConfig leaves the /info response untouched.
	Config *irminmodels.ConnectionOAuthConfig

	// TokenClient fetches a fresh vendor token from Core on every
	// outbound call. Populated from env (IRMIN_API_BASE_URL +
	// IRMIN_API_TOKEN) during app bootstrap; shared across every
	// connector that embeds this struct.
	TokenClient *lib.OAuthTokenClient
}

// NewOAuthConnector wires an OAuthConnector from the connector app's
// environment. Pass the connector's declared ConnectionOAuthConfig to
// enable the Connect button on the /info response; pass nil for
// static-credential connectors that still want the uniform embed (the
// resolver methods then return ErrOAuthNotConfigured).
//
// The caller retains ownership of the app — the OAuthConnector keeps
// only the token client + logger references it needs.
func NewOAuthConnector(
	app *models.ConnectorsApp,
	cfg *irminmodels.ConnectionOAuthConfig,
) *OAuthConnector {
	return &OAuthConnector{
		Config:      cfg,
		TokenClient: lib.NewOAuthTokenClient(app.Env.APIBaseURL, app.Env.APIToken),
	}
}

// ErrOAuthNotConfigured is returned by the resolver helpers when a
// static-credential connector accidentally asks for a vendor token.
// It's never surfaced from a correctly-wired connector; exists so the
// embed stays uniform without `if o != nil { … }` dances at call sites.
var ErrOAuthNotConfigured = errors.New(
	"oauth: connector has no ConnectionOAuthConfig; cannot resolve vendor token",
)

// ResolveAccessToken returns a currently-valid vendor access token for
// the Connection identified by the inbound request's
// X-Irmin-Connection-Id header. Safe to call on every outbound vendor
// request; Core's fast path is a single HTTPS round-trip with no
// vendor I/O when the stored token isn't near expiry.
//
// The returned *VendorAccessToken has an AuthorizationHeader() helper
// that callers stamp straight onto vendor requests. Sentinel errors
// are translated to HTTP status codes by the companion WriteResolveError.
func (o *OAuthConnector) ResolveAccessToken(c fiber.Ctx) (*lib.VendorAccessToken, error) {
	return o.resolve(c, false /* force */)
}

// ForceRefreshAccessToken is the retry variant: it asks Core to rotate
// the stored token unconditionally. Callers use this after a vendor
// returns 401 on a token that was still within the local expiry
// window (i.e., the user revoked Irmin at the vendor side mid-flight).
func (o *OAuthConnector) ForceRefreshAccessToken(c fiber.Ctx) (*lib.VendorAccessToken, error) {
	return o.resolve(c, true /* force */)
}

// resolve is the shared body for both variants. Pulled apart from the
// two exported helpers so the public surface reads as two small
// intention-named methods rather than a single force-bool entry point
// that leaks an internal concern to every call site.
func (o *OAuthConnector) resolve(c fiber.Ctx, force bool) (*lib.VendorAccessToken, error) {
	if o == nil || o.TokenClient == nil || o.Config == nil {
		return nil, ErrOAuthNotConfigured
	}
	connectionID, headerErr := lib.ConnectionIDFromRequestHeader(
		func(k string) string { return c.Get(k) },
	)
	if headerErr != nil {
		return nil, headerErr
	}
	ctx := c.Context()
	if force {
		return o.TokenClient.ForceRefreshVendorAccessToken(ctx, connectionID)
	}
	return o.TokenClient.FetchVendorAccessToken(ctx, connectionID)
}

// oauthErrorPayload is the JSON body we send on any resolver error. The
// "code" field is the sentinel name so the console can branch on it
// deterministically across vendor-specific connectors.
type oauthErrorPayload struct {
	Error string `json:"error"`
	Code  string `json:"code"`
}

// WriteResolveError maps a resolver error onto the appropriate HTTP
// response. Centralized so every connector surfaces identical status
// codes for the same failure modes — the console relies on 428 as the
// "render Reconnect CTA" signal, for instance.
//
// Status mapping:
//
//   - ErrNotConnected         → 428 Precondition Required (reconnect needed)
//   - ErrRefreshRejected      → 428 Precondition Required (reconnect needed)
//   - ErrMissingConnectionHeader → 400 Bad Request
//   - ErrOAuthNotConfigured   → 500 Internal Server Error (wiring bug)
//   - ErrCoreUnavailable      → 502 Bad Gateway (transient)
//   - anything else           → 500 Internal Server Error
func (o *OAuthConnector) WriteResolveError(c fiber.Ctx, err error) error {
	status, code := classifyResolveError(err)
	return c.Status(status).JSON(oauthErrorPayload{
		Error: err.Error(),
		Code:  code,
	})
}

// classifyResolveError is the pure mapping function. Extracted so
// WriteResolveError stays easy to skim and so tests can assert on the
// mapping without spinning up a fiber.Ctx.
func classifyResolveError(err error) (int, string) {
	switch {
	case errors.Is(err, lib.ErrNotConnected):
		return fiber.StatusPreconditionRequired, "oauth_not_connected"
	case errors.Is(err, lib.ErrRefreshRejected):
		return fiber.StatusPreconditionRequired, "oauth_refresh_rejected"
	case errors.Is(err, lib.ErrMissingConnectionHeader):
		return fiber.StatusBadRequest, "oauth_missing_connection_header"
	case errors.Is(err, ErrOAuthNotConfigured):
		return fiber.StatusInternalServerError, "oauth_not_configured"
	case errors.Is(err, lib.ErrCoreUnavailable):
		return fiber.StatusBadGateway, "oauth_core_unavailable"
	default:
		return fiber.StatusInternalServerError, "oauth_error"
	}
}

// InjectInfoOAuthConfig stamps this connector's ConnectionOAuthConfig
// onto the provided /info response. No-op when the connector declared
// no OAuth config — callers pass their regular ConnectorDetails through
// this method uniformly regardless of OAuth status.
func (o *OAuthConnector) InjectInfoOAuthConfig(info *models.ConnectorDetails) {
	if o == nil || info == nil || o.Config == nil {
		return
	}
	info.ConnectionOAuthConfig = o.Config
}

// ResolveOrWriteError is a convenience for the common "one-shot" call
// pattern: resolve the token, or write the error and stop. Returns
// (token, true) on success, (nil, false) when the error response has
// already been written. Lets concrete controllers keep the happy-path
// branch short:
//
//	tok, ok := o.ResolveOrWriteError(c)
//	if !ok {
//	    return nil
//	}
//	// ... make vendor call with tok.AuthorizationHeader()
func (o *OAuthConnector) ResolveOrWriteError(c fiber.Ctx) (*lib.VendorAccessToken, bool) {
	tok, err := o.ResolveAccessToken(c)
	if err != nil {
		_ = o.WriteResolveError(c, err)
		return nil, false
	}
	return tok, true
}
