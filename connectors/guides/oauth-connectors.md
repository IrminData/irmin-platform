# OAuth Connectors

This document describes how OAuth-backed connectors work in Irmin, which
vendors are planned, and how to build a new one. It is companion to
`how-to-create-connectors.md` — that file covers the general connector
contract (details/settings fields, operation init, pull/push/patch); this
one focuses specifically on the OAuth path.

If you are building a connector that authenticates with a username +
password, API key, or any other static credential, use the existing
DynamicField form path and skip this document entirely.

## Planned connectors

The launch slate is **Stripe → Linear → Google Drive**, in that order:

| # | Connector | Auth style | Use case | Source of client credentials |
|---|---|---|---|---|
| 1 | **Stripe** | OAuth 2.0 + PKCE via Stripe Connect, static client | Revenue, subscriptions, invoices, payouts | Pre-configured Stripe Connect platform per environment |
| 2 | **Linear** | OAuth 2.0 + PKCE, RFC 7591 DCR via Linear's MCP server | Engineering issue data | DCR (per workspace, on first use) |
| 3 | **Google Drive** | OAuth 2.0 + PKCE, static client | Files + metadata, byte-blob contents | Pre-registered Google Cloud OAuth app per environment |

**Why Stripe first:** Stripe Connect exercises the most demanding edge
of the OAuth infrastructure — the OAuth flow is used for merchant
onboarding (not user auth), the `client_secret` lives on an
Irmin-operated Connect platform, and refresh-token rotation semantics
differ per account type (Standard vs Express vs Custom). If Stripe
works, the rest fit the same mould with less to validate.

**Why Linear second:** first vendor to exercise RFC 7591 DCR end to
end, which Stripe skips. By the end of Linear we've validated both
OAuth client models (static admin-configured + DCR) on live vendors.

**Why Google Drive third:** first OAuth connector to pull non-JSON
**byte-blob** contents (alongside file metadata). Drive also covers
the nontrivial scope axis — `drive.readonly` vs `drive.file` vs
`drive` — and Google's short-lived test-mode refresh tokens, which
are a useful stress test for the refresh path.

Nothing beyond these three is committed. Earlier drafts of the plan
listed HubSpot / Intercom alongside Stripe; they were dropped because
there were no test accounts available and "we ship what we can test."
The infrastructure is vendor-agnostic, so they're cheap to pick up
later if a real need materialises.

### Expansion candidates (uncommitted)

A representative list of what the infrastructure unlocks, to help scope
future prioritisation:

- **Code/issues**: GitHub, GitLab, Sentry, Linear, Jira, Asana, Monday.com
- **CRM / sales**: HubSpot, Salesforce, Pipedrive, Close
- **Support**: Intercom, Zendesk, Freshdesk
- **Files**: Google Drive, Dropbox, Box, OneDrive
- **Finance**: Stripe, Plaid, QuickBooks, Xero
- **Marketing**: Mailchimp, Klaviyo, HubSpot Marketing, Customer.io

No commitment; this list exists so nobody spends cycles speculating about
what's possible.

## Shared base class architecture

OAuth and non-OAuth connectors share about 80% of their code — operation
lifecycle, token/secret handling, schema discovery scaffolding, audit
hooks, HTTP boilerplate, error mapping. All of this lives in a **shared
base** under `connectors/common/`. A new OAuth connector composes it and
ships as:

```
connectors/<vendor>/
├── config.go       # ConnectionOAuthConfig block + any
│                   #   settings-level DynamicFields
├── client.go       # Vendor-specific HTTP calls, typed for the
│                   #   vendor's domain model
├── operation.go    # Pull/Push/Patch implementations that call
│                   #   client.go; glue code only
└── connector.go    # Registers the connector and wires operation.go's
                    #   handlers into the shared base
```

Target: roughly 300–500 lines per new OAuth connector, of which almost
everything is domain translation (vendor response → Irmin schema). Zero
lines should be about "how to exchange a code for a token", "how to
refresh when expired", or "how to retry on a 401" — that's the base.

