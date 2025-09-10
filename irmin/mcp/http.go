package mcp

import (
	"net/http"

	"github.com/gofiber/fiber/v3"
	adaptor "github.com/gofiber/fiber/v3/middleware/adaptor"
)

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

// mountHTTPHandler keeps the existing /mcp endpoint intact.
func mountHTTPHandler(app *fiber.App, path string, h http.Handler, cfg *authConfig) {
	authWrapped := wrapWithHTTPAuth(h, cfg)
	app.All(path, adaptor.HTTPHandler(authWrapped))
}
