// Acceptance proof: a "fake vendor" connector written against the
// shared OAuth base in under 100 LOC of vendor-specific code. If
// Phase 3 did its job, adding a real vendor (Stripe, Linear, Google
// Drive) is structurally the same amount of work — declare
// ConnectionOAuthConfig, point a method at the vendor URL, embed the
// base, done.
//
// This file deliberately does no vendor-simulation of its own: it
// leans entirely on commontest.FakeVendor as the "vendor API" and the
// OAuthConnector base for the plumbing. Line count below the
// package-level comment is intentionally lean.

package common_test

import (
	"io"
	"net/http"
	"testing"

	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/common/commontest"
	"irmin-connectors/lib"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	"github.com/gofiber/fiber/v3"
)

// fakeVendorConnector is the entire connector-specific surface. In a
// real connector the body of Pull (and siblings) would shape the
// vendor response into Irmin's storage format; here it simply passes
// the bytes through so the test can assert on them.
type fakeVendorConnector struct {
	*common.OAuthConnector
	vendorBaseURL string
}

func newFakeVendorConnector(core *commontest.FakeCore, vendorURL string) *fakeVendorConnector {
	return &fakeVendorConnector{
		OAuthConnector: &common.OAuthConnector{
			Config: &irminmodels.ConnectionOAuthConfig{
				Provider:         "fake-vendor",
				AuthorizationURL: "https://fake.invalid/authorize",
				TokenURL:         "https://fake.invalid/token",
				Scopes:           []string{"read.everything"},
				PKCE:             true,
			},
			TokenClient: lib.NewOAuthTokenClient(core.BaseURL(), core.SystemToken),
		},
		vendorBaseURL: vendorURL,
	}
}

// Pull is the entire vendor interaction. One OAuthRoundTripper-wrapped
// client, one request, one response pass-through.
func (f *fakeVendorConnector) Pull(c fiber.Ctx) error {
	client := common.WrapHTTPClient(nil, f.OAuthConnector, c)
	req, err := http.NewRequestWithContext(c.Context(), http.MethodGet, f.vendorBaseURL+"/items", http.NoBody)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString(err.Error())
	}
	resp, doErr := client.Do(req)
	if doErr != nil {
		return f.WriteResolveError(c, doErr)
	}
	defer func() { _ = resp.Body.Close() }()
	body, _ := io.ReadAll(resp.Body)
	return c.Status(resp.StatusCode).Send(body)
}

// TestFakeVendorConnectorAcceptance runs the canonical happy-path +
// retry-on-revocation scenarios through the minimal connector above.
// If this test ever fails for a real connector, that connector's
// vendor-specific code has drifted from the base; nothing more.
func TestFakeVendorConnectorAcceptance(t *testing.T) {
	core := commontest.NewFakeCore(t, "sys-token", "access-1", "access-2")
	vendor := commontest.NewFakeVendor(t)
	vendor.RejectOnceThenAccept(`{"items":[1,2,3]}`)

	fv := newFakeVendorConnector(core, vendor.URL())
	app := fiber.New()
	app.Get("/pull", fv.Pull)

	req, _ := http.NewRequest(http.MethodGet, "http://localhost/pull", http.NoBody)
	req.Header.Set(lib.HeaderConnectionID, "7")
	resp, err := app.Test(req, fiber.TestConfig{Timeout: -1})
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200 (body=%q)", resp.StatusCode, commontest.ReadBody(t, resp))
	}
	body := commontest.ReadBody(t, resp)
	if body != `{"items":[1,2,3]}` {
		t.Fatalf("body = %q, want passthrough of vendor response", body)
	}
	if core.ForceCalls() != 1 {
		t.Fatalf("expected exactly 1 force refresh after 401, got %d", core.ForceCalls())
	}
}
