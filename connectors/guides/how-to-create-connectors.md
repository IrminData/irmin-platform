# How to Create Connectors

This guide explains how to add a new connector to the Irmin Connectors repository.

## Overview

Connectors define the interfaces that allow Irmin to interact with external systems in a simple, standardized, stateless and safe fashion. Each connector implements a set of standard endpoints that handle authentication, configuration, and data operations.

### Read this first

- **New to how connectors work?** Read `connector-architecture.md`
  before this file. It explains the conceptual model — who talks to
  whom, what authenticates what, what an operation is — so the
  mechanical steps below make sense.
- **Concepts and lifecycle:** `concepts-and-processes.md` has the
  end-to-end view including Core-side pieces.
- **Building an OAuth-backed connector?** The generic "Adding a New
  Connector" steps below apply to you; the OAuth-specific
  additions/deltas are in the dedicated **"OAuth-Backed Connectors"**
  section at the bottom of this file.
- **Shared base:** lifecycle plumbing (routes, middleware, op
  init/status/cancel) and OAuth wiring (token resolution, retry,
  Info stamping) live in `connectors/common/`. Concrete connectors
  embed `*common.Controllers` and (for OAuth) `*common.OAuthConnector`,
  then implement only vendor-specific code. See
  [`connectors/common/README.md`](../connectors/common/README.md) for
  the full API reference.

## Adding a New Connector

### 1. Create the Connector Directory Structure

Create a new directory in the `connectors/` folder with your connector name:

```
connectors/
└── your-connector/
    ├── models/
    │   ├── connectionSettings.go
    │   └── connectionDetails.go
    ├── controllers/
    │   └── controllers.go
    ├── client/
    │   └── client.go
    ├── config/
    │   └── config.go
    ├── routes.go
    └── listener.go (if your connector supports subscriptions)
```

### 2. Files That Need to be Edited

When adding a new connector, you must edit these files:

1. **`connectors/connectors.go`** — add your connector to:
   - `SetupConnectorRoutes(app)` — call your package's
     `SetupRoutes(app)` so routes register at startup.
   - `SetupListenerManager(logger, db)` — register your
     `StartListener` if your connector supports subscriptions
     (`ConnectorCapabilityPatchEvent`).
   - `RegisterAllConnectors(...)` — append a `{Name, Slug}` entry so
     the connector self-registers with Core's API on boot.

2. **`public/`** directory — add your connector's logo and any
   public assets referenced from the details page template.

3. **`templates/connector-details/`** + **`templates/embedded.go`** —
   add the HTML template for the public details page (see Section 8).

### 3. Standard Connector Endpoints

Every connector must implement these endpoints:

#### System Token Authenticated Endpoints

These endpoints are called by Irmin Core and authenticate with the
connector's system token. Start* return 202 + a per-job operation
token; sync metadata routes return their result inline.

- **`GET /{connector-slug}/info`** — Connector information and capabilities
- **`POST /{connector-slug}/configuration/{key}/fields`** — Dynamic configuration fields
- **`POST /{connector-slug}/configuration/validate`** — Validate connection configuration
- **`POST /{connector-slug}/operation/pull`** — **Start** a pull job (202)
- **`POST /{connector-slug}/operation/push`** — **Start** a push job (202)
- **`POST /{connector-slug}/operation/patch`** — **Start** a patch job (202)
- **`POST /{connector-slug}/operation/schema/{operation}`** — Schema for the operation (sync)
- **`POST /{connector-slug}/operation/subscribe`** — Register a webhook (sync)
- **`POST /{connector-slug}/operation/unsubscribe`** — Unregister a webhook (sync)

#### Per-Job Operation Token Authenticated Endpoints

These are kind-agnostic lifecycle routes — they work for any job
identified by `:job_id`, regardless of whether it's pull / push /
patch. The bearer is the `operation_token` returned in the Start*
202 response, NOT the connector's system token. The service
rejects the system token here by design (scope limitation).

