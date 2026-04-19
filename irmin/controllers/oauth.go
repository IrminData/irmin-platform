package controllers

import (
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"irmin-api/db"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/services"
	"irmin-api/services/oauth"
	"regexp"
	"strings"
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// Caps on vendor-supplied callback query parameters. We have to render
// these in the public callback page, so they need to be bounded and
// shape-checked before they flow into the response — a misbehaving or
// malicious vendor shouldn't be able to balloon the response body or
// inject markup by piggybacking on the error channel.
const (
	// oauthCallbackMaxErrorCodeLen caps the `error` query param. RFC 6749
	// defines error codes as short ASCII tokens (invalid_request,
	// access_denied, etc.); anything wildly longer is abuse and is
	// replaced with a sentinel.
	oauthCallbackMaxErrorCodeLen = 64
	// oauthCallbackMaxDescriptionLen caps `error_description`. The spec
	// allows free-form text but it's meant for humans; 1 KiB is more than
	// enough for any legitimate message.
	oauthCallbackMaxDescriptionLen = 1024
	// oauthCallbackInvalidErrorSentinel replaces `error` codes that don't
	// match the shape we accept. Keeps the console's branching stable
	// regardless of what the vendor sent.
	oauthCallbackInvalidErrorSentinel = "vendor_error_invalid"
)

// oauthErrorCodePattern is the RFC 6749 shape we accept for `error`
// tokens — lowercase ASCII letters, digits, and underscores, starting
// with a letter. Validated as a whole match, not a find.
var oauthErrorCodePattern = regexp.MustCompile(`^[a-z][a-z0-9_]{0,63}$`)

// --- User-auth endpoints ------------------------------------------------------

// StartConnectionOAuth godoc
// @Summary Start an OAuth connection flow
// @Description Creates a session and returns the vendor authorization URL to open in a popup.
// @Tags oauth
// @Security ApiKeyAuth
// @Param workspace path string true "Workspace slug"
// @Param connection path string true "Connection SQID"
// @Success 200 {object} irminmodels.IrminAPIResponse "Authorization URL returned"
// @Failure 400 {object} irminmodels.IrminAPIResponse "OAuth not available for this connector"
// @Failure 401 {object} irminmodels.IrminAPIResponse
// @Failure 403 {object} irminmodels.IrminAPIResponse
// @Router /workspaces/{workspace}/connections/{connection}/oauth/start [post]
func (api *APIControllers) StartConnectionOAuth(c fiber.Ctx) error {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		return api.handleServiceError(
			c,
			"Error validating workspace parameters",
			services.NewInternalError(err.Error()),
			dict,
		)
	}
	connection, ok := c.Locals("connection").(*db.Connection)
	if !ok {
		return api.handleServiceError(
			c,
			"Error getting connection from locals",
			services.NewInternalError("connection not found in context"),
			dict,
		)
	}
	if api.Services.OAuthService == nil {
		return api.handleServiceError(c, "OAuth service unavailable",
			services.NewInternalError("oauth service is not initialised"), dict)
	}

	authURL, startErr := api.Services.OAuthService.StartFlow(c.Context(), connection, user.ID)
	if startErr != nil {
		return api.mapOAuthError(c, "Failed to start OAuth flow", startErr, dict)
	}

	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeInfo,
		Description:  fmt.Sprintf("oauth.start for %s", connection.Name),
		UserID:       &user.ID,
		WorkspaceID:  &workspace.ID,
		ConnectionID: &connection.ID,
	})

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: map[string]string{"authorization_url": authURL},
	})
}