Acceptance proof: `connectors/common/oauth_fake_vendor_test.go` is a
fully working vendor connector against the base in **99 LOC** of
vendor-specific code. If your real vendor connector grows much past
that for non-domain reasons, you're probably re-implementing
something the base already handles.

### What the shipped base provides

On the connectors side (this repo, `connectors/common/`):

- **`OAuthConnector`** (`oauth_base.go`) — embeddable struct that
  concrete controllers compose. Holds the per-process
  `lib.OAuthTokenClient` and the connector's declared
  `ConnectionOAuthConfig`. Exposes:
  - `ResolveAccessToken(c)` — reads `X-Irmin-Connection-Id` and
    returns a fresh vendor `*VendorAccessToken` from Core.
  - `ForceRefreshAccessToken(c)` — same, but Core rotates the token
    unconditionally. Used internally by the round-tripper retry.
  - `WriteResolveError(c, err)` — sentinel-to-HTTP mapping every
    OAuth-backed connector should use uniformly. See the table
    below.
  - `InjectInfoOAuthConfig(*ConnectorDetails)` — stamps the OAuth
    config onto the `/info` response so the console knows to render
    a Connect button.
- **`OAuthRoundTripper` + `WrapHTTPClient`** (`oauth_client.go`) —
  drop-in `http.RoundTripper` that stamps `Authorization: Bearer …`
  on every outbound vendor request and **transparently retries
  once on 401** after force-refreshing. Use `WrapHTTPClient` to
  wrap whatever `*http.Client` your vendor SDK already uses.
- **`commontest`** subpackage (`connectors/common/commontest/`) —
  reusable `FakeCore` and `FakeVendor` `httptest.Server` fixtures
  for per-connector integration tests. Lives in its own subpackage
  so production code never imports test servers.
- **Lower-level primitives** (`connectors/lib/`) — still
  available if you need to bypass the base for some reason:
  - `lib.OAuthTokenClient` — talks to Core's
    `/api/v1/system/oauth/access-token` directly.
  - `lib.ConnectionIDFromRequestHeader` — parses
    `X-Irmin-Connection-Id` into a typed `uint`.
  - `lib.HeaderConnectionID` — canonical header name constant.
  - `lib.Err{NotConnected,RefreshRejected,CoreUnavailable,MissingConnectionHeader}`
    — sentinels the base maps to HTTP. Match these directly only if
    you can't use `WriteResolveError`.

On the Core side (`core/`):

- Everything to do with tokens: flow orchestration, session/token
  storage, refresh, revoke, DCR. Connectors don't see any of this.
- `/api/v1/system/oauth/access-token` is the single seam. Accepts
  `{"connection_id": N, "force_refresh": bool}`. Without the flag,
  Core returns the cached token (refreshing only if inside the skew
  window); with `force_refresh:true`, Core rotates unconditionally.
- The base's retry-on-401 path is the only caller that uses
  `force_refresh`. Successful forced refreshes are recorded in the
  audit log as `oauth.refreshed (forced) for connection N`.

### What lives in the connector

Only three things should be connector-specific:

1. **The `ConnectionOAuthConfig` block** — URLs, scopes, DCR endpoint.
2. **Vendor HTTP client** — typed request/response structs and endpoint
   URLs. Pure vendor code, could live in a Go library outside Irmin.
3. **Schema + data mapping** — "what does a Stripe charge look like
   when exported as CSV/JSON/Parquet." Pure translation logic.

If you find yourself writing OAuth logic inside a connector
(token refresh, state handling, client-secret management, DCR,
401-retry), it belongs in the shared base instead.

### Sentinel-to-HTTP mapping

Every OAuth connector should surface failure modes through
`OAuthConnector.WriteResolveError`. The mapping the console depends on:

| Sentinel | Status | JSON `code` | Console UX |
|---|---|---|---|
| `lib.ErrNotConnected` | 428 Precondition Required | `oauth_not_connected` | Render "Connect with X" CTA |
| `lib.ErrRefreshRejected` | 428 Precondition Required | `oauth_refresh_rejected` | Render "Reconnect with X" CTA (vendor revoked) |
| `lib.ErrMissingConnectionHeader` | 400 Bad Request | `oauth_missing_connection_header` | Internal — Core failed to stamp header |
| `common.ErrOAuthNotConfigured` | 500 Internal Server Error | `oauth_not_configured` | Wiring bug — connector embedded the base with `Config: nil` |
| `lib.ErrCoreUnavailable` | 502 Bad Gateway | `oauth_core_unavailable` | Transient — retry with backoff |

The 428s are the signal the console uses to swap a passive operation
view for a Reconnect button; do not return 401 for these (401 means
"the vendor rejected the call we just made", which is a different UX).

## How the flow works end-to-end

```
User clicks "Connect with X" in the console
        │
        ▼
Console ─── POST ───▶ Core: /workspaces/:w/connections/:c/oauth/start
        │                │
        │                ├─ resolveConnectorOAuth:
        │                │   • fetch connector's /info → ConnectionOAuthConfig
        │                │   • look up ConnectionOAuthClient
        │                │     (or lazy-DCR if config declares DCREndpoint)
        │                │
        │                ├─ generate 256-bit state + PKCE S256 verifier/challenge
        │                ├─ persist ConnectionOAuthSession (10 min TTL)
        │                └─ return authorization_url
        │
        ▼
Console opens popup to vendor authorization URL
        │
        ▼
Vendor redirects to Core: /api/v1/oauth/callback?state=...&code=...
        │
        ├─ Core validates state (single-use, not expired, matches session)
        ├─ Core POSTs to vendor token endpoint with code + PKCE verifier
        ├─ Core persists ConnectionOAuthToken (access + refresh encrypted)
        ├─ Core deletes the session row
        └─ Core renders popup HTML that postMessage()s the console
        │
        ▼
Later, for every operation that needs to call the vendor:
        │
Core ─── operation init/pull/... ───▶ Connector
        │  (X-Irmin-Connection-Id header)
        │
        ▼
Connector uses lib.OAuthTokenClient to call back to Core:
        │
Connector ── POST /api/v1/system/oauth/access-token ──▶ Core
        │  Bearer {IRMIN_API_TOKEN}                       │
        │  body: {"connection_id": N}                     │
        │                                                  │
        │  Core: refresh if stale, return fresh token      │
        │                                                  │
        ◀────────── {"data":{"access_token":"..."}} ──────┘
        │
        ▼
Connector calls vendor API with Authorization: Bearer <token>
```

Key invariants:
- **Tokens never leave Core.** The connector never persists a vendor
  access or refresh token. It asks Core on every vendor-bound request.
- **Refresh is serialised per-connection.** Core row-locks the token
  during refresh, so concurrent operations on the same Connection don't
  race the vendor into rotating-refresh-token failures.
- **PKCE S256 is mandatory.** A connector that sets `PKCE: false` in
  its config will have its flow refused by Core.
- **State is single-use.** Successful callback deletes the session row
  inside the same transaction that persists the token.
- **Uniqueness is DB-enforced.** Partial unique indexes on
  `connection_oauth_clients` guarantee at most one client row per
  (connector, workspace) pair, making concurrent DCR resolve cleanly
  instead of leaving duplicate rows.

## Static client vs DCR

OAuth vendors fall into two camps, and your connector picks one via the
`ConnectionOAuthConfig.DCREndpoint` field.

### Static client (Stripe, HubSpot, most traditional OAuth providers)

The vendor expects Irmin to register **one app** in their developer
portal and use the resulting `client_id` + `client_secret` for every
Irmin workspace that connects.

Setup steps (operator, once per environment):
1. Create the app in the vendor's developer portal.
2. Set the redirect URI to `{IRMIN_API_BASE_URL}/api/v1/oauth/callback`.
3. Save the `client_id` and `client_secret`.
4. Insert a `connection_oauth_clients` row in Core's DB with
   `workspace_id = NULL` (this is a global/admin-configured client),
   `connector_id` pointing at the connector registration, `client_id`
   and the encrypted `client_secret`.

