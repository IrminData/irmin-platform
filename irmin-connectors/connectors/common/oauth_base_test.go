// Tests for the shared OAuth connector base. We drive every scenario
// through a real fiber.App so the code path mirrors what concrete
// connectors see in production (including the Fiber middleware stack
// and header parsing), not a mock that happens to satisfy the
// interface shape.

package common_test

import (
	"io"
	"net/http"
	"strings"
	"testing"

	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/common/commontest"
	"irmin-connectors/lib"
	"irmin-connectors/models"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// newFakeDetails returns a bare-minimum ConnectorDetails for the
// Info-stamping assertions. Values are placeholders; only
// ConnectionOAuthConfig is ever read in those tests.
func newFakeDetails() *models.ConnectorDetails {
	return &models.ConnectorDetails{Name: "fake", Version: "0.0.1"}
}

// defaultOAuthConfig returns a ConnectionOAuthConfig the tests reuse.
// Values are pointed at a nonsense vendor URL because the base only
// uses Config to tell the console "this connector is OAuth-backed";
// the actual outbound vendor URL is stamped on requests by test code.
func defaultOAuthConfig() *irminmodels.ConnectionOAuthConfig {
	return &irminmodels.ConnectionOAuthConfig{
		Provider:         "fake",
		AuthorizationURL: "https://fake.invalid/authorize",
		TokenURL:         "https://fake.invalid/token",
		Scopes:           []string{"read.things"},
		PKCE:             true,
	}
}

// newTestOAuthConnector wires an OAuthConnector that talks to the
// given FakeCore. Kept out of commontest because it stitches together
// types from both packages and only the in-package tests need it.
func newTestOAuthConnector(core *commontest.FakeCore) *common.OAuthConnector {
	return &common.OAuthConnector{
		Config:      defaultOAuthConfig(),
		TokenClient: lib.NewOAuthTokenClient(core.BaseURL(), core.SystemToken),
	}
}

// mountVendorProxy wires a Fiber app whose single POST /call route
// uses a fresh OAuthRoundTripper to forward an empty-body POST to the
// given FakeVendor, then relays the vendor response back. This is
// analogous to how a real connector's pull/push operation would use
// the wrapped client to talk to its vendor.
func mountVendorProxy(
	oauth *common.OAuthConnector,
	vendor *commontest.FakeVendor,
) *fiber.App {
	app := fiber.New()
	app.Post("/call", func(c fiber.Ctx) error {
		client := common.WrapHTTPClient(nil, oauth, c)
		req, err := http.NewRequestWithContext(
			c.Context(),
			http.MethodPost,
			vendor.URL()+"/resources",
			strings.NewReader(`{"hello":"world"}`),
		)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).SendString(err.Error())
		}
		req.Header.Set("Content-Type", "application/json")
		resp, doErr := client.Do(req)
		if doErr != nil {
			return oauth.WriteResolveError(c, doErr)
		}
		defer func() { _ = resp.Body.Close() }()
		body, _ := io.ReadAll(resp.Body)
		return c.Status(resp.StatusCode).Send(body)
	})
	return app
}

// runCall drives a single request through the mounted app with the
// given connection-id header, returning the raw response.
func runCall(t *testing.T, app *fiber.App, connectionHeader string) *http.Response {
	t.Helper()
	req, err := http.NewRequest(http.MethodPost, "http://localhost/call", http.NoBody)
	if err != nil {
		t.Fatalf("build request: %v", err)
	}
	if connectionHeader != "" {
		req.Header.Set(lib.HeaderConnectionID, connectionHeader)
	}
	resp, err := app.Test(req, fiber.TestConfig{Timeout: -1})
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	return resp
}

// --- scenarios ---------------------------------------------------------------

func TestOAuthHappyPath(t *testing.T) {
	core := commontest.NewFakeCore(t, "sys-token", "access-1")
	vendor := commontest.NewFakeVendor(t)
	vendor.SetHandler(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, `{"ok":true}`)
	})

	app := mountVendorProxy(newTestOAuthConnector(core), vendor)
	resp := runCall(t, app, "42")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200 (body=%q)", resp.StatusCode, commontest.ReadBody(t, resp))
	}
	if got := core.LazyCalls(); got != 1 {
		t.Fatalf("core lazy calls = %d, want 1", got)
	}
	if got := core.ForceCalls(); got != 0 {
		t.Fatalf("core force calls = %d, want 0 on happy path", got)
	}
	if headers := vendor.AuthHeaders(); len(headers) != 1 || headers[0] != "Bearer access-1" {
		t.Fatalf("vendor auth headers = %q", headers)
	}
}