// GetConnectionOAuthStatus godoc
// @Summary Read the OAuth status of a connection
// @Description Returns whether the connection currently has an OAuth token and, if so, its expiry, scope, and refresh status. Safe to poll from the console to drive Connect/Reconnect/Disconnect UI.
// @Tags oauth
// @Security ApiKeyAuth
// @Param workspace path string true "Workspace slug"
// @Param connection path string true "Connection SQID"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=oauth.ConnectionStatus}
// @Failure 401 {object} irminmodels.IrminAPIResponse
// @Failure 403 {object} irminmodels.IrminAPIResponse
// @Router /workspaces/{workspace}/connections/{connection}/oauth/status [get]
func (api *APIControllers) GetConnectionOAuthStatus(c fiber.Ctx) error {
	_, dict, _, _, err := api.validateWorkspaceParams(c)
	if err != nil {
		return api.handleServiceError(
			c,
			"Error validating workspace parameters",
			services.NewInternalError(err.Error()),
			dict,
		)
	}
	connection, ok := c.Locals("connection").(*db.Connection)
	if !ok {
		return api.handleServiceError(
			c,
			"Error getting connection from locals",
			services.NewInternalError("connection not found in context"),
			dict,
		)
	}
	if api.Services.OAuthService == nil {
		return api.handleServiceError(c, "OAuth service unavailable",
			services.NewInternalError("oauth service is not initialised"), dict)
	}

	status, statusErr := api.Services.OAuthService.GetConnectionOAuthStatus(
		c.Context(), connection.ID,
	)
	if statusErr != nil {
		return api.mapOAuthError(c, "Failed to read OAuth status", statusErr, dict)
	}
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: status,
	})
}

// DisconnectConnectionOAuth godoc
// @Summary Disconnect the OAuth connection
// @Description Revokes the vendor token (best effort) and removes the stored credentials.
// @Tags oauth
// @Security ApiKeyAuth
// @Param workspace path string true "Workspace slug"
// @Param connection path string true "Connection SQID"
// @Success 200 {object} irminmodels.IrminAPIResponse
// @Failure 401 {object} irminmodels.IrminAPIResponse
// @Failure 403 {object} irminmodels.IrminAPIResponse
// @Router /workspaces/{workspace}/connections/{connection}/oauth/disconnect [post]
func (api *APIControllers) DisconnectConnectionOAuth(c fiber.Ctx) error {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		return api.handleServiceError(
			c,
			"Error validating workspace parameters",
			services.NewInternalError(err.Error()),
			dict,
		)
	}
	connection, ok := c.Locals("connection").(*db.Connection)
	if !ok {
		return api.handleServiceError(
			c,
			"Error getting connection from locals",
			services.NewInternalError("connection not found in context"),
			dict,
		)
	}
	if api.Services.OAuthService == nil {
		return api.handleServiceError(c, "OAuth service unavailable",
			services.NewInternalError("oauth service is not initialised"), dict)
	}

	if revokeErr := api.Services.OAuthService.Revoke(c.Context(), connection.ID); revokeErr != nil {
		return api.mapOAuthError(c, "Failed to disconnect OAuth", revokeErr, dict)
	}

	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeInfo,
		Description:  fmt.Sprintf("oauth.disconnect for %s", connection.Name),
		UserID:       &user.ID,
		WorkspaceID:  &workspace.ID,
		ConnectionID: &connection.ID,
	})

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: "disconnected",
	})
}

// --- Public callback ----------------------------------------------------------