The connector declares **no** `DCREndpoint`. At flow time, Core finds the
global row and uses it for every workspace.

### Dynamic Client Registration (Intercom, Linear, most MCP-compatible services)

The vendor implements RFC 7591. Irmin registers a fresh app per workspace
on first use — no operator setup.

Setup steps (operator): **none**.

The connector declares a `DCREndpoint`. At flow time, Core finds no
`connection_oauth_clients` row for the (connector, workspace) pair and
POSTs an RFC 7591 registration request to the declared endpoint. The
response's `client_id` + `client_secret` are persisted as a
workspace-scoped client row and reused for all subsequent flows in that
workspace.

Partial unique indexes on `(connector_id, workspace_id)` plus a
conflict-swallowing re-fetch in `registerClientViaDCR` mean that if two
first-time flows start simultaneously, the second one finds the winning
row and proceeds; no orphan client rows accumulate on our side.
(One orphan vendor-side registration may linger — background cleanup
concern, not flow-blocking.)

## Decision matrix: which OAuth path to pick

When building a new OAuth-backed connector, use this decision tree:

```
Does the vendor have a Dynamic Client Registration endpoint
(RFC 7591, typically POST /oauth/register)?
├─ YES → DCR path
│        • Set DCREndpoint in ConnectionOAuthConfig
│        • Core auto-registers per workspace on first use
│        • Zero operator setup
│        • Example: Linear (mcp.linear.app/register),
│          Intercom, Sentry, Monday.com
│
└─ NO → Static client path
         • Omit DCREndpoint from ConnectionOAuthConfig
         • Admin registers one app in the vendor's developer portal
         • Client credentials stored in connection_oauth_clients
           (workspace_id = NULL, global)
         • Example: Google Drive (Google Cloud Console),
           Stripe Connect (Stripe Dashboard)

If the vendor doesn't support OAuth at all:
  → API-key path (no ConnectionOAuthConfig)
  • Static credentials via details DynamicFields
  • Example: Stripe (restricted API keys), Postgres, MySQL
```

### Quick-reference table

| Question | DCR | Static client | API key |
|---|---|---|---|
| Vendor has `/oauth/register`? | ✅ Yes | ❌ No | N/A |
| Operator setup needed? | ❌ None | ✅ Register app once | ✅ Generate key once |
| Client credentials stored? | Per-workspace, via DCR | Global, in DB | Per-Connection, in details |
| Connector code difference? | Set `DCREndpoint` | Omit `DCREndpoint` | No `ConnectionOAuthConfig` |
| Wire protocol? | OAuth 2.0 + PKCE | OAuth 2.0 + PKCE | Static bearer / basic auth |
| Console UI? | Connect button | Connect button | Credential form |

### How to tell if a vendor supports DCR

1. Check the vendor's OAuth documentation for "Dynamic Client Registration" or "RFC 7591"
2. Look for a `POST /oauth/register` or `POST /v1/oauth/register` endpoint
3. Check the vendor's `.well-known/oauth-authorization-server` for a `registration_endpoint` field
4. If the vendor is MCP-compatible, they almost certainly support DCR (Linear, Intercom, Sentry all do)

### Common pitfalls

- **Google does NOT support DCR.** You must use the static-client path with Google Cloud Console registration. See the [Google Drive connector README](../connectors/googledrive/README.md) for the full setup walkthrough.
- **Stripe Connect does NOT support DCR.** Stripe shipped as an API-key connector instead because the ops overhead of a static OAuth app didn't exercise the DCR path we wanted to prove.
- **Refresh token lifetime differs by vendor state.** Google's test-mode OAuth issues refresh tokens that expire after 7 days. Published apps with a verified consent screen get indefinite refresh tokens. Always document this per vendor.
- **Scope changes force re-authorisation.** If you add a new scope to an existing connector, every user must re-authorise. Prefer the narrowest scope that meets the connector's needs.
- **PKCE is mandatory.** Core refuses to run a flow when `PKCE: false`. Every new connector must set `PKCE: true`.