- **`GET /operation/status/:job_id`** — Current status + cumulative `Progress` slice
- **`GET /operation/result/:job_id`** — Pull: stream the ZIP. Push/patch: 204 No Content.
- **`POST /operation/cancel/:job_id`** — Best-effort cancel

#### Public Endpoints

- **`GET /{connector-slug}/details`** — Public information about the connector (uses HTML templates)

> **Phase 4 retired routes** — `/operation/init` and the operation-
> id-scoped `/operation/cancel` / `/operation/status` are gone.
> Credentials flow on every Start\* request via the SDK's
> `details[<key>]` / `settings[<key>]` form fields; the
> `EnsureOperation` middleware parses them and upserts the
> matching `Operation` row inline before the worker runs.

### 4. Authentication

#### System Tokens
- Used for connector management operations
- Generated during connector registration
- Validated against the database
- Required for configuration and operation lifecycle endpoints

#### Per-Job Operation Tokens
- Minted on every `Start*` request; returned in the 202 body as
  `operation_token` alongside `job_id`
- Required only on the per-job lifecycle routes
  (`/operation/status/:job_id`, `/operation/result/:job_id`,
  `/operation/cancel/:job_id`); the system token is rejected there
  by design (scope limitation)
- Lifetime bounded by the OperationJob row's `ExpiresAt`
  (default 15-minute janitor TTL) or the next `cancel`

### 5. Data Structures

The connector-side wire shape for credentials and configuration is
two flat `map[string]string` blobs called `details` and `settings`.
Connector-specific schemas (which fields, types, labels, defaults)
live in `config/config.go` as `map[string]irminmodels.DynamicField`
definitions, not as Go structs:

```go
// config/config.go
func GetDetailsFieldDefinitions() map[string]irminmodels.DynamicField {
    return map[string]irminmodels.DynamicField{
        "host":     {Type: "string",  Label: "Host",     Required: true},
        "port":     {Type: "integer", Label: "Port",     Required: false},
        "username": {Type: "string",  Label: "Username", Required: true},
        "password": {Type: "string",  Label: "Password", Required: true, Secret: true},
    }
}
```

Many existing connectors also keep typed `ConnectionDetails` /
`ConnectionSettings` Go structs in `models/` purely for internal
ergonomics — converting the inbound `map[string]string` into a
typed value once at the start of an operation. That's optional;
nothing in the shared base requires them.

The provider methods that wire these together:

- `OperationConfigProvider.GetOperationFormFields` — return the
  required + optional field names (use
  `common.GetRequiredFieldNames` / `GetOptionalFieldNames` against
  your DynamicField definitions to derive them automatically).
- `OperationConfigProvider.BuildDetails` /
  `BuildSettings` — turn the parsed form into the
  `map[string]string` shape Core expects (use
  `common.BuildDetailsFromFields` /
  `BuildSettingsFromFields`).
- `ConfigFieldProvider.GetDynamicFields` — return the field
  definitions for the requested `key` ("details" or "settings"),
  optionally enriching `settings` with runtime data (e.g. populate
  a database-name dropdown by fetching the list from the vendor).
- `ConfigValidationProvider.TestConnection` — actually open a
  connection with the provided details to verify they work.

Full provider interface definitions and reference implementations
are in
[`connectors/common/README.md`](../connectors/common/README.md).

### 6. What Connectors Should Accept and Return

#### Input Expectations
- **Configuration**: JSON objects containing connection settings and details
- **Data Operations**: Structured data in JSON format
- **Authentication**: Bearer tokens in headers

#### Output Requirements
- **Data**: Return data as files in ZIP format
- **Errors**: Structured error responses with meaningful messages
- **Status**: Clear operation status indicators
- **Schema**: Detailed schema information for data validation

### 7. "Everything is a File" Concept

Connectors should treat all data as files:
- Database tables → CSV files
- API responses → JSON files
- Documents → Original format files
- Images/Media → Binary files

This provides a consistent interface regardless of the underlying data source.

### 8. Connector Detail Pages and Templates