// OAuthCallback godoc
// @Summary OAuth authorization callback (public)
// @Description Vendor redirects here after user approval. Exchanges the code for tokens and posts a message to the opener window.
// @Tags oauth
// @Produce html
// @Param state query string true "Opaque session state"
// @Param code query string false "Authorization code"
// @Param error query string false "Vendor-reported error code"
// @Param error_description query string false "Vendor-reported error message"
// @Success 200 {string} string "HTML with postMessage script"
// @Router /oauth/callback [get]
func (api *APIControllers) OAuthCallback(c fiber.Ctx) error {
	if api.Services.OAuthService == nil {
		return renderOAuthCallbackHTML(c, api.Env.ConsoleURL, oauthCallbackResult{
			Error: "server_error", Description: "oauth service unavailable",
		})
	}
	// The vendor might send back an error instead of code+state (user
	// denied, scope rejected, ...). Surface it — but bound the shape so
	// we're not rendering arbitrary vendor-controlled text in a public
	// response. Defense in depth: HTML escape + JSON encode already
	// neutralise XSS; these caps cap the response size and keep the
	// console's `error` branching on a known-shape token.
	if errCode := c.Query("error"); errCode != "" {
		return renderOAuthCallbackHTML(c, api.Env.ConsoleURL, oauthCallbackResult{
			Error:       sanitizeOAuthErrorCode(errCode),
			Description: truncateRunes(c.Query("error_description"), oauthCallbackMaxDescriptionLen),
		})
	}
	state := c.Query("state")
	code := c.Query("code")

	result, cbErr := api.Services.OAuthService.HandleCallback(c.Context(), state, code)
	if cbErr != nil {
		api.Logger.InfoContext(c.Context(), "oauth callback rejected", "error", cbErr)
		return renderOAuthCallbackHTML(c, api.Env.ConsoleURL, oauthCallbackResult{
			Error:       classifyCallbackError(cbErr),
			Description: callbackErrorDescription(cbErr),
		})
	}
	connection := result.Connection

	// The callback is public — no user is in the request context. Credit
	// the event to the user who originally clicked "Connect" (pulled off
	// the session row). Fall back to the connection owner for legacy
	// sessions that pre-date InitiatingUserID.
	auditUserID := result.InitiatingUserID
	if auditUserID == nil && connection.OwnerID != 0 {
		ownerID := connection.OwnerID
		auditUserID = &ownerID
	}
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeInfo,
		Description:  fmt.Sprintf("oauth.connected for %s", connection.Name),
		UserID:       auditUserID,
		WorkspaceID:  &connection.WorkspaceID,
		ConnectionID: &connection.ID,
	})

	connectionSqid, encodeErr := api.SQIDManager.Encode("connections", uint64(connection.ID))
	if encodeErr != nil {
		// Should never fail; fall back to a generic success without the SQID.
		api.Logger.ErrorContext(c.Context(), "sqid encode failed in oauth callback", "error", encodeErr)
		return renderOAuthCallbackHTML(c, api.Env.ConsoleURL, oauthCallbackResult{Success: true})
	}
	return renderOAuthCallbackHTML(c, api.Env.ConsoleURL, oauthCallbackResult{
		Success:      true,
		ConnectionID: connectionSqid,
	})
}

// --- System-token endpoint ----------------------------------------------------

// systemAccessTokenRequest is the body irmin-connectors sends when it needs
// a fresh access token for a connection. Uses raw uint (not SQID) because
// it's an internal service-to-service call where SQID encoding would add
// coupling without benefit.
type systemAccessTokenRequest struct {
	ConnectionID uint `json:"connection_id"`
}

