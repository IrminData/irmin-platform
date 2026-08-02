# Sentry

Thin wrapper around `github.com/getsentry/sentry-go` for the Core API. The package is named `sentryutil` on import but the folder is `sentry/` for discoverability.

## Purpose

Centralizes Sentry initialization, flushing, and panic capture so the rest of the codebase calls a small, typed surface instead of reaching for the vendor SDK directly. This keeps DSN/env wiring in one place and makes it easy to no-op the whole layer when Sentry is disabled.

## Key entry points

- `Init(logger, env)` — initialize the SDK; silently no-ops when `SentryEnabled` is false or `SentryDSN` is empty.
- `Flush(timeout)` — drain buffered events before shutdown.
- `CaptureError(err)` — report an error to Sentry (nil-safe).
- `RecoverAndCapture(logger, component)` — `defer`-friendly panic recovery that logs, captures, and flushes (used by background goroutines in the orchestrator and workers).
- `FlushTimeout` — default flush deadline (2s).
- `middleware.go` — Fiber middleware that adds the Sentry hub / request hooks to each request.

## Integration

`Init` is called once from `main.go`. `Flush` is called on graceful shutdown. `RecoverAndCapture` is deferred at the top of any goroutine we don't want to silently die. The Fiber middleware is registered in `../routes` early in the chain so every handler gets request-scoped Sentry context.