## How to build a new OAuth connector

Walk-through using a fictional `Acme` vendor. The pattern is the same
for Stripe / Linear / Google Drive — only the vendor URLs and domain
mapping change.

### 1. Scaffold the package

```
connectors/acme/
├── routes.go               # Calls common.SetupConnectorRoutes
├── config/
│   └── config.go           # GetConnectorInfo() with ConnectionOAuthConfig
└── controllers/
    ├── controllers.go      # Embeds *common.OAuthConnector
    ├── info.go             # InjectInfoOAuthConfig before sending
    ├── operationPull.go    # Vendor calls via WrapHTTPClient
    └── operationPush.go    # (etc.)
```

### 2. Declare `ConnectionOAuthConfig` in `config/config.go`

```go
package config

import (
    "irmin-connectors/models"

    irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
)

func GetConnectorInfo() models.ConnectorDetails {
    return models.ConnectorDetails{
        Name: "Acme", Version: "0.0.1", /* ...required fields... */
        ConnectionOAuthConfig: &irminmodels.ConnectionOAuthConfig{
            Provider:         "acme",
            AuthorizationURL: "https://acme.example/oauth/authorize",
            TokenURL:         "https://api.acme.example/oauth/token",
            Scopes:           []string{"read.things"},
            PKCE:             true,
            // DCREndpoint:    "" — set for RFC 7591 vendors
            // RevocationURL: "" — optional, RFC 7009
            // ExtraParams:   {"access_type": "offline"} — vendor quirks
        },
    }
}
```

Field semantics live in `sdks/go/models/oauth_config.go`. Two
non-obvious points:
- `PKCE` must be `true`. Core refuses to run a flow when false.
- `Scopes` should be least-privilege. Adding a scope later forces
  every existing user to re-authorise.

### 3. Embed `*common.OAuthConnector` in your controllers

```go
package acmecontrollers

import (
    "irmin-connectors/connectors/acme/config"
    "irmin-connectors/connectors/common"
    "irmin-connectors/models"
)

type Controllers struct {
    *common.Controllers
    *common.OAuthConnector
}

func NewControllers(app *models.ConnectorsApp) *Controllers {
    return &Controllers{
        Controllers:    common.NewControllers(app),
        OAuthConnector: common.NewOAuthConnector(app, config.GetConnectorInfo().ConnectionOAuthConfig),
    }
}
```

That's the entire OAuth wiring. The constructor reads
`IRMIN_API_BASE_URL` + `IRMIN_API_TOKEN` from the environment to
build the underlying `lib.OAuthTokenClient`; the embed gives every
handler access to `ResolveAccessToken`, `WrapHTTPClient`, etc.

### 4. Stamp `ConnectionOAuthConfig` on the `/info` response

```go
func (cs *Controllers) Info(c fiber.Ctx) error {
    info := config.GetConnectorInfo()
    cs.InjectInfoOAuthConfig(&info) // no-op for static-cred connectors
    return c.JSON(info)
}
```

(Or call `common.RenderConnectorInfo` and have it call
`InjectInfoOAuthConfig` for you — equivalent.)

### 5. Make vendor calls through `WrapHTTPClient`

```go
func (cs *Controllers) OperationPull(c fiber.Ctx) error {
    client := common.WrapHTTPClient(http.DefaultClient, cs.OAuthConnector, c)
    req, _ := http.NewRequestWithContext(c.Context(), http.MethodGet,
        "https://api.acme.example/v1/things", http.NoBody)
    resp, err := client.Do(req)
    if err != nil {
        return cs.WriteResolveError(c, err)
    }
    defer resp.Body.Close()
    // ... shape vendor response into Irmin's storage format ...
}
```

The wrapped client:
- Reads `X-Irmin-Connection-Id` from the inbound Fiber request once
  per outbound call (cheap; Core's fast path is a single small
  HTTPS round-trip with no vendor I/O).
