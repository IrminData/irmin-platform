# Concepts and Processes

This document explains the core concepts, architecture, and processes behind the Irmin Connectors system.

## Core Concepts

### What is a Connector?

A connector is a specialized application that:
- **Defines Interfaces**: Standardized endpoints for system interaction
- **Handles Authentication**: Manages secure connections to external systems
- **Processes Data**: Transforms and transfers data between Irmin and external services
- **Maintains State**: Operates in a stateless manner for reliability and scalability
- **Ensures Safety**: Implements secure practices for credential and data handling

### What is an Operation?

An operation represents a specific task or workflow involving data transfer:
- **Pull Operations**: Extract data from external systems into Irmin
  (async — Core polls until terminal, then fetches the ZIP result)
- **Push Operations**: Send data from Irmin to external systems
  (async — Core polls until terminal; success surface is `204 No
  Content`, no artifact to download)
- **Patch Operations**: Update existing data in external systems
  (async — same shape as push)
- **Subscribe Operations**: Monitor external systems for real-time
  changes (sync — webhook registration is fast and idempotent)

Pull, push, and patch all run as **async jobs**: Core POSTs a Start*
request, the connector returns 202 + `{job_id, operation_token}` and
launches a worker goroutine, and Core polls
`/operation/status/:job_id` (authenticated with the per-job operation
token) until status is terminal. Subscribe / unsubscribe / schema
remain sync because they're cheap metadata or webhook-registration
operations with no long-running compute.

#### Operation Execution Lock and the JobManager Guard

Every execution of a pull / push / patch / schema request flows
through `common.JobManager.Begin`, which acquires a session-scoped
Postgres advisory lock on the operation's ID and persists a
pending `OperationJob` row. The returned `OperationGuard` owns
that lock for the full operation lifetime; its `Release` method
writes the terminal status (complete / failed / cancelled) and
frees the lock on the same pinned PG session.

Key properties connector authors should rely on:

- **Contention surfaces structurally.** A second caller hitting
  the same operation while the first is in-flight receives a 409
  `AlreadyRunningBody` carrying the blocking `job_id`, `kind`, and
  `started_at` — not an opaque error string.
- **Synchronous release is safe against panics.** The common
  handlers wrap provider code in a `defer recover()` that
  releases the guard with `status=failed` before rethrowing, so a
  buggy provider cannot leave an `OperationJob` stuck at running.
- **Pool-handle lock helpers are deprecated.** Do not call
  `db.TryLockOperationExecution` / `db.UnlockOperationExecution`
  in new code: the unlock can route to a different pool
  connection than the lock and silently fail to release. Route
  through `manager.Begin` + `guard.Release` instead.
- **Stuck rows are janitor-reclaimable.** If a worker process
  dies before writing the terminal status, the janitor's
  `StuckThreshold` pass probes the advisory lock and marks the
  row failed once the holder's session is gone. Heartbeats every
  30s bump `updated_at` so live-but-silent workers are not false-
  positive reclaimed.

### "Everything is a File" Philosophy

Connectors follow the principle that all data should be treated as files:
- **Database Tables** → CSV files within ZIP archives
- **API Responses** → JSON files
- **Documents** → Files in their original format
- **Media Content** → Binary files

This approach provides consistency regardless of the underlying data source and simplifies data handling across different systems.

## How Connector Registration Works

### Registration Process

1. **Startup Registration**: When the connector server starts, it automatically registers all available connectors with the Irmin API
2. **Token Generation**: Each connector receives a unique system token for authentication
3. **Database Storage**: Registration details are stored locally for token validation
4. **Health Verification**: The Irmin API validates connector availability through health checks
5. **Update Handling**: Existing connectors are updated rather than re-registered

### Registration Components

- **System Tokens**: Long-lived tokens for connector management operations
- **Connector Metadata**: Name, capabilities, endpoints, and configuration requirements
- **Health Endpoints**: Used by Irmin API to verify connector availability
- **Version Information**: Tracks connector versions and compatibility

## Database Usage

The local database serves several critical functions:

### What is Stored?

- **Connector Registrations**: Links between local connectors and Irmin API registrations
- **System Tokens**: Authentication tokens for each registered connector
- **Per-Job Operation Tokens**: Short-lived credentials minted on every
  Start\* request, scoped to one job's lifecycle (status / result /
  cancel by `job_id`)
