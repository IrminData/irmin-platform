package mcp

import (
	"context"
	"fmt"
	"net/http"
	"strconv"

	"github.com/getsentry/sentry-go"
	"github.com/gofiber/fiber/v3"
	adaptor "github.com/gofiber/fiber/v3/middleware/adaptor"
)

// responseMonitor wraps http.ResponseWriter to monitor MCP SDK handler responses
type responseMonitor struct {
	http.ResponseWriter
	logger interface {
		Info(msg string, args ...any)
		Error(msg string, args ...any)
	}
	path   string
	method string
	userID uint
}

func (rm *responseMonitor) WriteHeader(statusCode int) {
	// Only log errors or unusual status codes
	if statusCode >= ErrorStatusCodeThreshold {
		rm.logger.Error("MCP SDK handler error response",
			"path", rm.path,
			"method", rm.method,
			"user_id", rm.userID,
			"status", statusCode)
	}
	// Capture 5xx errors to Sentry with error level
	if statusCode >= http.StatusInternalServerError {
		sentry.WithScope(func(scope *sentry.Scope) {
			scope.SetLevel(sentry.LevelError)
			scope.SetTag("http.status_code", strconv.Itoa(statusCode))
			scope.SetTag("http.method", rm.method)
			scope.SetTag("http.path", rm.path)
			sentry.CaptureMessage(fmt.Sprintf(
				"MCP handler 5xx: %d %s %s", statusCode, rm.method, rm.path,
			))
		})
	}
	rm.ResponseWriter.WriteHeader(statusCode)
}

func (rm *responseMonitor) Write(data []byte) (int, error) {
	// Only log if there's an error or very large responses
	if len(data) > LargeResponseThreshold {
		rm.logger.Info("MCP SDK handler large response",
			"path", rm.path,
			"method", rm.method,
			"user_id", rm.userID,
			"bytes", len(data))
	}
	return rm.ResponseWriter.Write(data)
}

func wrapWithHTTPAuth(base http.Handler, cfg *authConfig) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Create a timeout context for the entire request
		ctx, cancel := context.WithTimeout(r.Context(), MCPAttachTimeout)
		defer cancel()

		authHeader := r.Header.Get("Authorization")
		user, err := validateAuthAndGetUser(cfg, authHeader)
		if err != nil {
			cfg.apiServices.Logger.Warn("MCP auth failed",
				"error", err,
				"path", r.URL.Path,
				"method", r.Method)
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = w.Write([]byte("Unauthorized"))
			return
		}

		// Enrich context with user
		userCtx := withUserInContext(ctx, user)

		// Only log MCP requests for debugging (can be removed in production)
		cfg.apiServices.Logger.Debug("MCP HTTP request",
			"path", r.URL.Path,
			"method", r.Method,
			"user_id", user.ID)

		// Create a wrapper to monitor response
		responseWrapper := &responseMonitor{
			ResponseWriter: w,
			logger:         cfg.apiServices.Logger,
			path:           r.URL.Path,
			method:         r.Method,
			userID:         user.ID,
		}

		base.ServeHTTP(responseWrapper, r.WithContext(userCtx))
	})
}

// mountHTTPHandler keeps the existing /mcp endpoint intact.
func mountHTTPHandler(app *fiber.App, path string, h http.Handler, cfg *authConfig) {
	authWrapped := wrapWithHTTPAuth(h, cfg)
	app.All(path, adaptor.HTTPHandler(authWrapped))
}