Each connector should provide a public details page that explains its capabilities and configuration. These pages use a templating system for consistency and maintainability.

#### Template System

The connector project uses embedded HTML templates located in the `templates/` directory:

```
templates/
├── connector-details/
│   ├── mysql.html
│   ├── postgres.html
│   └── sftp.html
├── embedded.go
└── templates.go
```

#### Adding a Details Page Template

1. **Create the HTML template:**
   ```html
   <!-- templates/connector-details/your-connector.html -->
   <!DOCTYPE html>
   <html lang="en">
   <head>
       <title>{{.Title}}</title>
       <!-- Include inline CSS for styling -->
   </head>
   <body>
       <img src="{{.LogoPath}}" alt="{{.LogoAlt}}">
       <h1>{{.Title}}</h1>
       <p>{{.Description}}</p>
       <!-- Additional content -->
   </body>
   </html>
   ```

2. **Add to embedded.go:**
   ```go
   //go:embed connector-details/your-connector.html
   var YourConnectorDetailsHTML []byte
   ```

3. **Update the template manager** in `templates/templates.go` to include your connector:
   ```go
   case "your-connector":
       htmlContent = YourConnectorDetailsHTML
   ```

4. **Implement the details page controller** by delegating to the
   shared helper. It loads the template, fills in the connector
   info (name, description, logo, capabilities), and renders the
   HTML — you only supply the connector slug and an optional
   subscription-flavoured description:

   ```go
   func (cs *Controllers) DetailsPage(c fiber.Ctx) error {
       return common.RenderConnectorDetailsPage(
           c,
           cs.App,
           "your-connector",
           config.GetConnectorInfo,
           // Optional: supply when the connector supports patch_event
           // and you want a custom blurb explaining how subscriptions
           // are wired (see PostgreSQL's details page for an example).
       )
   }
   ```

#### Template Data Structure

All templates use the `ConnectorDetailsData` structure:

```go
type ConnectorDetailsData struct {
    Title                    string  // Page title
    Description              string  // Connector description
    LogoPath                 string  // Path to connector logo
    LogoAlt                  string  // Alt text for logo
    EventListeningDescription string  // Event capabilities description
    DocsPath                 string  // Link to documentation
}
```

### 9. Implementation Steps

1. **Copy an existing connector** (e.g., postgres) as a template
2. **Modify the models** to match your external system's requirements
3. **Implement the controllers** for each required endpoint
4. **Create the client** to interface with your external system
5. **Add configuration logic** for dynamic field generation
6. **Implement data operations** (push, pull, patch)
7. **Add your connector to connectors.go** in all required functions
8. **Test thoroughly** with various configurations and data types

### 10. Best Practices

- **Security**: Never store credentials permanently, only during operations
- **Error Handling**: Provide clear, actionable error messages
- **Validation**: Validate all inputs thoroughly
- **Performance**: Implement efficient data transfer mechanisms
- **Logging**: Add comprehensive logging for debugging and monitoring
- **Documentation**: Document all configuration fields and their purposes

### 11. Example Implementation Pattern

Don't hand-wire routes. Use `common.SetupConnectorRoutes` — it
registers the full base + capability-based route set in one call,
puts the right middleware in front of each handler, and stays in
lockstep with any future additions to the connector contract:

```go
// routes.go
package yourconnector

import (
    "irmin-connectors/connectors/common"
    "irmin-connectors/connectors/your-connector/config"
    yourcontrollers "irmin-connectors/connectors/your-connector/controllers"
    "irmin-connectors/models"
)

func SetupRoutes(app *models.ConnectorsApp) {
    controller := yourcontrollers.NewControllers(app)
    common.SetupConnectorRoutes(common.ConnectorRouteConfig{
        App:           app,
        Controller:    controller,
        ConnectorSlug: "your-connector",
        Capabilities:  common.GetConnectorCapabilitiesFromConfig(config.GetConnectorInfo),
    })
}
```

`SetupConnectorRoutes` wires:

- **System-token middleware** in front of: `GET /info`,
  `POST /configuration/:key/fields`,
  `POST /configuration/validate`, the Start* routes
  (`/operation/pull`, `/operation/push`, `/operation/patch`),
  `POST /operation/schema/:operation`, and (when supported)
  `POST /operation/subscribe` + `POST /operation/unsubscribe`.
- **Per-job operation-token middleware** in front of the
  kind-agnostic lifecycle routes registered by `JobManager`:
  `GET /operation/status/:job_id`,
  `GET /operation/result/:job_id`,
  `POST /operation/cancel/:job_id`.
- **No auth** on `GET /details` (public preview).

See
[`connectors/common/README.md`](../connectors/common/README.md) for
the full API reference.

### 12. Testing Your Connector

Before submitting:
1. Test connector registration with Irmin API
2. Verify all endpoints respond correctly
3. Test data operations with sample data
4. Validate error handling scenarios
5. Check authentication mechanisms work properly

## Observability — progress events

A 10-minute Stripe import once produced zero log rows between the
job starting and `context deadline exceeded`. The connector wasn't
broken — Stripe pagination was slow — but without per-page emission
inside the pagination loop, operators saw nothing for 10 minutes,
then a timeout. Silent multi-minute operations are chronically hard
to triage.