- **Subscription Data**: Information about active change subscriptions
- **Configuration Cache**: Cached configuration data for performance

### Database Schema

The database maintains tables for:
- `connector_registrations`: Connector registration and token information
- `operations`: Long-lived per-Connection rows. Carry the
  upserted-on-every-Start\* details + settings keyed on
  `(ConnectorRegistrationID, ConfigHash)` so the worker can read
  credentials without re-parsing them on every request.
- `operation_jobs`: Per-job async lifecycle rows. Status, cumulative
  Progress JSON, ResultPath, OperationToken, ExpiresAt. Reaped by
  the janitor at `JobManager.DefaultJobTTL` (15 min).
- `subscriptions`: Real-time change subscription configurations

## Data Transmission

### How Data Flows Between Connectors and Irmin API

1. **ZIP Archive Format**: All data is transmitted as ZIP files containing structured data
2. **HTTP/HTTPS Transport**: Secure HTTP connections for all data transfer
3. **Chunked Transfer**: Large datasets are handled with appropriate chunking
4. **Compression**: Built-in compression reduces transfer time and bandwidth usage
5. **Error Recovery**: Robust error handling and retry mechanisms

### Data Security

- **Encryption in Transit**: All data transmission uses HTTPS/TLS
- **Token-Based Authentication**: Operation and system tokens secure all endpoints
- **Credential Isolation**: User credentials are never stored permanently
- **Audit Logging**: Comprehensive logging of all data operations

## Webhooks and Patch Events

### Webhook Support

Connectors with the `patch_event` capability can emit change events via webhooks when data changes in the external system. This enables real-time data synchronization workflows.

#### Connection Subscriptions

Subscriptions are managed through the main Irmin API:

- **Create Subscription**: `POST /api/v1/workspaces/{workspace}/connections/{connection}/subscriptions`
- **List Subscriptions**: `GET /api/v1/workspaces/{workspace}/connections/{connection}/subscriptions`
- **Get Subscription**: `GET /api/v1/workspaces/{workspace}/connections/{connection}/subscriptions/{subscription}`
- **Update Subscription**: `PATCH /api/v1/workspaces/{workspace}/connections/{connection}/subscriptions/{subscription}`
- **Delete Subscription**: `DELETE /api/v1/workspaces/{workspace}/connections/{connection}/subscriptions/{subscription}`
- **Regenerate Token**: `POST /api/v1/workspaces/{workspace}/connections/{connection}/subscriptions/{subscription}/regenerate-token`

#### Webhook Event Format

Connectors send patch events to the webhook URL with the following structure:

```json
{
  "subscription_id": "cs_abc123",
  "connection_id": "conn_xyz789",
  "event_type": "update",
  "timestamp": "2024-01-15T10:30:00Z",
  "patches": [
    {
      "op": "replace",
      "path": "/users/john-doe/name",
      "value": "John Smith"
    }
  ]
}
```

#### Authentication

Webhook requests include the subscription token in the `Authorization` header:

```
Authorization: Bearer <webhook_token>
```

### Patch Operations

Connectors with the `apply_patch` capability can receive and apply incremental changes. The patch format follows JSON Patch (RFC 6902):

```json
[
  {"op": "add", "path": "/data/new-file.json", "value": {...}},
  {"op": "replace", "path": "/data/existing.json/field", "value": "new value"},
  {"op": "remove", "path": "/data/old-file.json"}
]
```

#### Binary Data in Patches

For binary data (images, files), patches can include content type and base64 encoding:

```json
{
  "op": "add",
  "path": "/images/profile.png",
  "value": "iVBORw0KGgoAAAANSUhEUgAA...",
  "content_type": "image/png",
  "encoding": "base64"
}
```

### Pipeline Patch Stage

Pipelines can include a `patch` stage type to apply patches from trigger events:

```json
{
  "type": "patch",
  "patch_direction": "to_repository",
  "patch_source_file": "trigger_event.json",
  "patch_repository": "my-repo",
  "patch_repository_branch": "main",
  "patch_repository_path": "/data"
}
```

Or to apply patches to an external connection:

```json
{
  "type": "patch",
  "patch_direction": "to_connection",
  "patch_source_file": "trigger_event.json",
  "patch_connection_id": "conn_xyz789",
  "patch_connection_path": "/leads"
}
```

### Connector Capabilities

The following capabilities determine what operations a connector supports:

| Capability | Description |
|------------|-------------|
| `pull` | Can read/import data from external system |
| `push` | Can write/export data to external system |
| `apply_patch` | Can receive and apply incremental patches |
| `patch_event` | Can emit change events via webhooks |

### Generic Connector Features

All connectors implement standard endpoints:
- **Information Endpoint**: Provides connector capabilities and metadata
- **Configuration Endpoints**: Handle dynamic configuration field generation
- **Validation Endpoints**: Validate connection settings and credentials
- **Operation Lifecycle**: Initialize, execute, and monitor operations
- **Health Checks**: Report connector health and availability

## Security and Credential Management

### Credential Handling Principles

- **No Permanent Storage**: Credentials are only held during active operations
- **Encryption**: All sensitive data is encrypted at rest and in transit
- **Access Control**: Role-based access to connector operations
- **Audit Trails**: Complete audit logs for credential access and usage

### Authentication Levels

1. **System Authentication**: Connector-to-Irmin API communication
2. **Operation Authentication**: Specific operation authorization
3. **External Authentication**: Credentials for external system access. Two
   flavors exist side-by-side:
   - **Static credentials** collected via DynamicField forms (username +
     password, API key, TLS cert…). This is the legacy path used by
     Postgres, MySQL, SFTP, HTTP, etc.
   - **OAuth 2.0 (authorization code + PKCE)** when the vendor offers it.
     Irmin Core runs the browser flow, persists tokens encrypted at rest,
     and refreshes them transparently. The connector never sees or stores
     the refresh token. See the dedicated `oauth-connectors.md` guide.

## OAuth-Backed Connectors

OAuth is the preferred auth method for SaaS vendors that support it
(HubSpot, Stripe, Intercom, Linear, Sentry, ...). The connector declares
the vendor's OAuth metadata on `/info`; Irmin Core runs the flow and
holds the tokens; the connector asks Core for a fresh access token on
every vendor-bound request.

### End-to-End Flow

```
User clicks "Connect with X" in the console
  │
  ▼
Console calls Core: POST /workspaces/:w/connections/:c/oauth/start
  │
  ├─ Core fetches connector /info → reads ConnectionOAuthConfig
  ├─ Core looks up ConnectionOAuthClient row (or DCR-registers one
  │   lazily if ConnectionOAuthConfig.DCREndpoint is set)
  ├─ Core persists a ConnectionOAuthSession (10 min TTL) with a
  │   256-bit random state + PKCE S256 verifier/challenge
  └─ Core returns the vendor's authorization URL
  │
  ▼
Console opens it in a popup; the user approves at the vendor
  │
  ▼
Vendor redirects to Core: GET /api/v1/oauth/callback?state=...&code=...
  │
  ├─ Core validates state (single-use, not expired)
  ├─ Core POSTs vendor token endpoint with code + PKCE verifier
  ├─ Core persists ConnectionOAuthToken (access + refresh encrypted)
  ├─ Core deletes the session row (same transaction)
  └─ Core renders popup HTML that postMessage()s the console
  │
  ▼
Later, every operation (init/pull/push/patch/...) that needs vendor I/O:
  │
Core → connector: operation request
  with header  X-Irmin-Connection-Id: <connection_id>
  │
  ▼
Connector → Core: POST /api/v1/system/oauth/access-token
  with Authorization: Bearer {IRMIN_API_TOKEN}
  and body {"connection_id": N}
  │
  ├─ Core returns the cached access token, OR refreshes it if inside
  │   the expiry skew window (row-locked so concurrent calls serialize)
  └─ Response: {"data":{"access_token":"...", "token_type":"Bearer",
     "expires_at":"...", "scope":"..."}}
  │
  ▼
Connector calls vendor API with Authorization: Bearer <access_token>
```

### Key Invariants

- **Tokens never leave Core.** The connector never persists vendor access
  or refresh tokens. It asks Core on every vendor-bound request.
