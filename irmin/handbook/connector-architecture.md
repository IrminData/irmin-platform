# Connector Architecture (Core perspective)

How the Core API talks to connectors: what a Connection is, what auth
and encryption live where, how operations flow, and how OAuth layers on
top. Complementary to `irmin-connectors/guides/connector-architecture.md`
(same topics viewed from the connector's side).

If you are touching any code in `services/connections.go`,
`services/connectionoauth/`, `db/connection-oauth.go`, `controllers/connection-oauth.go`, or
`connectors-client/`, this is the file that explains why the shape is
what it is.

## What a connector is, from Core's angle

Core treats each external system as a **Connector** — an
HTTP service that speaks the Irmin connector protocol (info, config
fields, validate, operation lifecycle, pull/push/patch). Connectors are
registered at startup via the `Connector` DB row which stores their
`APIBaseURL` and a `SystemToken`.

Users create **Connections** — workspace-scoped, connector-typed
instances with their own `details` (encrypted credentials) and
`settings` (target selection, workspace-specific config). One Connector
row, many Connection rows; users only interact with Connections.

```
Connector (global registry, one per external system type)
   ├─ Connection (workspace, user, details, settings) ← users create these
   ├─ Connection
   └─ Connection
```

## Processes and workflows using connections

A Connection alone does nothing. It becomes useful when bound to an
**Operation** — Core asks the connector to pull/push/patch on that
Connection's behalf. Operations are driven from three places:

| Driver | Lives in | Triggers an operation via |
|---|---|---|
| **Workflow** (Import / Export / Pipeline) | `orchestrator/` | User schedule, cron trigger, repo event |
| **Test Connection** API | `services/connections.go::TestConnection` | User-initiated from the console |
| **Schema discovery** | `engine/dataMovement.go::DataMovementSchema` | Console loading a connection's editable schema |

Every driver funnels through the same path: `engine.Client.
InitializeConnectorOperation(ctx, connection)` → issues a
`connectorsclient.NewClient(...)` at the connector's `APIBaseURL`
using the `SystemToken`, calls `/operation/init`, then performs the
operation-specific calls with the returned operation token.

The connection-id header (`X-Irmin-Connection-Id`) is stamped on every
outbound call via `connectorsclient.Client.WithConnectionID(conn.ID)`
so OAuth-backed connectors can resolve the right access token
(below).

## Authentication with connectors

Three token types flow in two directions:

### Core → Connector

| Token | Scope | Lifetime | Stored where |
|---|---|---|---|
| `SystemToken` | All lifecycle endpoints on one connector registration | Long-lived (rotated by re-register) | `connectors.system_token` (plaintext — this is the token Core issues, not a credential) |
| `OperationToken` | One operation on one connection | Duration of the operation (minutes) | Connector-side operation row only; Core just holds the returned handle |

### Connector → Core (OAuth only)

| Token | Scope | Lifetime | Stored where |
|---|---|---|---|
| `SystemToken` (Core-issued) | The connector's own system token, reused | Long-lived | Connector's env (`IRMIN_API_TOKEN`) |

When an OAuth-backed connector needs a vendor access token, it POSTs to
Core's `POST /api/v1/system/oauth/access-token` with its `SystemToken`
and the `X-Irmin-Connection-Id` header value (from the inbound Core
request). Core refreshes if needed, returns the current bearer token.

### User → Core

| Token | Scope | Source |
|---|---|---|
| Clerk JWT | User-auth endpoints | Clerk on login |
| API token (`cred_` prefix) | Programmatic CLI/SDK use | User creates in settings |

The OAuth callback at `GET /api/v1/oauth/callback` is the *one* public
endpoint — authenticated by the `state` parameter (HMAC-ish: 256-bit
cryptographic random stored in the session row) not by user or system
token.

## Connection details vs. settings

Connections have two jsonb columns that carry different semantics:

### `details`

- Encrypted at rest via the `encrypted_json` GORM serializer
  (`lib/crypto/serializer.go`).
- Carries credentials (username, password, API key, cert, ...). In the
  OAuth world, `details` is typically empty — credentials are in
  `oauth_tokens` instead.
- Masked to `"SECRET"` in every API response.
  (`services/connections.go::MaskConnectionSecrets`).
- Merge-on-update: the update endpoint accepts `"SECRET"` in place of
  a field to mean "keep current value."

### `settings`

- Stored as plain jsonb (no encryption).
- Carries workspace-relevant choices: database name, schema, project,
  folder, etc. Non-sensitive.
- Editable from the console after creation.

Rule of thumb: if revealing the value is a security issue, it's a
detail. Otherwise it's a setting.

## Connection details secret encryption

Every `details` value is AES-256-GCM encrypted at rest under a
keyring loaded from `CREDENTIAL_ENCRYPTION_KEYS` at boot. See
`.env.example` for the env var format (JSON array of `{id, key_b64}`
with tolerant decoding — standard base64, URL-safe base64, raw base64,
hex). Decryption accepts any key in the keyring; encryption always uses
the first ("active") key. Rotation: prepend a new key, roll, eventually
drop the old one.

Ciphertext format on disk: `irmin-enc-v1:{key_id}:{nonce}:{sealed}`
stored inside the jsonb map values. The custom prefix is distinctive
enough to passthrough pre-encryption rows cleanly (old installs still
work after upgrade), but in practice we also ship
`-reencrypt-secrets` CLI flag to bulk-upgrade.

OAuth access and refresh tokens live in the separate
`connection_oauth_tokens` table, under the same encrypted_json
serializer. They never cohabit with `details`.

## OAuth on top of connectors

An **OAuth-backed** connector declares a `ConnectionOAuthConfig` block
on its `/info` response. Presence of this block tells Core to run the
OAuth 2.0 authorization code + PKCE flow on the user's behalf instead
of collecting credentials via `details`.

```go
// In the connector's /info response:
"connection_oauth_config": {
  "provider": "stripe",
  "authorization_url": "https://connect.stripe.com/oauth/authorize",
  "token_url": "https://connect.stripe.com/oauth/token",
  "scopes": ["read_only"],
  "pkce": true,
  // Optional: dcr_endpoint, revocation_url, userinfo_url, extra_params
}
```

Core-side pieces:

- `services/connectionoauth/` — flow orchestration: `StartFlow`, `HandleCallback`,
  `GetAccessToken`, `RefreshToken`, `Revoke`.
- `services/connectionoauth/dcr.go` — RFC 7591 Dynamic Client Registration
  (lazy: registers a workspace-scoped client on first use).
- `controllers/connection-oauth.go` — four HTTP surfaces:
  - `POST /workspaces/:w/connections/:c/oauth/start`
  - `GET /api/v1/oauth/callback` (public; state-authenticated)
  - `POST /workspaces/:w/connections/:c/oauth/disconnect`
  - `GET /workspaces/:w/connections/:c/oauth/status`
  - `POST /api/v1/system/oauth/access-token` (connector-to-Core)
- `db/connection-oauth.go` — three tables:
  - `connection_oauth_clients` (per-workspace DCR + global admin-configured)
  - `connection_oauth_sessions` (in-flight authorization flows, 10-min TTL)
  - `connection_oauth_tokens` (persisted access + refresh tokens, encrypted)

### Flow invariants Core enforces

- PKCE S256 mandatory.
- 256-bit cryptographic-random state; sessions are single-use.
- Sessions expire after 10 minutes; the orchestrator maintenance loop
  sweeps expired sessions every 10 minutes
  (`orchestrator/maintenance.go`).
- Refresh is serialised per connection via `SELECT ... FOR UPDATE` with
  double-checked freshness inside the tx — multi-instance safe.
- Refresh tokens are carried forward when the vendor doesn't rotate
  (common — HubSpot, Stripe Connect).
- Partial unique indexes on `(connector_id, workspace_id)` on
  `connection_oauth_clients` guarantee at most one row per
  (connector, workspace), so concurrent DCR resolves cleanly.
- Callback is public but validates state; vendor body snippets are
  logged, never surfaced to the client.
- `postMessage` target origin is always pinned to the console's URL.
  The callback page has a response-scoped CSP override so Helmet
  doesn't block the inline postMessage script.

See `irmin-connectors/guides/oauth-connectors.md` for the
connector-facing details.

## Connection testing

`POST /workspaces/:w/connections/:c/test` runs
`services.APIServices.TestConnection`, which calls the connector's
`/configuration/validate` with the stored `details` and `settings`
(fetched decrypted). Returns a structured
`ConnectorConfigurationValidationResult{ok, can_connect, errors}`.

For OAuth connections, testing means "do we have a valid access token,
and does the vendor accept it?" The token is fetched from
`oauth_tokens` (with refresh if stale) and then the connector runs a
vendor-side check. No separate testing path — OAuth connections look
like static-credential ones from the TestConnection API.

## Supported operation types

| Type | Core API path | Connector capability | Returned/sent data |
|---|---|---|---|
| `pull` | Import workflow, manual pull | `pull` | ZIP of files (vendor → Irmin) |
| `push` | Export workflow, manual push | `push` | ZIP of files (Irmin → vendor) |
| `patch` | Pipeline patch stage | `apply_patch` | JSON Patch (Irmin → vendor) |
| `patch_event` | Connection subscription | `patch_event` | JSON Patch events (vendor → Irmin, via webhook) |

A connector's advertised `capabilities` in `/info` constrains which of
these operation types Core will invoke. Core never invents a capability.

## "Everything is a File" philosophy

All data that flows through a connector is represented as a file inside
a ZIP archive. No matter the shape of the external system:

- Database tables → CSV files
- API JSON responses → JSON files
- Vendor documents (PDF, image, etc.) → kept as their original format
- GraphQL query results → JSON
- Vendor webhook events → JSON Patch entries

This keeps LakeFS versioning semantics uniform — every commit is a set
of files, regardless of source. DuckDB handles the conversion between
file formats during import/export with field mappings.

## Connection schemas

Every operation returns a schema (`/operation/schema/{method}`) — a
typed description of what the files contain. Schemas are
`irminmodels.ObjectSchema`: hierarchical, supports nested objects and
arrays, each field typed (string, integer, float, boolean, date, bytes,
or nested).

Core caches schemas in `ConnectionSchemaCache` so the console doesn't
have to re-query the connector on every page load. Cache invalidation
is opportunistic (TTL + operation-triggered).

## Using connections (from the user's side)

End users encounter connections in three workflows:

1. **Import** — pull data from an external system into a LakeFS repo on
   a schedule or manual trigger. Workflow type: `import`.
2. **Export** — push LakeFS data out to an external system.
   Workflow type: `export`.
3. **Pipeline** — multi-stage workflow that combines imports/exports/
   compute actions/patches with branching logic. Each stage refers to
   connections by SQID.

All three go through the same operation machinery. A Pipeline is just
a sequence of single-operation steps with orchestrator glue.

## Examples

### Create + test an OAuth connection (Stripe)

```http
POST /api/v1/workspaces/acme/connections
Content-Type: application/json
Authorization: Bearer {user_jwt}

{
  "name": "Stripe (primary)",
  "connector": "conn_stripe_sqid",
  "settings": {"api_version": "2024-06-20"},
  "details": {}
}
```
→ creates the Connection.

```http
POST /api/v1/workspaces/acme/connections/{sqid}/oauth/start
```
→ returns `{"authorization_url": "https://connect.stripe.com/..."}`.

Console opens the URL in a popup; user authorises; vendor redirects to
Core's `/api/v1/oauth/callback`; callback page `postMessage`s success
to the opener; console closes the popup.

```http
POST /api/v1/workspaces/acme/connections/{sqid}/test
```
→ Core fetches a fresh access token, asks the connector to validate,
returns `{ok: true, can_connect: true}`.

### Run a pull

Typically via a Workflow (Import type), but manually:

```http
POST /api/v1/workspaces/acme/connections/{sqid}/pull
{ "path": "/charges", "parameters": {"from": "2024-01-01"} }
```

Core's engine spins up an operation against the connector, streams the
ZIP back, applies configured field mappings via DuckDB, uploads the
result to LakeFS.

## Seeding global OAuth clients (`-seed-oauth-clients`)

Static-client OAuth connectors (Google Drive, Stripe Connect, etc.) need a
single admin-configured `connection_oauth_clients` row per environment
before any user can run the flow. The `-seed-oauth-clients` flag automates
that step from environment variables so the same boot pipeline that ships
schema migrations also ships OAuth credentials, with no manual SQL.

```bash
go run main.go -seed-oauth-clients
```

The flag is idempotent: re-running upserts `client_id`, `redirect_uri`, and
the encrypted client secret on the existing global row. Connectors with no
env vars set are silently skipped — the flag is a no-op in environments
that don't have any admin-configured OAuth apps.

### Env var naming convention

Each seedable connector uses a stable env prefix:

| Env var | Purpose |
|---|---|
| `<PREFIX>_CLIENT_ID` | OAuth client ID issued by the vendor |
| `<PREFIX>_CLIENT_SECRET` | OAuth client secret (stored encrypted at rest) |
| `CONNECTOR_OAUTH_REDIRECT_URI` | Shared redirect URI for every connector (default: `https://localhost:8082/api/v1/connectors/oauth/callback`) |

The redirect URI is a single value across all seeded connectors because
every vendor callback lands on the same Core endpoint — the connector is
disambiguated by the `state` parameter, not by URL.

### Adding a new connector to the seed registry

1. Add the seed config in `lib/seedOAuthClients.go::oauthClientSeeds`:

   ```go
   {EnvPrefix: "STRIPE", ConnectorName: "Stripe"},
   ```

   `ConnectorName` must match the `name` column on the `connectors` row
   exactly. Lookup is by name, not SQID, so the seeder works on a fresh
   install where the connector ID isn't known yet.

2. Add matching fields on `utils.CoreAPIEnv` and load them in
   `utils/loadEnvs.go` (`<PREFIX>_CLIENT_ID`, `<PREFIX>_CLIENT_SECRET`).

3. Wire the new env-var pair into `credsForSeed` in
   `lib/seedOAuthClients.go`. The switch is explicit on purpose so a
   missing wiring is a compile error rather than a silent no-op.

4. Document the new env vars in `.env.example`.

### Seeding vs Dynamic Client Registration

These two paths populate the same `connection_oauth_clients` table from
opposite directions; pick the one the vendor supports.

| | Seeding (`-seed-oauth-clients`) | DCR (RFC 7591) |
|---|---|---|
| **Triggered by** | Admin running the flag at deploy time | First user starting a flow on a DCR-capable connector |
| **Row scope** | Global — `workspace_id IS NULL`, shared across all workspaces | Workspace-scoped — `workspace_id = <user's workspace>` |
| **Rows per connector** | One per environment | One per (connector, workspace) pair |
| **Vendor support needed** | OAuth 2.0 + manually creatable apps | RFC 7591 `dcr_endpoint` |
| **Example vendors** | Google Drive, Stripe Connect, HubSpot | Linear, Intercom, Sentry |
| **Admin work per workspace** | None after initial seed | None ever |

The partial unique indexes on `(connector_id, workspace_id)` keep both
paths from stepping on each other: a DCR registration for a workspace
never collides with the global seed, and concurrent seed runs collapse
to one row via the `(connector_id) WHERE workspace_id IS NULL` index.

### Worked example: Google Drive

```bash
# 1. Register the OAuth app in Google Cloud Console (one time per environment).
#    Authorized redirect URI must match CONNECTOR_OAUTH_REDIRECT_URI exactly.

# 2. Put credentials in the deployment's env / .env file.
export GOOGLE_DRIVE_CLIENT_ID=1234567890-abc.apps.googleusercontent.com
export GOOGLE_DRIVE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx
export CONNECTOR_OAUTH_REDIRECT_URI=https://api.example.com/api/v1/connectors/oauth/callback

# 3. Run the seed flag (also works from a Docker entrypoint or migration job).
go run main.go -seed-oauth-clients

# Logs:
#   level=INFO msg="seeded global OAuth client" connector="Google Drive" \
#     connector_id=42 client_id=1234567890-abc.apps.googleusercontent.com
```

After this, any workspace can create a Google Drive Connection and start
the OAuth flow without further admin intervention — Core resolves the
global client via `GetConnectionOAuthClientForConnector`, which falls back
to `workspace_id IS NULL` when no workspace-scoped row exists.

## Further reading

- `irmin-connectors/guides/connector-architecture.md` — same topics
  from the connector's own point of view
- `irmin-connectors/guides/how-to-create-connectors.md` — building a
  new connector
- `irmin-connectors/guides/oauth-connectors.md` — OAuth flow + vendor
  list + static-vs-DCR
- `services/connectionoauth/` — the flow orchestration code
- `lib/crypto/` — encryption at rest for `details` and OAuth tokens
