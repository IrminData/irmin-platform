package mcp

import (
	"context"
	"errors"
	"strings"

	"irmin-api/db"
	"irmin-api/services"
)

type userCtxKey struct{}

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

func validateAuthAndGetUser(cfg *authConfig, authHeader string) (*db.User, error) {
	token := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
	if token == "" {
		return nil, errors.New("missing token")
	}

	// Use a timeout context to prevent hanging
	ctx, cancel := context.WithTimeout(context.Background(), MCPAuthTimeout)
	defer cancel()

	// Monitor for auth timeout
	go func() {
		<-ctx.Done()
		if ctx.Err() == context.DeadlineExceeded {
			cfg.apiServices.Logger.Error("MCP auth: IdentifyUserFromToken timed out")
		}
	}()

	user, isSystem, err := cfg.apiServices.IdentifyUserFromToken(ctx, token, "en")
	if err != nil {
		return nil, err
	}
	if isSystem {
		return nil, errors.New("system token not permitted for MCP")
	}

	return user, nil
}
