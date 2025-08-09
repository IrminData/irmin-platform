package mcp

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"irmin-api/db"
	mcpresources "irmin-api/mcp/resources"
	mcptools "irmin-api/mcp/tools"
	"irmin-api/services"

	"github.com/gofiber/fiber/v3"
	adaptor "github.com/gofiber/fiber/v3/middleware/adaptor"
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

// --- Authentication plumbing for MCP HTTP ---

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

	// Use the auth service to identify the user
	user, isSystem, err := cfg.apiServices.IdentifyUserFromToken(context.Background(), token, "en")
	if err != nil {
		return nil, err
	}

	// Reject system tokens
	if isSystem {
		return nil, errors.New("system token not permitted for MCP")
	}

	return user, nil
}

func wrapWithHTTPAuth(base http.Handler, cfg *authConfig) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		user, err := validateAuthAndGetUser(cfg, authHeader)
		if err != nil {
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = w.Write([]byte("Unauthorized"))
			return
		}
		ctx := withUserInContext(r.Context(), user)
		base.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RegisterFiber mounts the MCP streamable HTTP handler inside the main app, using env.MCPHTTPPath.
func RegisterFiber(
	app *fiber.App,
	apiServices *services.APIServices,
) {
	server := sdkmcp.NewServer(&sdkmcp.Implementation{Name: "irmin-mcp"}, nil)

	// Register resources and tools from dedicated packages
	mcpresources.RegisterAll(server, apiServices, userFromContext)
	mcptools.RegisterAll(server, apiServices, userFromContext)

	// Wrap the MCP HTTP handler into a Fiber handler with auth
	httpHandler := sdkmcp.NewStreamableHTTPHandler(func(*http.Request) *sdkmcp.Server { return server }, nil)
	authWrapped := wrapWithHTTPAuth(httpHandler, &authConfig{apiServices: apiServices})
	app.All(apiServices.Env.MCPHTTPPath, adaptor.HTTPHandler(authWrapped))
}
