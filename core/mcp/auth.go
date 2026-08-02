package mcp

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"irmin-api/db"
	"irmin-api/services"
)

type userCtxKey struct{}
type aiAppCtxKey struct{}
type requestMetadataCtxKey struct{}

// cachedAIAppAuthResult caches the result of AI app authentication so
// the StreamableHTTPHandler callback can reuse it without a second DB call.
type cachedAIAppAuthResult struct {
	aiApp *db.AIApplication
}

type aiAppAuthCacheCtxKey struct{}

// RequestMetadata contains HTTP request information for audit logging.
type RequestMetadata struct {
	IP          string
	UserAgent   string
	Origin      string
	ContentType string
}

func withRequestMetadataInContext(ctx context.Context, metadata *RequestMetadata) context.Context {
	return context.WithValue(ctx, requestMetadataCtxKey{}, metadata)
}

func requestMetadataFromContext(ctx context.Context) (*RequestMetadata, bool) {
	m, ok := ctx.Value(requestMetadataCtxKey{}).(*RequestMetadata)
	return m, ok && m != nil
}

func withAIAppAuthCache(ctx context.Context, aiApp *db.AIApplication) context.Context {
	return context.WithValue(ctx, aiAppAuthCacheCtxKey{}, &cachedAIAppAuthResult{aiApp: aiApp})
}

func aiAppAuthCacheFromContext(ctx context.Context) (*db.AIApplication, bool) {
	cached, ok := ctx.Value(aiAppAuthCacheCtxKey{}).(*cachedAIAppAuthResult)
	if !ok || cached == nil {
		return nil, false
	}
	return cached.aiApp, cached.aiApp != nil
}

// ExtractRequestMetadata extracts request metadata from an HTTP request for audit logging.
func ExtractRequestMetadata(r *http.Request) *RequestMetadata {
	// Get IP address (check X-Forwarded-For first for proxied requests)
	ip := r.Header.Get("X-Forwarded-For")
	if ip == "" {
		ip = r.Header.Get("X-Real-IP")
	}
	if ip == "" {
		ip = r.RemoteAddr
	}
	// Take only the first IP if there are multiple (X-Forwarded-For can be comma-separated)
	if comma := strings.Index(ip, ","); comma != -1 {
		ip = strings.TrimSpace(ip[:comma])
	}

	return &RequestMetadata{
		IP:          ip,
		UserAgent:   r.Header.Get("User-Agent"),
		Origin:      r.Header.Get("Origin"),
		ContentType: r.Header.Get("Content-Type"),
	}
}

type authConfig struct {
	apiServices *services.APIServices
}

func withUserInContext(ctx context.Context, user *db.User) context.Context {
	return context.WithValue(ctx, userCtxKey{}, user)
}

func userFromContext(ctx context.Context) (*db.User, bool) {
	u, ok := ctx.Value(userCtxKey{}).(*db.User)
	return u, ok && u != nil
}

func withAIAppInContext(ctx context.Context, aiApp *db.AIApplication) context.Context {
	return context.WithValue(ctx, aiAppCtxKey{}, aiApp)
}

func validateAuthAndGetUser(cfg *authConfig, authHeader string) (*db.User, error) {
	token := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
	if token == "" {
		return nil, errors.New("missing token")
	}

	// Use a timeout context to prevent hanging
	ctx, cancel := context.WithTimeout(context.Background(), MCPAuthTimeout)
	defer cancel()

	user, tokenType, err := cfg.apiServices.IdentifyUserFromToken(ctx, token, "en")
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			cfg.apiServices.Logger.Error("MCP auth: IdentifyUserFromToken timed out")
		}
		return nil, err
	}
	if tokenType == services.TokenTypeSystem {
		return nil, errors.New("system token not permitted for MCP")
	}

	return user, nil
}

// validateAuthAndGetUserOrAIApp validates the auth header and returns either a user or an AI application.
// AI Application API keys are prefixed with "ai_".
func validateAuthAndGetUserOrAIApp(cfg *authConfig, authHeader string) (*db.User, *db.AIApplication, error) {
	token := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
	if token == "" {
		return nil, nil, errors.New("missing token")
	}

	// Check if this is an AI Application API key
	if strings.HasPrefix(token, "ai_") {
		// Use a timeout context for the database lookup
		ctx, cancel := context.WithTimeout(context.Background(), MCPAuthTimeout)
		defer cancel()

		aiApp, err := cfg.apiServices.DB.GetAIApplicationByAPIKeyWithContext(ctx, token)
		if err != nil {
			cfg.apiServices.Logger.Error("Invalid AI Application API key", "error", err)
			return nil, nil, errors.New("invalid AI Application API key")
		}
		return nil, aiApp, nil
	}

	// Use a timeout context to prevent hanging
	ctx, cancel := context.WithTimeout(context.Background(), MCPAuthTimeout)
	defer cancel()

	user, tokenType, err := cfg.apiServices.IdentifyUserFromToken(ctx, token, "en")
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			cfg.apiServices.Logger.Error("MCP auth: IdentifyUserFromToken timed out")
		}
		return nil, nil, err
	}
	if tokenType == services.TokenTypeSystem {
		return nil, nil, errors.New("system token not permitted for MCP")
	}

	return user, nil, nil
}
