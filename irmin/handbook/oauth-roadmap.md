# OAuth Roadmap

Temporary implementation tracker for OAuth-backed connectors. This page
exists as a living TODO while the work is in flight — delete it (and the
row in `handbook/README.md`) once every phase below is shipped. The
long-term architectural view lives in
[connector-architecture.md](./connector-architecture.md); this page is
the transient project plan.

## Status at a glance

| Phase | What | Status |
|---|---|---|
| 1 | Encryption foundation — keyring, backfill migration, encrypted-JSON serializer | ✅ Shipped (#416, #417) |
| 2 | OAuth flow — endpoints, DCR, tokens, sessions, JIT access-token endpoint | ✅ Shipped (#418) |
| 3 | Shared OAuth base in `irmin-connectors` | ✅ Shipped (irmin#424, irmin-connectors#161) |
| 4 | Stripe connector (pull · push · patch) | 🚧 Next |
| 5 | Linear + Google Drive connectors | ⏳ Planned |
| 6 | Console OAuth UI | ⏳ Planned |
| 7 | User-facing walkthroughs with screenshots + launch | ⏳ Planned |

## Decisions locked in

Anything here is settled. If we later change it, update in place.

- **Token model.** Core-only; refresh tokens never leave Core.
  `irmin-connectors` fetches short-lived access tokens JIT from
  `POST /v1/internal/connections/{id}/oauth/access-token` using its
  system token. Simpler to reason about than distributing refresh
  tokens, and means a compromised connectors host can't mint new
  tokens indefinitely.
- **Encryption scope.** All connector secrets (OAuth tokens + existing
  connector credentials marked `Secret: true` in `DynamicField`) go
  through the keyring. Shipped in Phase 1.
- **DCR vs. static clients.** Both are first-class. RFC 7591 DCR
  (e.g., Linear via their MCP server) registers per-workspace; static
  admin-configured clients (e.g., Stripe) use one OAuth app per
  environment via env vars. Neither is a fallback for the other.
- **Stripe operations at launch.** Pull **and** push **and** patch,
  not pull-only. Stripe's write API is well-covered and maps cleanly
  onto our path-based operation schemas (`customers/{id}.json`,
  `invoices/new-invoice.json`, JSON-Patch for partial updates).
  Subscribe (webhook ingestion) deferred — needs separate
  infrastructure.
- **Launch slate is Stripe → Linear → Google Drive** (in that order),
  not HubSpot / Intercom. The earlier plan led with HubSpot + Stripe
  + Intercom; revised because the maintainer doesn't have test
  accounts for HubSpot or Intercom, and "we can only ship what we
  can actually test." The final three cover the full axis we care
  about at launch: SaaS billing (Stripe, static client, read+write),
  dev-tooling with DCR (Linear), and user-scoped document storage
  (Google Drive, non-DCR, scope-sensitive). Nothing after these
  three is committed.
- **Naming.** SDK types get a concrete domain prefix
  (`ConnectionOAuthConfig`, not `OAuthConfig`) so future additions
  for unrelated OAuth concepts (internal auth, MCP-client auth)
  don't collide.

## Phase 1 — Encryption foundation ✅

Shipped in [#416](https://github.com/IrminData/irmin/pull/416) and
hardened in [#417](https://github.com/IrminData/irmin/pull/417).

Key pieces:

- `lib/crypto` — AES-256-GCM envelope encryption.
- **Keyring model.** `CREDENTIAL_ENCRYPTION_KEYS` env is a JSON array
  of `{id, key_b64}`. Newest key used for writes; any id valid for
  reads. Ciphertext is `v1:{key_id}:{nonce}:{ciphertext}`.
- `encrypted_json` GORM serializer — transparently encrypts any
  `map[string]string` column tagged with it.
- Backfill migration — idempotent, detects `v1:` prefix and skips;
  runs on startup.
- Backward-compat read path — values lacking the `v1:` prefix are
  returned as-is, so deployments stay zero-downtime across the
  encryption-adoption boundary.

## Phase 2 — OAuth flow ✅

Shipped on this branch. Surface area:

**DB (`db/oauth.go`):**
- `connection_oauth_clients` — per-`(connector, workspace)` row with
  partial UNIQUE indexes (one for `workspace_id IS NOT NULL`, one for
  global `IS NULL`). Encrypted `client_secret` + RFC 7592
  `registration_access_token`.
- `connection_oauth_sessions` — HMAC-signed `state`, encrypted PKCE
  verifier, 10-minute TTL. Periodically swept.
- `connection_oauth_tokens` — encrypted access + refresh tokens,
  scope, expiry. Separated from `Connection.Details` so the existing
  mask/merge paths stay untouched.

**Service (`services/oauth/`):**
- `StartFlow`, `HandleCallback`, `RefreshToken`, `GetAccessToken`,
  `Revoke` in `flow.go` / `token.go`.
- `state.go` — HMAC signing, expiry, single-use via row deletion;
  PKCE S256 mandatory.
- `dcr.go` — RFC 7591 registration; conflict-safe (concurrent
  registrations race-reconcile by re-fetching the winner).
- `services/oauth_config_provider.go` — resolves a connector's
  `ConnectionOAuthConfig` (either static env-driven or via DCR)
  during a flow start.

**Endpoints (`controllers/oauth.go` + routes):**
- `POST /v1/connections/{id}/oauth/start` → `{authorization_url}`
- `GET /v1/oauth/callback` → HTML page that `postMessage`s back to
  the console origin and closes the popup
- `POST /v1/connections/{id}/oauth/disconnect`
- `POST /v1/internal/connections/{id}/oauth/access-token` —
  system-token auth only

**Orchestrator (`orchestrator/maintenance.go`):**
- New periodic loop (10-min interval, separate from `-gc`) sweeps
  expired OAuth sessions.

**Connectors-client (`connectors-client/client.go`):**
- OAuth-aware middleware auto-resolves a fresh access token and
  attaches it as `Connection-OAuth-Access-Token` on downstream
  requests; retries once on 401 after triggering a refresh.

## Phase 3 — Shared OAuth base in `irmin-connectors` ✅

Shipped in [irmin#424](https://github.com/IrminData/irmin/pull/424)
(Core side) and
[irmin-connectors#161](https://github.com/IrminData/irmin-connectors/pull/161)
(connectors side). No SDK tag was needed — `ConnectionOAuthConfig`
landed earlier and the wire shape stays compatible (`force_refresh`
uses `omitempty`).

The motivating constraint held: the fake-vendor connector that
exercises the generic OAuth integration suite is **99 LOC** of
vendor-specific code (acceptance criterion #5).

**Core side** (`irmin#424`)

- `controllers/oauth.go::SystemOAuthAccessToken` accepts an optional
  `force_refresh: true` flag. When set, Core bypasses the local
  skew-window short-circuit and rotates the token unconditionally.
  The same `is_system` gate guards both variants — no parallel auth
  surface. Cross-service contract: `IRMIN_API_TOKEN` (connectors)
  must equal `TOKEN` (Core); covered by
  `TestSystemOAuthAccessTokenAuthGate`.
- `services/oauth/token.go::ForceRefreshAccessToken` reuses the
  existing `RefreshToken` row-locking + upsert via a private
  `refreshToken(force bool)` helper. Extracted
  `loadLockedTokenRow` and `performRefresh` so cognitive complexity
  stays inside `gocognit`.
- Successful forced refreshes emit an
  `oauth.refreshed (forced) for connection N` audit event with
  `WorkspaceID` populated (looked up via `GetConnectionByID`) so it
  surfaces in the console's workspace-scoped log queries. Lazy
  refreshes stay silent — they fire on every expiring call.

**Connectors side** (`irmin-connectors#161`)

- `lib/oauth_token_client.go::ForceRefreshVendorAccessToken` sends
  the `force_refresh:true` payload. The lazy variant stays
  byte-identical on the wire.
- `connectors/common/oauth_base.go` — embeddable `OAuthConnector`.
  Handles `X-Irmin-Connection-Id` read, token resolution,
  sentinel-to-HTTP mapping (`ErrNotConnected` /
  `ErrRefreshRejected` → 428 to signal "render the Reconnect CTA",
  `ErrCoreUnavailable` → 502, `ErrMissingConnectionHeader` → 400).
- `connectors/common/oauth_client.go` —
  `OAuthRoundTripper` + `WrapHTTPClient`. Stamps `Authorization`
  on every outbound request, retries once on vendor 401 after
  forcing Core to rotate. Honors `req.GetBody` for streaming-safe
  retries; falls back to a buffered body otherwise.
- `connectors/common/commontest/` — reusable `FakeCore` and
  `FakeVendor` httptest fixtures in their own subpackage so test
  servers never enter production binaries.
- HTTP connector embeds `*common.OAuthConnector` with `Config: nil`
  as the static-credential proof — zero behavior change, just
  validates the base no-ops cleanly when OAuth isn't configured.

**Out of scope (deferred).** Migrating Postgres / MySQL / SFTP to the
new base. They keep working on the legacy path; opportunistic
migration in later PRs.

## Phase 4 — Stripe connector

First real OAuth connector. Exercises the static-client path (Stripe
doesn't support DCR).

**Operation surface**

Already documented as target experience in
[connectors.md → Stripe](./connecting-to-irmin/connectors.md#stripe).
Short form:

- **Pull.** Charges, subscriptions, invoices, customers, payouts →
  Parquet per resource, cursor-paginated, API version pinned via
  connection setting.
- **Push.** File path determines create vs. update:
  - `customers/{existing_id}.json` → POST to Update Customer
  - `customers/new-*.json` → POST to Create Customer; Stripe's
    assigned `cus_…` ID written back to the branch as the response
    so the next push resolves to an update
  - `invoices/new-invoice.json`, `products/new-product.json`,
    `prices/new-price.json` — same pattern
  - `Idempotency-Key: sha256(file contents || commit SHA)` —
    deterministic per-push, so workflow re-runs never duplicate
- **Patch.** JSON-Patch on an existing resource file translates to
  Stripe's partial-update endpoint. Safer for concurrent edits
  because it only sends changed fields.
- **Subscribe.** Deferred.

**Scope handling.** Pull-only configurations request `read_only`.
Configuring the first write op triggers a separate `read_write`
re-consent at Stripe. Users keep explicit control over whether Irmin
can modify their account.

**Tasks**

- Register one Stripe Connect platform per environment (dev /
  staging / prod). Store the client ID/secret in each env's secret
  store.
- Env vars: `STRIPE_OAUTH_CLIENT_ID`, `STRIPE_OAUTH_CLIENT_SECRET`.
- `irmin-connectors/connectors/stripe/`:
  - `config.go` — declares `ConnectionOAuthConfig` pointing at
    `connect.stripe.com/oauth/authorize` + `/oauth/token`
  - `controller.go` — extends the shared base; wires pull / push /
    patch to Stripe's list / create / update endpoints
  - `paths.go` — the path → Stripe endpoint map
  - `schema.go` — Stripe-Version-pinned schema generation for each
    supported resource
- Integration tests against Stripe test mode (runs in CI with a
  dedicated test-mode Connect platform).
- Manual verification checklist:
  1. Connect a fresh Stripe test account → pull charges → commit
     snapshot
  2. Push a new customer → confirm it appears in Stripe
  3. Patch that customer's email → confirm update in Stripe
  4. Force-expire the access token → next operation silently
     refreshes and succeeds
  5. Revoke Irmin at Stripe → next operation surfaces a Reconnect
     CTA (once Phase 6 lands)

**Edge cases to validate**

- **Stripe account types.** Standard / Express / Custom behave
  differently at the OAuth layer. Pick one supported mode for
  launch and document it; the others are follow-ups.
- **API version pinning.** `Stripe-Version` header on every call so
  fields don't silently migrate out from under pulls.
- **Revocation semantics.** Stripe doesn't fully implement RFC 7009;
  the revoke call is best-effort and the local token row is deleted
  regardless. Document this — users expect Disconnect to work.

**Estimate.** ~400–600 LOC plus tests. One PR, merged behind the
Phase 3 PR.

## Phase 5 — Linear + Google Drive

The other two launch connectors. Landed in this order:

1. **Linear.** DCR-capable via their MCP OAuth server. Exercises the
   RFC 7591 dynamic-registration path end-to-end — the thing Stripe
   skips — so by the end of Phase 5 we've validated both OAuth client
   models (static admin-configured + DCR) on live vendors. Data:
   issues, projects, cycles, teams — versioned as JSON.
2. **Google Drive.** Non-DCR, per-env static client. Exercises
   Google's slightly idiosyncratic OAuth: short refresh-token
   lifetimes in testing mode, explicit revocation endpoint, scope
   granularity (`drive.readonly` vs `drive.file` vs `drive`). Data:
   file metadata (as JSON) + file contents (as byte blobs — this is
   the first connector to exercise non-JSON pulls through OAuth).

Each follows the same shape as Stripe: declare
`ConnectionOAuthConfig`, map paths to the vendor's REST surface,
implement pull/push/patch through the shared base, add tests.

Nothing beyond these two is committed. When the launch slate ships
and we have real usage data, we'll revisit candidates (GitHub,
Notion, Slack, Shopify, HubSpot if an account materializes) based
on what users actually ask for — not our upfront guesses.

## Phase 6 — Console OAuth UI

The backend is ready; this phase makes it clickable.

**Wizard.** When the selected connector's `Info` response includes
`oauth_config`, `DynamicForm` replaces the `DefineDetails` step with
a `ConnectOAuthStep` that renders:

1. Provider name + scopes explainer.
2. **Connect with {Provider}** button.
3. On click: `POST /v1/connections/{id}/oauth/start` → receives
   `authorization_url` → `window.open(url, 'irmin-oauth',
   'width=600,height=700')`.
4. Listens for `message` from `api.irmin.dev` with
   `type === 'irmin:oauth:success'` → invalidates the connection
   query → advances the wizard.
5. Timeout / popup-closed path shows a retry CTA.

**Connection detail page.** Adds a status card for OAuth
connections:

- "Connected as {userinfo}" (if the connector exposes it)
- Last refresh time
- Granted scopes
- **Reconnect** button — re-runs the OAuth flow without changing the
  connection's ID or history.
- **Disconnect** button — best-effort vendor revocation, deletes
  tokens locally, leaves the Connection row in place for re-auth.

**Files**

- `src/lib/core/resources/OAuthService.ts` (new) — TS SDK wrapper
  exposing:
  - `startFlow(workspace, connection) → authUrl` (calls
    `POST /workspaces/:w/connections/:c/oauth/start`)
  - `disconnect(workspace, connection)` (calls the disconnect
    endpoint)
  - `getStatus(workspace, connection) → ConnectionStatus` (polled
    on the detail page; 5 min is plenty — no need to thrash)
- `src/hooks/api/useOAuthFlow.tsx` (new) — returns a promise that:
  - Opens the auth URL in a centred popup
  - Listens for `postMessage` from Core's callback page
  - **Verifies `event.origin === env.NEXT_PUBLIC_API_URL`** before
    trusting any message
  - Resolves / rejects on `irmin:oauth:success` vs
    `irmin:oauth:error`
  - Handles "user closed popup" with a timeout + retry CTA
- `src/components/wizards/ConnectionWizard/steps/ConnectOAuthStep.tsx` (new)
- `src/components/ui/form/DynamicForm.tsx` — detect
  `connection_oauth_config` and swap the usual password/API-key
  inputs for a single Connect button + settings from the connector's
  Settings schema
- Connection detail page updates (the status card)

**Testing.** Playwright E2E with a disposable OAuth server fixture
running in the harness that auto-approves the flow. Test asserts:
click Connect → popup opens → wizard advances to the next step →
connection status card shows connected. Gated on the Core side of
the flow being reachable from the test environment.

**Design note.** Per `irmin-console/DESIGN.md`, the Connect button
uses the primary-action style (Irmin Blue 500), **not** a
vendor-branded "Sign in with Google"-style button. Keeps the UI
consistent across vendors. Vendor logos appear in the connector
selection step, not on the Connect button itself.

**Estimate.** ~1500 lines of TS plus ~300 for the Playwright
fixture. Its own PR.

## Phase 7 — Walkthroughs + launch

End-user documentation lives in [connectors.md](./connecting-to-irmin/connectors.md).
Launch work is a sweep over it:

- **Screenshots.** Capture against the shipped console UI (not
  mockups) — one per walkthrough for the Connect flow + one per
  First Pull result.
- **Cover the launch slate.** Add a walkthrough for each of
  Linear and Google Drive (Stripe already has one). Keep the same
  target-experience framing each shipped walkthrough already uses:
  Capabilities / Setup / First pull / Operating patterns / Gotchas.
- **Launch post.** Framing: "connect your tools to versioned
  storage in a click." Concrete demo is Stripe → a compute action
  that transforms pulled data → commit to a branch for review.
- **Delete this roadmap page** and its row in `handbook/README.md`.
  From here on, the handbook only carries the long-term
  architectural view (see `connector-architecture.md`), not
  project-management TODOs.

## Open questions + parking lot

Concrete ideas worth doing but not scoped into the phases above.
Pull items up into a phase when priorities firm up; don't let the
list grow indefinitely without pruning.

**Open questions** (need a decision before we build):

- **Webhook subscribe path.** Stripe, Linear, and most SaaS vendors
  offer webhooks. The orchestrator already has a repository-webhook
  intake; open question is whether subscribe-via-webhook should be
  a new operation type, or wired into the existing subscribe
  surface with a new transport. Defer until after Phase 4.
- **Multi-tenancy on the callback URL.** Single stable
  `https://api.irmin.dev/v1/oauth/callback` per environment works
  for every vendor we've looked at. If a future vendor insists on a
  per-tenant callback, revisit; for now, single-URI is simpler and
  more secure (one thing to audit).
- **Token telemetry surfacing.** The audit log records
  `oauth.connected` / `oauth.refreshed` / `oauth.disconnected` /
  `oauth.refresh_failed`. Do we surface these in the UI, or keep
  them backend-only? Likely: admin-only panel in a later phase —
  not blocking launch.

**Parking lot** (clear follow-ups; no design debate needed):

- **DCR dedup across workspaces.** A partial UNIQUE index on
  `token_url` would collapse DCR-registered clients from the same
  vendor issuer across workspaces. Edge case; defer until it
  bites.
- **Orphan DCR cleanup.** The race-losing side of a concurrent DCR
  leaves a vendor-side registration we never use. Needs RFC 7592
  management-endpoint support per vendor; low priority.
- **Scope-downgrade detection.** When the vendor grants a narrower
  scope than requested, show a UI warning so the user knows
  capabilities are reduced.
- **Multi-account per workspace.** Currently one OAuth client per
  `(connector, workspace)`. Real use case: a company with two
  separate Stripe accounts wants both connected. Likely needs
  `connection_id` as the scoping unit, not `(connector, workspace)`.
- **Audit log refresh events.** Refreshes are currently silent.
  One event per refresh gives a clean trail for "when did this
  token last rotate?" when customers ask.