func TestOAuth401TriggersForceRefresh(t *testing.T) {
	// The canonical mid-flight revocation: the first request is
	// stamped with the lazy-cached token, vendor 401s, the
	// round-tripper force-refreshes, and the retry succeeds.
	core := commontest.NewFakeCore(t, "sys-token", "access-1", "access-2")
	vendor := commontest.NewFakeVendor(t)
	vendor.RejectOnceThenAccept(`{"ok":true}`)

	app := mountVendorProxy(newTestOAuthConnector(core), vendor)
	resp := runCall(t, app, "42")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200 (body=%q)", resp.StatusCode, commontest.ReadBody(t, resp))
	}
	if got := core.LazyCalls(); got != 1 {
		t.Fatalf("lazy calls = %d, want 1", got)
	}
	if got := core.ForceCalls(); got != 1 {
		t.Fatalf("force calls = %d, want 1 (the retry)", got)
	}
	headers := vendor.AuthHeaders()
	if len(headers) != 2 {
		t.Fatalf("vendor saw %d requests, want 2 (original + retry)", len(headers))
	}
	if headers[0] != "Bearer access-1" {
		t.Fatalf("first auth = %q, want access-1 (lazy)", headers[0])
	}
	if headers[1] != "Bearer access-2" {
		t.Fatalf("retry auth = %q, want access-2 (force-refreshed)", headers[1])
	}
}

func TestOAuth401AfterForceRefreshBubblesUp(t *testing.T) {
	// Terminal revocation: even the force-refreshed token is rejected.
	// We only retry once, so the 401 reaches the caller. The body check
	// covers the end-to-end path returning the vendor's own 401.
	core := commontest.NewFakeCore(t, "sys-token", "access-1", "access-2")
	vendor := commontest.NewFakeVendor(t)
	vendor.AlwaysReject()

	app := mountVendorProxy(newTestOAuthConnector(core), vendor)
	resp := runCall(t, app, "42")
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", resp.StatusCode)
	}
	if got := core.ForceCalls(); got != 1 {
		t.Fatalf("force calls = %d, want exactly 1 (we never retry twice)", got)
	}
	if len(vendor.AuthHeaders()) != 2 {
		t.Fatalf("vendor saw %d requests, want exactly 2 (original + retry)", len(vendor.AuthHeaders()))
	}
}

func TestOAuthMissingConnectionHeaderReturns400(t *testing.T) {
	// Without the connection header we can't even resolve a token;
	// classifyResolveError maps this to 400 so the Core-side caller
	// (which failed to stamp the header) gets a clear signal instead
	// of an opaque 500.
	core := commontest.NewFakeCore(t, "sys-token", "access-1")
	vendor := commontest.NewFakeVendor(t)
	vendor.SetHandler(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, `{"ok":true}`)
	})

	app := mountVendorProxy(newTestOAuthConnector(core), vendor)
	resp := runCall(t, app, "")
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", resp.StatusCode)
	}
	if len(vendor.AuthHeaders()) != 0 {
		t.Fatalf("vendor called despite missing connection header: %+v", vendor.AuthHeaders())
	}
}

func TestOAuthCoreUnavailableMapsTo502(t *testing.T) {
	// Point the OAuth client at a URL that won't resolve so every
	// Fetch returns ErrCoreUnavailable. The base must bubble that as
	// a 502 Bad Gateway instead of 500, because this is a transient
	// infra problem, not a bug.
	vendor := commontest.NewFakeVendor(t)
	oauth := &common.OAuthConnector{
		Config: defaultOAuthConfig(),
		TokenClient: lib.NewOAuthTokenClient(
			"http://127.0.0.1:1/does-not-exist",
			"sys-token",
		),
	}
	app := mountVendorProxy(oauth, vendor)
	resp := runCall(t, app, "42")
	if resp.StatusCode != http.StatusBadGateway {
		t.Fatalf("status = %d, want 502", resp.StatusCode)
	}
	if len(vendor.AuthHeaders()) != 0 {
		t.Fatalf("vendor called despite Core being unreachable")
	}
}