type systemAccessTokenResponse struct {
	AccessToken string     `json:"access_token"`
	TokenType   string     `json:"token_type"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
	Scope       string     `json:"scope,omitempty"`
}

// SystemOAuthAccessToken godoc
// @Summary Fetch a fresh access token (system token only)
// @Description Returns a non-expired access token for a connection, refreshing transparently if needed. Called by irmin-connectors.
// @Tags oauth
// @Security SystemTokenAuth
// @Accept json
// @Produce json
// @Param request body systemAccessTokenRequest true "connection_id"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=systemAccessTokenResponse}
// @Failure 401 {object} irminmodels.IrminAPIResponse
// @Failure 403 {object} irminmodels.IrminAPIResponse
// @Router /system/oauth/access-token [post]
func (api *APIControllers) SystemOAuthAccessToken(c fiber.Ctx) error {
	// Middleware normally populates the locale dictionary; if something
	// upstream didn't, fall back to an empty dict so every error path
	// still flows through handleServiceError (consistent logging,
	// status-code mapping, Sentry capture). locales.T tolerates an
	// empty/nil dict and falls back to the English defaults, so no
	// caller sees the raw translation key.
	dict, _ := c.Locals("dict").(locales.Dictionary)
	isSystem, isSystemOk := c.Locals("is_system").(bool)
	if !isSystemOk || !isSystem {
		return api.handleServiceError(c, "access denied", services.ErrAccessDenied, dict)
	}
	if api.Services.OAuthService == nil {
		return api.handleServiceError(c, "OAuth service unavailable",
			services.NewInternalError("oauth service is not initialised"), dict)
	}

	var req systemAccessTokenRequest
	if parseErr := c.Bind().JSON(&req); parseErr != nil {
		return api.handleServiceError(c, "invalid request body",
			services.ErrInvalidRequest, dict)
	}
	if req.ConnectionID == 0 {
		return api.handleServiceError(c, "connection_id is required",
			services.ErrInvalidRequest, dict)
	}

	token, tokErr := api.Services.OAuthService.GetAccessToken(c.Context(), req.ConnectionID)
	if tokErr != nil {
		return api.mapOAuthError(c, "Failed to get access token", tokErr, dict)
	}
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: systemAccessTokenResponse{
			AccessToken: token.Value,
			TokenType:   token.TokenType,
			ExpiresAt:   token.ExpiresAt,
			Scope:       token.Scope,
		},
	})
}

// --- Error mapping ------------------------------------------------------------

// oauthErrorCategory is the HTTP-level class an oauth error collapses to.
// Extracted so tests can lock in the mapping without standing up a Fiber
// context; mapOAuthError is the thin adapter that turns a category into a
// handleServiceError call.
type oauthErrorCategory int

const (
	// oauthCategoryInternal is the fallback for unrecognized errors — 500.
	oauthCategoryInternal oauthErrorCategory = iota
	// oauthCategoryBadRequest covers misconfig and invalid state → 400.
	oauthCategoryBadRequest
	// oauthCategoryUnauthorized is "vendor rejected your refresh, please
	// reconnect" → 401-ish (ErrAccessDenied).
	oauthCategoryUnauthorized
	// oauthCategoryNotFound is "this connection has no OAuth token" → 404.
	oauthCategoryNotFound
	// oauthCategoryVendor is a non-2xx from the vendor's endpoint — logged
	// with details server-side and surfaced as generic internal error to
	// the client.
	oauthCategoryVendor
)

// categorizeOAuthError pattern-matches the error against the package
// sentinels + *VendorError and returns the HTTP category. Pure and fully
// table-testable.
func categorizeOAuthError(err error) oauthErrorCategory {
	if err == nil {
		return oauthCategoryInternal
	}
	switch {
	case errors.Is(err, oauth.ErrConfigUnavailable),
		errors.Is(err, oauth.ErrPKCERequired),
		errors.Is(err, oauth.ErrClientUnconfigured),
		errors.Is(err, oauth.ErrDCRUnavailable),
		errors.Is(err, oauth.ErrStateInvalid):
		return oauthCategoryBadRequest
	case errors.Is(err, oauth.ErrNotConnected):
		return oauthCategoryNotFound
	case errors.Is(err, oauth.ErrRefreshRejected):
		return oauthCategoryUnauthorized
	}
	var vendorErr *oauth.VendorError
	if errors.As(err, &vendorErr) {
		return oauthCategoryVendor
	}
	return oauthCategoryInternal
}

// mapOAuthError translates the package sentinels and *VendorError into HTTP
// responses using the shared error handler. The goal is a stable wire
// contract: the same logical failure always produces the same status code
// across start/callback/disconnect/access-token endpoints.
func (api *APIControllers) mapOAuthError(
	c fiber.Ctx,
	consoleLogPrefix string,
	err error,
	dict locales.Dictionary,
) error {
	category := categorizeOAuthError(err)
	switch category {
	case oauthCategoryBadRequest:
		return api.handleServiceError(c, consoleLogPrefix,
			fmt.Errorf("%w: %w", services.ErrInvalidRequest, err), dict)
	case oauthCategoryNotFound:
		return api.handleServiceError(c, consoleLogPrefix,
			fmt.Errorf("%w: %w", services.ErrNotFound, err), dict)
	case oauthCategoryUnauthorized:
		// Vendor rejected refresh; user needs to reconnect. ErrAccessDenied
		// is the closest semantic match for "credentials no longer valid".
		return api.handleServiceError(c, consoleLogPrefix,
			fmt.Errorf("%w: %w", services.ErrAccessDenied, err), dict)
	case oauthCategoryVendor:
		var vendorErr *oauth.VendorError
		_ = errors.As(err, &vendorErr) // guaranteed by categorizeOAuthError
		// Don't leak vendor response bodies to end users; log them and
		// return a generic "upstream failed" message.
		api.Logger.WarnContext(c.Context(),
			"vendor error during oauth flow",
			"stage", vendorErr.Stage,
			"status", vendorErr.StatusCode,
			"snippet", vendorErr.Snippet)
		return api.handleServiceError(c, consoleLogPrefix,
			services.NewInternalErrorf("vendor error: stage=%s status=%d",
				vendorErr.Stage, vendorErr.StatusCode), dict)
	case oauthCategoryInternal:
		fallthrough
	default:
		return api.handleServiceError(c, consoleLogPrefix, err, dict)
	}
}

// --- Callback HTML rendering --------------------------------------------------

type oauthCallbackResult struct {
	Success      bool
	ConnectionID string // sqid, set on success
	Error        string // short machine-readable code on failure
	Description  string // human-readable error detail
}

// renderOAuthCallbackHTML writes the popup-closing HTML to the client. The
// page posts a structured message to the opener window (the console) and
// then closes itself. The opener uses the message to advance the wizard.
//
// The response-scoped Content-Security-Policy overrides any site-wide CSP
// that Helmet may have set. The callback needs a single inline script to
// run postMessage + window.close; everything else is locked down. The
// frame-ancestors directive replaces X-Frame-Options and prevents the
// popup from being clickjacked.
func renderOAuthCallbackHTML(c fiber.Ctx, consoleURL string, result oauthCallbackResult) error {
	c.Set("Content-Type", "text/html; charset=utf-8")
	c.Set("Cache-Control", "no-store")
	c.Set("X-Content-Type-Options", "nosniff")
	c.Set("Content-Security-Policy",
		"default-src 'none'; "+
			"style-src 'unsafe-inline'; "+
			"script-src 'unsafe-inline'; "+
			"frame-ancestors 'none'")
	return c.Status(fiber.StatusOK).SendString(buildCallbackHTML(consoleURL, result))
}

// sanitizeOAuthErrorCode returns the input if it matches RFC 6749's
// error-code shape, otherwise a fixed sentinel. Keeps vendor-controlled
// data from bypassing the console's branching on known error strings,
// and bounds what a misbehaving vendor can sneak into the response.
func sanitizeOAuthErrorCode(s string) string {
	if oauthErrorCodePattern.MatchString(s) {
		return s
	}
	return oauthCallbackInvalidErrorSentinel
}

// truncateRunes caps a string at maxRunes runes, appending a visible
// ellipsis when it truncated. Rune-based so we don't chop a multi-byte
// sequence in half.
func truncateRunes(s string, maxRunes int) string {
	if maxRunes <= 0 {
		return ""
	}
	runes := []rune(s)
	if len(runes) <= maxRunes {
		return s
	}
	return string(runes[:maxRunes]) + "…"
}

// scriptSafeJSON marshals v for embedding inside an inline <script>
// block. Go's encoding/json escapes <, >, and & in string values by
// default, but that's contingent on EscapeHTML staying true in every
// code path. We harden by doing an explicit replace of those bytes
// post-marshal so the output is script-tag-safe regardless of how
// callers configure the encoder or what non-string types end up in v.
// A JSON document has no legitimate bare <, >, or & outside strings, so
// these replacements are either no-ops (outside strings) or equivalent
// escape forms (inside strings). Either way, `</script>` cannot appear
// in the result.
func scriptSafeJSON(v any) string {
	b, err := json.Marshal(v)
	if err != nil {
		// Callers pass simple map/string inputs; Marshal of those can't
		// fail in practice. If it does, degrade to null to avoid leaking
		// an empty string into the script block.
		return "null"
	}
	s := string(b)
	s = strings.ReplaceAll(s, "<", `\u003c`)
	s = strings.ReplaceAll(s, ">", `\u003e`)
	s = strings.ReplaceAll(s, "&", `\u0026`)
	return s
}

// buildCallbackHTML assembles the response body. Values that flow into
// JavaScript go through scriptSafeJSON (JSON-encoded and then belt-and-
// braces scrubbed for `<`, `>`, `&`). The target-origin guard on
// postMessage prevents leakage if the popup ended up framed by an
// unrelated site.
func buildCallbackHTML(consoleURL string, result oauthCallbackResult) string {
	messageType := "irmin:oauth:success"
	if !result.Success {
		messageType = "irmin:oauth:error"
	}
	payload := map[string]any{"type": messageType}
	if result.Success {
		if result.ConnectionID != "" {
			payload["connectionId"] = result.ConnectionID
		}
	} else {
		if result.Error != "" {
			payload["error"] = result.Error
		}
		if result.Description != "" {
			payload["description"] = result.Description
		}
	}
	payloadJSON := scriptSafeJSON(payload)
	// scriptSafeJSON of a string is still a valid JS string literal —
	// the `<`/`>`/`&` replacements use `\uXXXX` escapes which JSON and
	// JavaScript both treat as identity within strings.
	targetOriginJSON := scriptSafeJSON(consoleURL)

	heading := "Connection complete."
	if !result.Success {
		heading = "Connection failed."
	}
	body := ""
	if !result.Success {
		// Bound the visible body even on the HTML-escaped side — the
		// callback response is public and we don't want a misbehaving
		// vendor inflating it via a megabyte-long description. The
		// query-layer truncate already caps this, but the defense here
		// survives refactors that forget to apply it upstream.
		if result.Description != "" {
			body = html.EscapeString(truncateRunes(result.Description, oauthCallbackMaxDescriptionLen))
		} else if result.Error != "" {
			body = html.EscapeString(truncateRunes(result.Error, oauthCallbackMaxErrorCodeLen))
		}
	}

	return fmt.Sprintf(callbackHTMLTemplate,
		html.EscapeString(heading),
		html.EscapeString(heading),
		body,
		payloadJSON,
		targetOriginJSON,
	)
}

// callbackHTMLTemplate is the shell of the popup page. Kept small and
// dependency-free — it renders in any browser and degrades to a plain page
// with a close-this-window hint if scripts are disabled.
const callbackHTMLTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>%s</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0;padding:48px;color:#1a2330;background:#f6f9fc}
main{max-width:440px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08)}
h1{font-size:20px;margin:0 0 8px}
p{color:#54606d;margin:0;line-height:1.5}
</style>
</head>
<body>
<main>
<h1>%s</h1>
<p>%s</p>
<p>You can close this window.</p>
</main>
<script>
(function(){
  var payload = %s;
  var origin = %s;
  try {
    if (window.opener && origin) {
      window.opener.postMessage(payload, origin);
    }
  } catch (e) {}
  setTimeout(function(){ try { window.close(); } catch(e){} }, 200);
})();
</script>
</body>
</html>
`

// classifyCallbackError maps oauth sentinels to short, stable machine
// codes the console can branch on. Consumers receive the same strings
// regardless of which sentinel fired, decoupling UI copy from internals.
func classifyCallbackError(err error) string {
	switch {
	case errors.Is(err, oauth.ErrStateInvalid):
		return "state_invalid"
	case errors.Is(err, oauth.ErrConfigUnavailable),
		errors.Is(err, oauth.ErrPKCERequired),
		errors.Is(err, oauth.ErrClientUnconfigured),
		errors.Is(err, oauth.ErrDCRUnavailable):
		return "config_unavailable"
	case errors.Is(err, oauth.ErrRefreshRejected):
		return "refresh_rejected"
	case errors.Is(err, oauth.ErrNotConnected):
		return "not_connected"
	}
	var ve *oauth.VendorError
	if errors.As(err, &ve) {
		return "vendor_error"
	}
	return "internal_error"
}

// callbackErrorDescription returns a short human description derived from
// the sentinel. Intentionally scrubbed of vendor body snippets — those go
// to server logs only via mapOAuthError.
func callbackErrorDescription(err error) string {
	switch {
	case errors.Is(err, oauth.ErrStateInvalid):
		return "The OAuth session has expired or is invalid. Try again."
	case errors.Is(err, oauth.ErrConfigUnavailable),
		errors.Is(err, oauth.ErrPKCERequired):
		return "OAuth is not available for this connector."
	case errors.Is(err, oauth.ErrClientUnconfigured),
		errors.Is(err, oauth.ErrDCRUnavailable):
		return "No OAuth client is configured. Ask an administrator."
	case errors.Is(err, oauth.ErrRefreshRejected):
		return "Reconnect is required."
	}
	var ve *oauth.VendorError
	if errors.As(err, &ve) {
		return "The external service rejected the request."
	}
	return "An unexpected error occurred."
}
