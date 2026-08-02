package sentryutil

import (
	"fmt"

	"github.com/getsentry/sentry-go"
	"github.com/gofiber/fiber/v3"
)

const sentryHubKey = "sentry-hub"

// FiberMiddleware returns a Fiber middleware that clones the Sentry hub per request,
// sets request metadata, stores the hub in c.Locals, and manages a Sentry transaction.
func FiberMiddleware() fiber.Handler {
	return func(c fiber.Ctx) error {
		hub := sentry.CurrentHub().Clone()

		hub.ConfigureScope(func(scope *sentry.Scope) {
			scope.SetTag("http.method", c.Method())
			scope.SetTag("http.url", c.OriginalURL())
			scope.SetTag("http.user_agent", c.Get("User-Agent"))

			if requestID, ok := c.Locals("requestid").(string); ok {
				scope.SetTag("request_id", requestID)
			}
		})

		c.Locals(sentryHubKey, hub)

		// Embed the cloned hub in the Go context so StartSpan and child spans
		// use the per-request hub (with its scoped tags) instead of the global hub.
		ctx := sentry.SetHubOnContext(c.Context(), hub)

		// Start with a placeholder name; update after routing resolves.
		span := sentry.StartSpan(ctx,
			"http.server",
			sentry.WithTransactionName(fmt.Sprintf("%s %s", c.Method(), c.Path())),
		)
		// Propagate the enriched context (with cloned hub + active span) to downstream handlers
		// so that c.Context() returns the span context for proper tracing tree linkage.
		c.SetContext(span.Context())

		defer func() {
			// After c.Next(), the matched route pattern is available.
			// Use it to avoid high-cardinality transaction names from raw URLs.
			if routePath := c.Route().Path; routePath != "" {
				span.Name = fmt.Sprintf("%s %s", c.Method(), routePath)
			}
			span.Finish()
		}()

		return c.Next()
	}
}

// GetHubFromFiber retrieves the Sentry hub from Fiber context locals.
// Falls back to sentry.CurrentHub() if not found.
func GetHubFromFiber(c fiber.Ctx) *sentry.Hub {
	if hub, ok := c.Locals(sentryHubKey).(*sentry.Hub); ok {
		return hub
	}
	return sentry.CurrentHub()
}
