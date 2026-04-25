//nolint:testpackage // white-box test covers package-private request metadata helper.
package common

import (
	"net/http"
	"testing"

	"irmin-connectors/db"
	"irmin-connectors/models"

	"github.com/gofiber/fiber/v3"
)

func TestResolveConnectorNameFallsBackToRegistrationAndRouteSlug(t *testing.T) {
	tests := []struct {
		name  string
		setup func(fiber.Ctx)
		path  string
		want  string
	}{
		{
			// connectorInfo from the middleware is the authoritative
			// signal. The resolver lowercases it so the column stays
			// canonical even when /info returns "Pinecone".
			name: "connector info wins, lowercased",
			setup: func(c fiber.Ctx) {
				c.Locals("connectorInfo", &models.ConnectorDetails{Name: "Pinecone"})
				c.Locals("registration", &db.ConnectorRegistration{ConnectorName: "RegistrationName"})
			},
			path: "/pinecone/operation/push",
			want: "pinecone",
		},
		{
			// Without info, the registration label is next, also lowercased.
			name: "registration fallback when no connector info",
			setup: func(c fiber.Ctx) {
				c.Locals("registration", &db.ConnectorRegistration{ConnectorName: "Pinecone"})
			},
			path: "/pinecone/operation/push",
			want: "pinecone",
		},
		{
			// Route slug is the last resort — keeps tests and
			// hand-wired routes (no middleware) sensible. Slugs are
			// already lowercase so the ToLower is a no-op.
			name: "route slug fallback",
			setup: func(_ fiber.Ctx) {
			},
			path: "/pinecone/operation/push",
			want: "pinecone",
		},
		{
			// A future shared prefix (e.g. /v1/pinecone/...) would
			// mis-identify the connector if the resolver keyed off the
			// path. With info on the locals, the middleware-stamped
			// answer wins and the prefix is irrelevant.
			name: "shared prefix does not corrupt info-driven name",
			setup: func(c fiber.Ctx) {
				c.Locals("connectorInfo", &models.ConnectorDetails{Name: "Pinecone"})
			},
			path: "/v1/pinecone/operation/push",
			want: "pinecone",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			app := fiber.New()
			app.Post(tt.path, func(c fiber.Ctx) error {
				tt.setup(c)
				if got := resolveConnectorName(c); got != tt.want {
					t.Fatalf("resolveConnectorName() = %q, want %q", got, tt.want)
				}
				return c.SendStatus(fiber.StatusNoContent)
			})

			req, err := http.NewRequest(http.MethodPost, "http://localhost"+tt.path, http.NoBody)
			if err != nil {
				t.Fatalf("build request: %v", err)
			}
			resp, err := app.Test(req, fiber.TestConfig{Timeout: -1})
			if err != nil {
				t.Fatalf("app.Test: %v", err)
			}
			if resp.StatusCode != fiber.StatusNoContent {
				t.Fatalf("status = %d, want %d", resp.StatusCode, fiber.StatusNoContent)
			}
		})
	}
}