- **Refresh is serialized per connection.** Core row-locks the token
  during refresh so concurrent operations on the same Connection don't
  race the vendor into refresh-token rotation failures.
- **PKCE S256 is mandatory.** A connector that declares `PKCE: false` is
  refused at flow start. No silent downgrades.
- **State is single-use.** A successful callback deletes the session row
  inside the same transaction that persists the token, so a replayed
  `state` cannot complete a second exchange.
- **Callback rejects expired sessions.** Sessions past their `ExpiresAt`
  fail with `ErrStateInvalid` even if the row is still present.

### Static Client vs Dynamic Client Registration

OAuth vendors fall into two camps. The connector picks one by setting
`ConnectionOAuthConfig.DCREndpoint`:

| Type | Who registers | Operator setup | Vendors |
|---|---|---|---|
| **Static client** | Admin, once per environment, in the vendor's developer portal | Enter `client_id` + `client_secret` into `connection_oauth_clients` with `workspace_id=NULL` | HubSpot, Stripe, most traditional OAuth providers |
| **Dynamic Client Registration (RFC 7591)** | Core, automatically on first use in each workspace | None | Intercom, Linear, Sentry, and most MCP-compatible services |

Static clients are shared across all workspaces; DCR clients are per
workspace (each tenant gets its own registration at the vendor).

### Cross-Service Wire Contract

The `X-Irmin-Connection-Id` header is stamped by Core on every outbound
request to a Connection-scoped operation. The canonical form is
`X-Irmin-Connection-Id`, defined as:

- `connectorsclient.HeaderConnectionID` on the Core side
- `lib.HeaderConnectionID` on the connectors side

Both constants must hold the same string. Tests on both sides lock in
the value; the `Id` (not `ID`) casing matches Go's canonical HTTP header
form so `net/http`'s internal canonicalization doesn't rewrite it at
send time.

### Relationship to DynamicField Forms

OAuth and the legacy DynamicField form path coexist. An OAuth-backed
connector should:

- Declare `ConnectionOAuthConfig` on `/info`
- Omit credential fields from its `details` DynamicField schema (the
  browser flow collects them)
- Keep workspace-scoped selection fields (project, database, etc.) on
  its `settings` DynamicField schema as usual

Existing static-credential connectors continue to work unchanged.

### See Also

- `how-to-create-connectors.md` — step-by-step build guide including
  OAuth specifics
- `oauth-connectors.md` — planned OAuth connectors, static-vs-DCR
  comparison, 6-step recipe for new OAuth connectors

## Repository Structure

This repository contains:
- **Connector Implementations**: Individual connector modules in the `connectors/` directory
- **Shared Libraries**: Common utilities and models in `lib/` and `models/`
- **Database Layer**: Connection and registration management in `db/`
- **Public Assets**: Connector logos and resources in `public/`
- **Documentation**: Comprehensive guides and specifications

## Standard Connector Architecture

### Required Endpoints

Every connector must implement these endpoints:

#### System Token Authenticated Endpoints
- **`GET /{connector-slug}/info`** — Returns connector information and capabilities
- **`POST /{connector-slug}/configuration/{key}/fields`** — Returns dynamic configuration fields
- **`POST /{connector-slug}/configuration/validate`** — Validates connection configuration
- **`POST /{connector-slug}/operation/pull`** — **Start** a pull job; returns 202 `{job_id, operation_token}`
- **`POST /{connector-slug}/operation/push`** — **Start** a push job; returns 202 `{job_id, operation_token}`
- **`POST /{connector-slug}/operation/patch`** — **Start** a patch job; returns 202 `{job_id, operation_token}`
- **`POST /{connector-slug}/operation/schema/{operation}`** — Returns schema for the operation (sync)
- **`POST /{connector-slug}/operation/subscribe`** — Register a webhook (sync, optional)
- **`POST /{connector-slug}/operation/unsubscribe`** — Unregister a webhook (sync, optional)

#### Per-Job Operation Token Authenticated Endpoints
These are kind-agnostic — they work for any job kind, identified by `:job_id`:
- **`GET /operation/status/:job_id`** — Returns current state + cumulative `Progress` slice
- **`GET /operation/result/:job_id`** — For pull: streams the ZIP archive. For push/patch: 204 No Content. 410 if expired/missing.
- **`POST /operation/cancel/:job_id`** — Best-effort cancel; signals the worker to wind down