// --- pure-unit assertions ----------------------------------------------------

func TestClassifyResolveErrorCodes(t *testing.T) {
	// These are the contract that the console UI branches on. If any
	// mapping drifts we want to catch it here, not in a Playwright
	// test against a deployed env.
	cases := []struct {
		name       string
		err        error
		wantStatus int
		wantCode   string
	}{
		{"not connected", lib.ErrNotConnected, http.StatusPreconditionRequired, "oauth_not_connected"},
		{"refresh rejected", lib.ErrRefreshRejected, http.StatusPreconditionRequired, "oauth_refresh_rejected"},
		{
			"missing header",
			lib.ErrMissingConnectionHeader,
			http.StatusBadRequest,
			"oauth_missing_connection_header",
		},
		{
			"not configured",
			common.ErrOAuthNotConfigured,
			http.StatusInternalServerError,
			"oauth_not_configured",
		},
		{"core unavailable", lib.ErrCoreUnavailable, http.StatusBadGateway, "oauth_core_unavailable"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			// Route the error through a throwaway Fiber handler so we
			// exercise the same WriteResolveError path a real connector
			// would. No FakeCore/FakeVendor needed — this case never
			// resolves a real token, just maps a sentinel to a status.
			app := fiber.New()
			app.Get("/x", func(c fiber.Ctx) error {
				o := &common.OAuthConnector{}
				return o.WriteResolveError(c, tc.err)
			})
			req, _ := http.NewRequest(http.MethodGet, "http://localhost/x", http.NoBody)
			resp, err := app.Test(req, fiber.TestConfig{Timeout: -1})
			if err != nil {
				t.Fatalf("app.Test: %v", err)
			}
			if resp.StatusCode != tc.wantStatus {
				t.Fatalf("status = %d, want %d", resp.StatusCode, tc.wantStatus)
			}
			body := commontest.ReadBody(t, resp)
			if !strings.Contains(body, tc.wantCode) {
				t.Fatalf("body = %q, want code %q", body, tc.wantCode)
			}
		})
	}
}

// --- Info surfacing ----------------------------------------------------------

// TestFakeVendorPreservesRequestBody locks in that FakeVendor hands
// the inbound body to the installed handler intact. The first version
// of the fixture drained the body before invoking the handler, which
// would have silently broken any test (Stripe / Linear / Google Drive
// later) that inspects request payloads — idempotency keys, JSON-Patch
// ops, uploaded files. Caught in code review; this test guarantees we
// don't regress.
func TestFakeVendorPreservesRequestBody(t *testing.T) {
	core := commontest.NewFakeCore(t, "sys-token", "access-1")
	vendor := commontest.NewFakeVendor(t)
	var observed string
	vendor.SetHandler(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		observed = string(body)
		w.WriteHeader(http.StatusOK)
	})

	app := mountVendorProxy(newTestOAuthConnector(core), vendor)
	resp := runCall(t, app, "42")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	if observed != `{"hello":"world"}` {
		t.Fatalf("vendor handler saw body %q, want passthrough of proxy body", observed)
	}
}

func TestInjectInfoOAuthConfigStampsWhenPresent(t *testing.T) {
	// Static-credential connectors would embed an OAuthConnector with
	// Config=nil and expect the Info response untouched.
	t.Run("static connector: no-op", func(t *testing.T) {
		info := newFakeDetails()
		(&common.OAuthConnector{}).InjectInfoOAuthConfig(info)
		if info.ConnectionOAuthConfig != nil {
			t.Fatalf("nil Config shouldn't populate info: %+v", info.ConnectionOAuthConfig)
		}
	})
	t.Run("oauth connector: stamped", func(t *testing.T) {
		info := newFakeDetails()
		cfg := defaultOAuthConfig()
		(&common.OAuthConnector{Config: cfg}).InjectInfoOAuthConfig(info)
		if info.ConnectionOAuthConfig == nil || info.ConnectionOAuthConfig.Provider != "fake" {
			t.Fatalf("Info missing OAuth config: %+v", info.ConnectionOAuthConfig)
		}
	})
}