Every long-running connector loop — paginated HTTP, retry/backoff,
chunked upload, SQL row scan, multi-file SFTP transfer — needs
per-iteration emission. The vocabulary lives in the SDK at
[`github.com/IrminData/irmin-platform/sdks/go/observability`](https://github.com/IrminData/irmin-platform/tree/main/sdks/go/observability)
so every Irmin service (connectors, Core orchestrator, AI agents)
and external connector authors reach the same shapes. Inside this
repo, [`connectors/common/progress.go`](../connectors/common/progress.go)
re-exports the SDK types as `common.ProgressEvent`,
`common.ProgressHandler`, `common.ProgressKind*` for
backward-compatibility — new code can use either import path
interchangeably (Go alias identity).

When a job is in flight, the progress events the provider emits
flow two ways simultaneously:

1. Into `db.OperationLog` rows (the connector's own log table),
   throttled per-kind by `common.LogOperationProgress`.
2. Into the OperationJob row's cumulative `Progress` JSON slice
   via the worker's `appendProgress` closure (smuggled through
   ctx by `common.WithJobProgress`). This is what the SDK client
   on Core surfaces back to the orchestrator's workflow run logs
   via `connectorjobs.RunWithProgress`.

A single `Emit(...)` from a provider therefore lights up the
connector log AND the workflow run timeline in Core — the operator
sees the same page/batch/file event in both places.

### The contract

Both `PullOperationProvider` and `PushOperationProvider` require:

```go
// Return nil only if the operation can't exceed ~10 seconds.
ProgressHandler(operation *db.Operation) common.ProgressHandler
```

Returning nil is allowed — the common pull/push handler emits a 30s
baseline heartbeat regardless. But anything that paginates, retries,
or batches should return a real handler.

### Skeleton

`common.NewProgressHandler` is the standard implementation. Hydrate
`p.logger` in `InitializeClient` first so the closure captures it:

```go
func (p *YourProvider) ProgressHandler(operation *db.Operation) common.ProgressHandler {
    return common.NewProgressHandler(p.dbInstance, p.logger, operation)
}

func (p *YourProvider) InitializeClient(
    c fiber.Ctx,
    logger *slog.Logger,
    operation *db.Operation,
) (any, *string, func(), error) {
    p.logger = logger
    client, err := yourclient.Init(...)
    if err != nil {
        return nil, nil, func() {}, err
    }
    client.SetProgressHandler(p.ProgressHandler(operation))
    // ...
}
```

The returned handler is always non-nil. Nil-safety lives in
`common.LogOperationProgress` (no-ops on nil `dbInstance`/`logger`),
so it's safe to invoke from tests or pre-hydration paths.

### Picking a kind

| Kind | When to fire | Throttling |
| --- | --- | --- |
| `ProgressKindPage` | Each pagination iteration (cursor-based or offset-based HTTP list endpoints). Set `Page`, `RecordsSoFar`, `Cursor`. | `LogOperationProgress` emits page 1 + every 5 pages. |
| `ProgressKindRateLimit` | Before each retry/backoff sleep. Set `Attempt`, `Wait`. | Unthrottled — every retry surfaces. |
| `ProgressKindBatch` | After each chunk of a bulk upload. Set `Batch`, `BatchSize`. | `LogOperationProgress` emits batch 1 + every 10 batches. |
| `ProgressKindQuery` | During SQL row scans. Set `Rows`. | **Caller throttles** via `common.ThrottledQueryEmitter` — every N rows OR every T of wall clock. |
| `ProgressKindFile` | Per file in a multi-file transfer. Set `File`, `BytesTransferred`, optionally `BytesTotal`. | Caller throttles (one file = one event is usually fine). |
| `ProgressKindHeartbeat` | Don't emit yourself — the common pull/push handler emits this every 30s automatically. | Always logs. |

`ResourcePath` should always be set so operators can disambiguate
multiple targets in one workflow: `/v1/customers`,
`postgres://orders/users`, `sftp://host:22`, `pinecone://my-index`.

### Wiring the client

Two patterns, both accepted:

**Functional options** — used by Stripe and Pinecone. Best when
you control the client constructor and there are multiple optional
configuration knobs:

```go
type Option func(*Client)

func WithProgressHandler(h common.ProgressHandler) Option {
    return func(c *Client) { c.progressHandler = h }
}

func NewClient(apiKey string, opts ...Option) *Client { /* ... */ }
```

**Setter method** — used by SFTP and Firecrawl. Best when the
client constructor signature is shared across multiple callers and
adding a variadic would ripple wider than a one-liner:

```go
func (c *YourClient) SetProgressHandler(h common.ProgressHandler) {
    c.progressHandler = h
}
```

Either way: the client owns the per-iteration emission, the
controller owns the closure binding `operation` + `dbInstance`, and
`common.LogOperationProgress` owns throttling + log-row formatting.

### Throttling gotchas

- **Don't pre-throttle `Page` / `Batch` / `RateLimit`.**
  `LogOperationProgress` knows the cadence. Emit every iteration;
  let the helper filter.
- **Do pre-throttle `Query` / `File`.** Millions of `rows.Next()`
  iterations would emit millions of events. Use
  [`common.ThrottledQueryEmitter`](../connectors/common/progress.go) —
  fires every N rows OR every T of wall clock, whichever first.
  First call always emits.
- **Heartbeats are free.** Even with a nil `ProgressHandler`, the
  common handler emits `ProgressKindHeartbeat` every 30s.
- **Build the emitter inside the retry loop, not outside.** The
  emitter is stateful (`lastRows`, `lastEmit`). If the inner
  function resets its row counter on each attempt (as Postgres /
  MySQL `executeInserts` does), reusing the emitter across attempts
  means attempt 2 hits the row gate with `1 - 4001 < 1000`, stays
  closed forever, and silences the deadlock-retry path you wanted
  to observe. Hoist `handler` and `resourcePath` out; build the
  emitter in:

  ```go
  handler := p.ProgressHandler(operation)
  resourcePath := resourcePathForTable(p.databaseName, tableName)
  for attempt := 1; attempt <= utils.MaxRetries; attempt++ {
      emit := common.ThrottledQueryEmitter(handler, resourcePath, 1000, 5*time.Second)
      err := executeInsertsRetryable(c, tx, records, columns, insertSQL, emit)
      // ...
  }
  ```

### SDK-managed jobs (poll loops)

When an external SDK owns the long-running loop (Firecrawl's
`Crawl` is the canonical example), wrap it at the controller layer.
Two failure modes the Firecrawl PR caught:

1. **Unbounded polling.** A loop that exits only on `"completed" ||
   "failed"` spins forever if the SDK surfaces an unfamiliar status
   (`"cancelled"`, a future API addition) — and it holds the
   operation execution lock the whole time. Fix: cap with
   `context.WithTimeout` (Firecrawl uses 30 minutes) and treat any
   unknown status as **terminal**. Defaulting unknown → terminal is
   what keeps you safe against SDK drift.

2. **Paginated status responses.** Vendor APIs often return job
   status in pages with a `Next` cursor (Firecrawl returns ~10MB at
   a time). The SDK's "wait for completion" call may not follow it
   — you'll silently receive only the first page. Walk the cursor
   yourself before returning.

[`connectors/firecrawl/client/client.go`](../connectors/firecrawl/client/client.go)
has both: a deadline-bounded poll loop using a known-active-statuses
lookup, plus `aggregateCrawlPages` for the `Next` chain.

### Reference implementations

- **[Stripe](../connectors/stripe/client/client.go)** —
  `WithProgressHandler` option, per-page + rate-limit emission in
  `ListBounded`. The original incident.
- **[Pinecone](../connectors/pinecone/client/client.go)** — page
  events from `FetchAll`, batch events from `Upsert`.
- **[Postgres](../connectors/postgres/controllers/operationPush.go)** —
  `ThrottledQueryEmitter` over `buildRecordsFromRows` (pull) and
  `executeInserts` (push). Shows the emitter-per-retry pattern.
- **[SFTP](../connectors/sftp/client/sftpClient.go)** — per-file +
  per-retry events via setter. Upload emits cumulative
  `BytesTransferred` so the percentage reads correctly.
- **[Firecrawl](../connectors/firecrawl/client/client.go)** — async
  job, bounded poll loop, `Next`-URL aggregation.

### Audit gate

Every connector must appear in
[`connectors/progress_audit_test.go`](../connectors/progress_audit_test.go)
with explicit `expectedNonNilPull` / `expectedNonNilPush` flags.
CI fails when a connector's `ProgressHandler` return value diverges
from the table (catches refactor regressions) or when a new
connector lands in `RegisterAllConnectors` without an entry. Add
yourself to the table when you wire the handler.

## OAuth-Backed Connectors

Most SaaS vendors (HubSpot, Stripe, Intercom, Linear, Sentry, ...) use
OAuth 2.0 rather than static credentials. Building an OAuth-backed
connector swaps a few steps from the guide above; the rest — operation
endpoints, schema discovery, pull/push/patch logic — is identical to
any other connector.

For the full OAuth concept background (flow diagram, static-client vs
DCR, security invariants), see `oauth-connectors.md` in this directory.

### What changes vs. a static-credential connector

| Step | Static credential connector | OAuth-backed connector |
|---|---|---|
| `ConnectionDetails` model | Fields like username/password | Empty, or only non-credential fields |
| `details` DynamicField form | Renders the password inputs | Empty — browser OAuth flow replaces it |
| `/info` response | No OAuth block | Declares `ConnectionOAuthConfig` |
| Vendor auth in handlers | Reads creds from `connection.Details` | Calls `lib.OAuthTokenClient` to fetch a fresh token |
| Operator setup | None | Register OAuth app in vendor portal + seed `connection_oauth_clients` (static-client only; DCR handles this automatically) |

### Step-by-step: adding OAuth to a connector

#### 1. Declare `ConnectionOAuthConfig` on `/info`

In your connector's Info handler, populate the optional
`ConnectionOAuthConfig` field with the vendor's OAuth metadata:

```go
// connectors/your-connector/info.go
import irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"

func getConnectorInfo() models.ConnectorDetails {
    return models.ConnectorDetails{
        Name:        "HubSpot",
        Description: "Connect to HubSpot CRM",
        // ... existing required fields ...
        ConnectionOAuthConfig: &irminmodels.ConnectionOAuthConfig{
            Provider:         "hubspot",
            AuthorizationURL: "https://app.hubspot.com/oauth/authorize",
            TokenURL:         "https://api.hubapi.com/oauth/v1/token",
            Scopes:           []string{"crm.objects.contacts.read"},
            PKCE:             true,
            // DCREndpoint: ""  // HubSpot is static-client — leave empty
            // RevocationURL, UserinfoURL, ExtraParams: optional
        },
    }
}
```

**Field semantics** (full definitions in `sdks/go/models/oauth_config.go`):

- `Provider`: short canonical identifier, e.g. `"hubspot"`. Used in
  logs and error messages.
- `AuthorizationURL`: user-agent-facing endpoint where the user
  approves the connection. Absolute `https://` URL.
- `TokenURL`: token exchange endpoint (RFC 6749 §3.2). Absolute
  `https://` URL.
- `Scopes`: least-privilege list. Adding a scope later forces users to
  re-authorize, so start small.
- `PKCE`: must be `true`. Core refuses to run a flow when false.
- `DCREndpoint`: optional RFC 7591 endpoint. Setting this makes the
  connector auto-register per workspace on first use.
- `RevocationURL` (optional, RFC 7009): Core POSTs here on disconnect.
- `UserinfoURL` (optional): reserved for future "connected as X" UI.
- `ExtraParams`: vendor-specific params like `access_type=offline`
  appended to the authorization URL. Security-critical OAuth params
  (`state`, `client_id`, etc.) cannot be overridden and are dropped.

#### 2. Leave the `details` schema empty

OAuth connectors collect credentials via the browser flow; the
`details` DynamicField form should not render password inputs. Return
an empty map from your `ConfigFields("details", ...)` handler, or drop
`details` entirely if your connector doesn't have non-credential
connection-time fields.

`settings` is unchanged — project/database/workspace selection still
belongs there.

Stamp the OAuth config onto the `/info` response so the console
knows to render a Connect button:

```go
func (cs *Controllers) Info(c fiber.Ctx) error {
    info := config.GetConnectorInfo()
    cs.InjectInfoOAuthConfig(&info) // no-op if Config is nil
    return c.JSON(info)
}
```

#### 3. Embed `*common.OAuthConnector` and use `WrapHTTPClient`

Compose `*common.OAuthConnector` into your controllers struct
alongside `*common.Controllers`:

```go
package mycontrollers

import (
    "irmin-connectors/connectors/common"
    "irmin-connectors/connectors/myconnector/config"
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

`NewOAuthConnector` reads `IRMIN_API_BASE_URL` + `IRMIN_API_TOKEN`
from the app's environment to wire the token client. Pass `nil` for
`ConnectionOAuthConfig` if the connector is static-credential (the
helpers stay safe; Info-stamping is skipped).

Then make vendor calls through `WrapHTTPClient`:

```go
import (
    "net/http"

    "irmin-connectors/connectors/common"

    "github.com/gofiber/fiber/v3"
)

func (cs *Controllers) OperationPull(c fiber.Ctx) error {
    client := common.WrapHTTPClient(http.DefaultClient, cs.OAuthConnector, c)
    req, _ := http.NewRequestWithContext(c.Context(), http.MethodGet,
        "https://api.hubapi.com/crm/v3/objects/contacts", http.NoBody)
    resp, err := client.Do(req)
    if err != nil {
        // sentinel-to-HTTP mapping (see step 4)
        return cs.WriteResolveError(c, err)
    }
    defer resp.Body.Close()
    // ... shape resp.Body into Irmin's storage format ...
}
```

What the wrapped client does for you:

- Reads `X-Irmin-Connection-Id` from the inbound Fiber request.
- Calls Core to fetch a currently-valid vendor token. Fast path is a
  single small HTTPS round-trip with no vendor I/O — Core returns
  the cached token unless it's inside the skew window.
- Stamps `Authorization: Bearer …` on the outbound request.
- On a vendor 401, calls Core with `force_refresh:true` to rotate
  the token, then retries the request **once**. After that single
  retry, a still-401 bubbles up — the user revoked Irmin at the
  vendor and needs to reconnect.

If you talk to a vendor SDK that holds its own `*http.Client`, wrap
it the same way:

```go
sdkClient := vendor.NewClient(vendor.WithHTTPClient(
    common.WrapHTTPClient(http.DefaultClient, cs.OAuthConnector, c),
))
```

You only need `ResolveAccessToken` directly when the round-tripper
can't see the call (e.g. building a WebSocket URL with the bearer
in a query param). When you do, surface its error through
`cs.WriteResolveError(c, err)` so the response stays uniform.

#### 4. Map sentinel errors to HTTP responses

`OAuthConnector.WriteResolveError` is the canonical mapping every
OAuth connector should use — the console branches on the JSON `code`
field and expects the same status codes regardless of vendor.

| Sentinel | Status | Console UX |
|---|---|---|
| `lib.ErrNotConnected` | 428 Precondition Required | Render "Connect with X" CTA |
| `lib.ErrRefreshRejected` | 428 Precondition Required | Render "Reconnect with X" CTA (vendor revoked) |
| `lib.ErrMissingConnectionHeader` | 400 Bad Request | Internal — Core failed to stamp header |
| `common.ErrOAuthNotConfigured` | 500 Internal Server Error | Wiring bug — connector embedded with `Config: nil` |
| `lib.ErrCoreUnavailable` | 502 Bad Gateway | Transient — retry with backoff |

Don't return 401 for "user must reconnect" — 401 means "the vendor
rejected the call we just made", which the console treats
differently. The 428s are the deliberate signal that the user must
reconnect.

The console drives Connect / Reconnect / Disconnect UI from Core's
`GET /workspaces/:w/connections/:c/oauth/status`, so connectors do
**not** need their own status endpoint.

#### 5. Operator setup (static-client vendors only)

For static-client vendors like HubSpot and Stripe, an admin registers
one OAuth app in the vendor's developer portal per Irmin environment:

1. Create the app in the vendor's portal.
2. Set the redirect URI to `{IRMIN_API_BASE_URL}/api/v1/oauth/callback`.
3. Request the scopes declared in `ConnectionOAuthConfig.Scopes`.
4. Copy the issued `client_id` + `client_secret`.
5. Insert a row in Core's `connection_oauth_clients` table with
   `workspace_id = NULL` (global client), pointing at the connector,
   with the encrypted `client_secret`.

For DCR-capable vendors (Intercom, Linear, Sentry, ...), the operator
setup is **empty** — Core registers a per-workspace client on first
use.

#### 6. Test against `commontest`

`connectors/common/commontest/` ships reusable httptest fixtures so
per-connector tests don't reinvent OAuth simulators:

- `commontest.NewFakeCore(t, systemToken, ...tokenSequence)` —
  stands in for Core's `/api/v1/system/oauth/access-token`. Honors
  `force_refresh:true` by advancing through the seeded sequence;
  `LazyCalls()` / `ForceCalls()` for assertions.
- `commontest.NewFakeVendor(t)` — bare `httptest.Server` whose
  handler is set per test. Records the `Authorization` header on
  every inbound request. Convenience handlers:
  - `RejectOnceThenAccept(body)` — the canonical "vendor revoked
    mid-flight" scenario; first request 401s, the rest succeed.
  - `AlwaysReject()` — terminal revocation. Asserts the round-tripper
    only retries once.

Reference patterns to copy:
- `connectors/common/oauth_base_test.go` — happy path, 401→retry,
  terminal 401, missing header, Core down.
- `connectors/common/oauth_fake_vendor_test.go` — full vendor
  connector against the base in 99 LOC.

#### 7. Everything else is the same

Schema discovery, pull/push/patch, subscribe, error recovery,
templates for the details page — all work identically whether the
connector is static-credential or OAuth-backed.

### See Also

- `concepts-and-processes.md` — the end-to-end OAuth flow and key
  invariants
- `oauth-connectors.md` — planned OAuth connectors (Stripe, Linear,
  Google Drive) + the full base architecture
- [`connectors/common/README.md`](../connectors/common/README.md) —
  full API reference for `OAuthConnector`, `WrapHTTPClient`, and
  `commontest`