#### Public Endpoints
- **`GET /{connector-slug}/details`** — Public information about the connector

> **Phase 4 cleanup landed**: `/operation/init`, the operation-id-
> scoped `/operation/cancel`, and the operation-id-scoped
> `/operation/status` are gone. The Operation row a worker needs is
> upserted inline by the `EnsureOperation` middleware on every
> Start\* request — credentials flow on the request body via
> `details[<key>]=<value>` / `settings[<key>]=<value>` fields the SDK
> ships under `StartOperation*Request.Details` / `.Settings`.

### File Structure Convention

```
connectors/{connector-name}/
├── models/
│   ├── connectionSettings.go    # Connector-specific configuration
│   └── connectionDetails.go     # User credentials and connection details
├── controllers/
│   └── controllers.go           # HTTP endpoint handlers
├── client/
│   └── client.go               # External system client implementation
├── config/
│   └── config.go               # Configuration field definitions
├── routes.go                   # Route definitions and middleware setup
├── listener.go                 # Change subscription listener (if applicable)
└── README.md                   # Connector-specific documentation
```

## Operation Lifecycle (Async Job Protocol)

### Job States

```
                  POST /operation/{pull|push|patch}
                            │
                            ▼
                       [pending]
                            │
                            │ JobManager.StartJobWithGuard
                            │ launches worker goroutine
                            ▼
                       [running] ←─ heartbeats every 30s
                       │  │  │
        success ───────┘  │  └─────── error
            │             │              │
            ▼             ▼              ▼
       [complete]   [cancelled]      [failed]
            │             │              │
            └─────────────┴──────────────┘
                            │
                            ▼
                  reaped by janitor at ExpiresAt
                  (DefaultJobTTL=15min)
```

The advisory lock acquired by `JobManager.Begin` is held for the
worker's entire lifetime. A second caller hitting the same operation
while the first is in-flight receives **409** with the
`AlreadyRunningBody` carrying the blocking `job_id`, `kind`, and
`started_at`.

### Token Management

Three token tiers, each with distinct scope:

- **System token** — issued at connector registration, long-lived,
  one per connector registration. Authenticates Start* requests
  (creates jobs) and metadata routes (info, config, schema,
  subscribe).
- **Per-job operation token** — minted on every Start* request,
  returned in the 202 body. Scope-limited to that single job's
  lifecycle routes (`/operation/status/:job_id`,
  `/operation/result/:job_id`, `/operation/cancel/:job_id`).
  Valid until the job's `OperationJob` row is reaped (15 min) or
  cancelled.
- **Webhook token** — issued by Core during
  `/operation/subscribe`, used by the connector for outbound
  webhook calls back to Core when external systems change.

The connectors service rejects the system token on per-job
lifecycle routes by design: a leaked or compromised system token
cannot poll, fetch results from, or cancel jobs it did not start.

## Error Handling and Recovery

### Error Categories

- **Configuration Errors**: Invalid settings or missing required fields
- **Authentication Errors**: Invalid credentials or expired tokens
- **Network Errors**: Connection issues or timeouts
- **Data Errors**: Schema mismatches or validation failures
- **System Errors**: Internal server errors or resource limitations

### Recovery Mechanisms

- **Automatic Retry**: Transient errors are retried with exponential backoff
- **Graceful Degradation**: Partial failures are handled appropriately
- **Error Reporting**: Detailed error information is provided to users
- **Rollback Capabilities**: Failed operations can be rolled back when possible

## Performance Considerations

### Optimization Strategies

- **Connection Pooling**: Reuse database and external service connections
- **Batch Processing**: Group operations for efficiency
- **Streaming**: Handle large datasets without loading everything into memory
- **Caching**: Cache frequently accessed configuration and schema data
- **Compression**: Compress data transfer to reduce bandwidth usage

### Monitoring and Metrics

- **Operation Metrics**: Track success rates, duration, and throughput
- **Resource Usage**: Monitor CPU, memory, and network utilization
- **Error Rates**: Track and alert on error patterns
- **Performance Trends**: Analyze performance over time

This document provides the foundational understanding needed to work with and extend the Irmin Connectors system.