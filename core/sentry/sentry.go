// Package sentryutil provides Sentry error tracking utilities for the Irmin Core API.
package sentryutil

import (
	"irmin-api/utils"
	"log/slog"
	"time"

	"github.com/getsentry/sentry-go"
)

// FlushTimeout is the default timeout for flushing buffered Sentry events.
const FlushTimeout = 2 * time.Second

// Init initializes the Sentry SDK using the provided environment configuration.
// Returns early if Sentry is disabled or no DSN is configured.
func Init(logger *slog.Logger, env *utils.CoreAPIEnv) {
	if !env.SentryEnabled || env.SentryDSN == "" {
		logger.Info("Sentry is disabled or no DSN configured, skipping initialization")
		return
	}

	err := sentry.Init(sentry.ClientOptions{
		Dsn:              env.SentryDSN,
		Environment:      env.SentryEnvironment,
		TracesSampleRate: env.SentryTracesSampleRate,
		EnableTracing:    true,
		AttachStacktrace: true,
		// SendDefaultPII stays OFF: this service authenticates via Clerk JWTs
		// and API tokens passed in Authorization / Cookie headers, and enabling
		// PII forwards request headers and cookies verbatim to Sentry — bearer
		// tokens and session cookies would land in event data. User and
		// workspace context is attached explicitly by the Fiber middleware in
		// sentry/middleware.go (request ID, method, URL, user agent only).
		SendDefaultPII: false,
	})
	if err != nil {
		logger.Error("Failed to initialize Sentry", "error", err)
		return
	}

	logger.Info("Sentry initialized", "environment", env.SentryEnvironment)
}

// Flush waits for buffered events to be sent to Sentry, up to the given timeout.
func Flush(timeout time.Duration) {
	sentry.Flush(timeout)
}

// CaptureError reports an error to Sentry.
func CaptureError(err error) {
	if err == nil {
		return
	}
	sentry.CaptureException(err)
}

// RecoverAndCapture is a deferred function for goroutines that recovers from panics,
// captures the panic as a Sentry event, and logs it.
func RecoverAndCapture(logger *slog.Logger, component string) {
	if r := recover(); r != nil {
		logger.Error("Panic recovered", "component", component, "panic", r)
		sentry.CurrentHub().Recover(r)
		sentry.Flush(FlushTimeout)
	}
}