- Stamps `Authorization: Bearer …` on the request.
- On a vendor 401, force-refreshes through Core and retries once.
  After that single retry, a still-401 response bubbles up to the
  handler — the user revoked Irmin at the vendor and needs to
  reconnect.

You don't need to call `ResolveAccessToken` directly unless you're
doing something the round-tripper can't see (e.g. building a
WebSocket URL with the bearer in a query param). When you do,
surface its error through `cs.WriteResolveError(c, err)` so the
console gets the standard 428/400/502 mapping.

### 6. Test against `commontest`

```go
import (
    "irmin-connectors/connectors/common/commontest"
    "irmin-connectors/lib"
)

func TestAcmePullForwardsBearerThenRetriesOn401(t *testing.T) {
    core := commontest.NewFakeCore(t, "sys-token", "access-1", "access-2")
    vendor := commontest.NewFakeVendor(t)
    vendor.RejectOnceThenAccept(`{"items":[1,2,3]}`)
    // ... wire NewControllers with a TokenClient pointed at core ...
    // ... drive the handler with X-Irmin-Connection-Id stamped ...
    if core.ForceCalls() != 1 { /* the retry hit Core */ }
    if got := vendor.AuthHeaders(); got[1] != "Bearer access-2" { /* … */ }
}
```

`connectors/common/oauth_base_test.go` and
`oauth_fake_vendor_test.go` are the reference patterns to copy.

### 7. Operator setup (static-client vendors only)

For static-client vendors (Stripe, HubSpot, Google Drive, …), an
admin registers one OAuth app per Irmin environment in the vendor's
developer portal:

1. Create the app.
2. Set the redirect URI to `{IRMIN_API_BASE_URL}/api/v1/oauth/callback`.
3. Request the scopes declared in `ConnectionOAuthConfig.Scopes`.
4. Insert a row in Core's `connection_oauth_clients` table with
   `workspace_id = NULL` (global client), pointing at the connector
   registration, with the encrypted `client_secret`.

For DCR vendors (Linear, Sentry, Intercom, …), the operator setup
is **empty** — Core registers a per-workspace client on first use.

## Status (Phase 3 shipped)

- ✅ `ConnectionOAuthConfig` in the SDK
- ✅ `lib.OAuthTokenClient` + `ConnectionIDFromRequestHeader` +
  sentinels in `connectors/lib/`
- ✅ `connectors/common/OAuthConnector` embeddable base
- ✅ `connectors/common/OAuthRoundTripper` + `WrapHTTPClient` with
  retry-on-401 + force-refresh
- ✅ `connectors/common/commontest/` reusable httptest fixtures
- ✅ HTTP connector embeds the base with `Config: nil` as the
  static-credential proof
- ✅ Core honours `force_refresh:true` and emits
  `oauth.refreshed (forced)` audit events with WorkspaceID stamped

What still needs vendor connectors:

- 🚧 **Phase 4**: Stripe (pull / push / patch via Stripe Connect)
- ⏳ Phase 5: Linear (DCR exercise) + Google Drive (byte-blob pull)
- ⏳ Phase 6: Console OAuth UI (Connect / Reconnect / Disconnect)
- ⏳ Phase 7: User-facing walkthroughs

Existing static-credential connectors
(Postgres / MySQL / SFTP / HTTP / Firecrawl / Pinecone) keep working
on the legacy path; opportunistic migration in later PRs. Only HTTP
has been migrated as the proof-of-uniformity check.

## Further reading

- `how-to-create-connectors.md` — generic connector authoring guide
- `concepts-and-processes.md` — connector lifecycle + operation flow
- `connector-architecture.md` — connector-side request/auth/operation
  topics, topic-by-topic
- `core/services/oauth/` — Core-side flow implementation
- `core/controllers/oauth.go` — HTTP surface
  (start/callback/disconnect/status/access-token)
- `core/db/oauth.go` — persistence model
