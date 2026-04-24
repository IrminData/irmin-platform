# Common Connector Functions

Shared functionality for Irmin connectors providing automatic route setup, configuration validation, operation handling, and standardized responses.

## Quick Setup

```go
func SetupRoutes(app *models.ConnectorsApp) {
	controller := mycontrollers.NewControllers(app)
	common.SetupConnectorRoutes(common.ConnectorRouteConfig{
		App:           app,
		Controller:    controller,
		ConnectorSlug: "myconnector",
		Capabilities:  common.GetConnectorCapabilitiesFromConfig(config.GetConnectorInfo),
	})
}
```

## ConnectorController Interface

All connectors must implement this interface (defined in
`connectors/common/routes.go`):

```go
type ConnectorController interface {
	// Base methods (always required)
	Info(c fiber.Ctx) error
	ConfigFields(c fiber.Ctx) error
	ConfigValidate(c fiber.Ctx) error
	OperationInit(c fiber.Ctx) error
	OperationSchemaGet(c fiber.Ctx) error
	DetailsPage(c fiber.Ctx) error

	// Middleware
	ValidateSystemTokenMiddleware(c fiber.Ctx) error
	ValidateOperationTokenMiddleware(c fiber.Ctx) error

	// Capability-based (only called when the capability is declared)
	OperationPull(c fiber.Ctx) error
	OperationPush(c fiber.Ctx) error
	OperationPatch(c fiber.Ctx) error
	SubscribeToChanges(c fiber.Ctx) error
	UnsubscribeFromChanges(c fiber.Ctx) error
}
```

Status and cancel are not per-connector: the async-job protocol
serves them at the top level via `GET /operation/status/:job_id`,
`GET /operation/result/:job_id`, and `POST /operation/cancel/:job_id`.
Those routes are mounted once in `RegisterJobHandlers`, require
`Authorization: Bearer <operation-token>` matching the operation tied
to the job, and are therefore still opaque to connector route code.

The recommended composition is to embed `*common.Controllers` (and
`*common.OAuthConnector` for OAuth-backed connectors) into your own
`Controllers` struct. The embed gives you all the `cs.HandleXxx`
methods used in the examples below.

```go
type Controllers struct {
	*common.Controllers
	// *common.OAuthConnector  // for OAuth-backed connectors
}

func NewControllers(app *models.ConnectorsApp) *Controllers {
	return &Controllers{
		Controllers: common.NewControllers(app),
	}
}
```

## One-line implementations (info, details, middleware)

These wrap directly to package-level helpers:

```go
// Info — common.RenderConnectorInfo prefixes URLs with cs.App.Env.URL
// and returns the JSON.
func (cs *Controllers) Info(c fiber.Ctx) error {
	return common.RenderConnectorInfo(c, cs.App, config.GetConnectorInfo)
}

// DetailsPage — RenderConnectorDetailsPage takes the app, the slug,
// the info getter, and an optional event-listening description.
func (cs *Controllers) DetailsPage(c fiber.Ctx) error {
	return common.RenderConnectorDetailsPage(c, cs.App, "myconnector", config.GetConnectorInfo)
}

// Token middlewares — wired into routes by SetupConnectorRoutes; you
// just need the thin adapters below so the ConnectorController
// interface is satisfied.
func (cs *Controllers) ValidateSystemTokenMiddleware(c fiber.Ctx) error {
	return common.ValidateSystemToken(c, cs.App, config.GetConnectorInfo)
}

func (cs *Controllers) ValidateOperationTokenMiddleware(c fiber.Ctx) error {
	return common.ValidateOperationToken(c, cs.App, config.GetConnectorInfo)
}
```

## Provider pattern for init / config / pull / push / patch / schema

Operations that need connector-specific behavior expose a provider
interface. The connector implements the provider, then calls the
matching `Handle*` helper. `OperationInit`, `ConfigFields`, and
`ConfigValidate` are methods on `*common.Controllers` — call them
through the embed (`cs.HandleXxx`). The data operation handlers
(`HandleOperationPull/Push/Patch/SchemaGet`) are package-level
functions that take `cs.Logger` and `cs.DB`.

```go
// OperationInit — pass the controller itself as the provider when it
// implements the OperationInitProvider methods (most connectors do).
func (cs *Controllers) OperationInit(c fiber.Ctx) error {
	return cs.HandleOperationInit(c, cs)
}

// ConfigFields — same pattern; cs implements ConfigFieldProvider.
func (cs *Controllers) ConfigFields(c fiber.Ctx) error {
	return cs.HandleConfigFields(c, cs)
}

// ConfigValidate — same pattern; cs implements ConfigValidationProvider.
func (cs *Controllers) ConfigValidate(c fiber.Ctx) error {
	return cs.HandleConfigValidation(c, cs)
}

// Pull — package-level; threads cs.Logger, cs.DB, and cs.App.
// cs.App carries the shared *JobManager the handler needs for
// lock acquisition and async-job bookkeeping.
func (cs *Controllers) OperationPull(c fiber.Ctx) error {
	return common.HandleOperationPull(c, &MySQLPullProvider{}, cs.Logger, cs.DB, cs.App)
}

// Push, Patch, SchemaGet follow the same shape. Every handler
// routes its advisory-lock acquisition through JobManager.Begin
// so that 409 responses carry the blocking job_id uniformly.
func (cs *Controllers) OperationPush(c fiber.Ctx) error {
	return common.HandleOperationPush(c, &MySQLPushProvider{}, cs.Logger, cs.DB, cs.App)
}

func (cs *Controllers) OperationPatch(c fiber.Ctx) error {
	return common.HandleOperationPatch(c, &MySQLPatchProvider{}, cs.Logger, cs.DB, cs.App)
}

func (cs *Controllers) OperationSchemaGet(c fiber.Ctx) error {
	return common.HandleOperationSchemaGet(c, &MySQLSchemaProvider{}, cs.Logger, cs.DB, cs.App)
}

// Subscribe — connector-specific; see existing connectors.
// Unsubscribe — package-level helper.
func (cs *Controllers) UnsubscribeFromChanges(c fiber.Ctx) error {
	return cs.HandleUnsubscribeFromChanges(c, &MyUnsubscribeProvider{})
}
```

## Provider interfaces

**OperationInit:**
```go
type OperationInitProvider interface {
	GetOperationFormFields() (required []string, optional []string)
	BuildDetails(fields map[string]string) (map[string]string, error)
	BuildSettings(fields map[string]string) (map[string]string, error)
}
```

**ConfigFields:**
```go
type ConfigFieldProvider interface {
	GetDynamicFields(ctx fiber.Ctx, key string, fields map[string]string) (map[string]irminmodels.DynamicField, error)
}
```

**ConfigValidation:**
```go
type ConfigValidationProvider interface {
	GetRequiredFormFields() (required []string, optional []string)
	ValidateFields(ctx fiber.Ctx, details map[string]any, settings map[string]any) []string
	TestConnection(
		ctx fiber.Ctx,
		details map[string]any,
		settings map[string]any,
	) (canConnect, detailsValid, settingsValid bool, errors []string)
}
```

**Pull:**
```go
type PullOperationProvider interface {
	InitializeClient(
		c fiber.Ctx, logger *slog.Logger, operation *db.Operation,
	) (client any, databaseName *string, cleanup func(), err error)
	GetAllFiles(c fiber.Ctx, client any) (filePaths []string, fileContents [][]byte, err error)
	GetFileByPath(c fiber.Ctx, client any, path string) (filePath string, fileContent []byte, err error)
}
```

**Push:**
```go
type PushOperationProvider interface {
	InitializeClient(
		c fiber.Ctx, logger *slog.Logger, operation *db.Operation,
	) (client any, databaseName *string, cleanup func(), err error)
	ProcessFiles(c fiber.Ctx, client any, files map[string][]byte, targetPath string) error
}
```

**Patch:**
```go
type PatchOperationProvider interface {
	InitializeClient(
		c fiber.Ctx, logger *slog.Logger, operation *db.Operation,
	) (client any, cleanup func(), err error)
	ExecutePatchOperation(
		c fiber.Ctx, client any, op irminmodels.PatchOperation,
		tableName, rowIdentifier, columnName string,
	) error
}
```

**Schema:**
```go
type SchemaOperationProvider interface {
	InitializeClient(
		c fiber.Ctx, logger *slog.Logger, operation *db.Operation,
	) (client any, path *string, cleanup func(), err error)
	GetSchema(
		c fiber.Ctx, client any, operationType string, path *string,
	) (*irminmodels.ObjectSchema, error)
	GetSupportedOperationTypes() []string
}
```

**Unsubscribe:**
```go
type UnsubscribeProvider interface {
	StopListener(subscriptionID uint) error
}
```

For schema providers, derive the supported types from the declared
capabilities:

```go
func (p *MySQLSchemaProvider) GetSupportedOperationTypes() []string {
	return common.CapabilitiesToOperationTypes(config.GetConnectorInfo().Capabilities)
}
```

If your connector listens for vendor changes through the central
`ListenerManager`, the package ships a ready-made unsubscribe
provider:

```go
func (cs *Controllers) UnsubscribeFromChanges(c fiber.Ctx) error {
	return cs.HandleUnsubscribeFromChanges(c,
		&common.ListenerManagerUnsubscribeProvider{Manager: cs.App.ListenerManager})
}
```

## Helpers for config + form handling

The package exposes helpers concrete connectors reuse to keep
config-field code small:

- `BuildDetailsFromFields(fields, definitions)` /
  `BuildSettingsFromFields(fields, definitions)` — turn flat
  multipart form input (`details[host]`, `settings[database]`, …)
  into the `map[string]string` shape Core expects.
- `GetRequiredDetailsFieldNames(defs)`,
  `GetOptionalDetailsFieldNames(defs)`,
  `GetRequiredSettingsFieldNames(defs)`,
  `GetOptionalSettingsFieldNames(defs)`,
  `GetRequiredFieldNames(detailsDefs, settingsDefs)`,
  `GetOptionalFieldNames(detailsDefs, settingsDefs)` — reflection
  over a `map[string]irminmodels.DynamicField` to derive which
  fields are required/optional. Use these from
  `OperationInitProvider.GetOperationFormFields` and
  `ConfigValidationProvider.GetRequiredFormFields`.
- `CreateSelectOptions(values []string)` /
  `CreateSelectOptionsWithLabels(map[string]string)` — build
  `[]irminmodels.SelectOption` for dropdown fields populated at
  runtime (e.g. fetching a list of databases to choose from).
- `CapabilitiesToOperationTypes(caps)` — maps
  `[]irminmodels.ConnectorCapability` to the string operation-type
  identifiers (`"pull"`, `"push"`, `"patch"`, `"subscribe"`).
- `ConvertFormFieldsToMaps(fields)` — splits a flat
  `details[*]` / `settings[*]` form into the two `map[string]any`
  blobs `ConfigValidationProvider.TestConnection` receives.
- `LogOperationEvent(db, logger, operationID, eventType, message, data)` —
  appends a structured row to the operation's log so the console
  can show progress / errors. Use this from any provider that
  wants finer-grained progress reporting than the implicit
  start/finish bookends.

## Progress and observability

Long-running operations need per-iteration log emission or they
look like silent hangs. Shared types in
[`progress.go`](./progress.go); every `PullOperationProvider` and
`PushOperationProvider` must declare intent via:

```go
ProgressHandler(operation *db.Operation) ProgressHandler
```

Return nil only if the operation can't exceed ~10 seconds — the
common pull/push handler emits a 30s heartbeat regardless, so even
nil-handler connectors aren't fully silent.

### `ProgressEvent` and `ProgressKind*`

```go
type ProgressEvent struct {
    Kind         string  // ProgressKindPage | RateLimit | Batch | Query | File | Heartbeat
    ResourcePath string  // human-readable identifier (URL, table, file path...)

    // ProgressKindPage
    Page         int
    RecordsSoFar int
    Cursor       string

    // ProgressKindRateLimit
    Attempt int
    Wait    time.Duration

    // ProgressKindBatch
    Batch     int
    BatchSize int

    // ProgressKindQuery
    Rows int64

    // ProgressKindFile
    File             string
    BytesTransferred int64
    BytesTotal       int64
}
```

`Kind` discriminates which subset of fields applies. Always set
`ResourcePath` so operators can tell which target (Pinecone index,
SFTP host, Postgres table, ...) a stuck operation belongs to.

### `LogOperationProgress`

The connector-facing emission helper. Handles per-kind throttling
and delegates to `LogOperationEvent`. Nil-safe on `dbInstance` /
`logger` so handlers built before `InitializeClient` finishes
hydrating won't panic when invoked.

```go
common.LogOperationProgress(dbInstance, logger, operation.ID, common.ProgressEvent{
    Kind:         common.ProgressKindPage,
    ResourcePath: "/v1/customers",
    Page:         5,
    RecordsSoFar: 500,
    Cursor:       "cus_abc",
})
```

Throttling rules baked in:

- **Page**: emits page 1 + every 5th page
- **Batch**: emits batch 1 + every 10th batch
- **RateLimit / File / Heartbeat**: always emits (unthrottled)
- **Query**: always emits — caller must pre-throttle (use
  `ThrottledQueryEmitter`)

### `ThrottledQueryEmitter`

Pre-throttle helper for high-cardinality kinds (SQL `rows.Next()`,
byte-level file streams). Returns a closure that fires at most
every N rows OR every T of wall clock, whichever first. First call
always emits.

```go
emit := common.ThrottledQueryEmitter(
    p.ProgressHandler(operation),
    "postgres://" + dbName + "/" + tableName,
    1000,           // minRows
    5*time.Second,  // minInterval
)

for rows.Next() {
    // ...scan...
    rowsScanned++
    emit(rowsScanned)
}
```

Returns a no-op closure when handler is nil — callers don't need a
guard.

**Stateful**: `lastRows` and `lastEmit` persist between calls. In
retry loops where the inner function resets its row counter (as
Postgres / MySQL `executeInserts` does), build the emitter inside
the loop, not outside — otherwise stale state keeps the row gate
closed on attempt 2 and silences the deadlock-retry path. Hoist
`ProgressHandler` and `ResourcePath` out; build the emitter in. See
[guides/how-to-create-connectors.md → Throttling gotchas](../../guides/how-to-create-connectors.md#throttling-gotchas)
for a worked example.

### `NewProgressHandler` and the `ProgressHandler` mandate

Every provider must implement
`ProgressHandler(operation *db.Operation) common.ProgressHandler`
— the interface enforces it at compile time. Return nil only if the
operation can't exceed ~10 seconds; otherwise return a real handler.

`common.NewProgressHandler` is the standard implementation every
Phase 3 connector uses:

```go
func (p *YourProvider) ProgressHandler(operation *db.Operation) common.ProgressHandler {
    return common.NewProgressHandler(p.dbInstance, p.logger, operation)
}
```

Wire it from `InitializeClient` after hydrating `p.logger`. Choose
between functional options (`WithProgressHandler` — Stripe,
Pinecone) and a setter (`SetProgressHandler` — SFTP, Firecrawl) per
connector; both are accepted.

For worked examples per emission shape see
[**guides/how-to-create-connectors.md → Observability**](../../guides/how-to-create-connectors.md#observability--progress-events).

## Unsupported operations

If a connector doesn't implement a capability, return the matching
`HandleNotSupported*` so callers get a uniform 405 response:

```go
func (cs *Controllers) OperationPatch(c fiber.Ctx) error {
	return common.HandleNotSupportedPatch(c)
}
```

There are matching `HandleNotSupportedPull`, `HandleNotSupportedPush`,
and `HandleNotSupportedSchemaGet` for the other capabilities.

## Automatic Route Registration

Routes are created automatically based on connector capabilities:

**Base routes (always registered):**
- `GET /info`, `POST /configuration/*`, `POST /operation/init`, `POST /operation/schema/:operation`, `GET /details`

**Top-level async-job routes (mounted once, not per connector):**
- `GET /operation/status/:job_id`, `GET /operation/result/:job_id`, `POST /operation/cancel/:job_id`

**Capability-based routes:**
- `POST /operation/pull` (ConnectorCapabilityPull)
- `POST /operation/push` (ConnectorCapabilityPush)  
- `POST /operation/patch` (ConnectorCapabilityApplyPatch)
- `POST /operation/subscribe` (ConnectorCapabilityPatchEvent)

See existing connectors (MySQL, PostgreSQL, SFTP) for implementation examples.

## OAuth Connectors

The package includes an embeddable OAuth base for connectors that
authenticate via OAuth 2.0 + PKCE rather than static credentials.
Static-credential connectors can also embed it (with `Config: nil`)
to keep the controller shape uniform — the helpers no-op cleanly.

For the conceptual background — why per-call token fetch, static
client vs DCR, the wire flow — see
[`guides/oauth-connectors.md`](../../guides/oauth-connectors.md).
This section is the API reference.

### `OAuthConnector` (oauth_base.go)

Embeddable struct that holds the per-process `lib.OAuthTokenClient`
and the connector's declared `ConnectionOAuthConfig`.

```go
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
from the app's environment to wire the underlying token client. Pass
`nil` for `Config` if your connector is static-credential — the
helpers stay safe and Info-stamping is skipped.

**Methods:**

- `ResolveAccessToken(c fiber.Ctx) (*lib.VendorAccessToken, error)` —
  reads `X-Irmin-Connection-Id` and asks Core for a fresh vendor
  access token. Returns `lib.ErrMissingConnectionHeader` if the
  header is absent, `lib.ErrNotConnected` / `lib.ErrRefreshRejected`
  if the user needs to reconnect, `lib.ErrCoreUnavailable` if Core
  is down, or `ErrOAuthNotConfigured` if the embed has `Config: nil`.
- `ForceRefreshAccessToken(c fiber.Ctx) (*lib.VendorAccessToken, error)` —
  same but asks Core to rotate unconditionally. Used internally by
  the round-tripper retry; rarely called directly.
- `WriteResolveError(c fiber.Ctx, err error) error` — sentinel→HTTP
  mapping every OAuth connector should use. See the table below.
- `ResolveOrWriteError(c fiber.Ctx) (*lib.VendorAccessToken, bool)` —
  one-shot: returns `(token, true)` on success or writes the error
  response and returns `(nil, false)`. Lets handlers stay flat.
- `InjectInfoOAuthConfig(*models.ConnectorDetails)` — stamps the
  declared OAuth config onto the `/info` response so the console
  knows to render a Connect button. No-op when `Config` is nil.

### `WrapHTTPClient` and `OAuthRoundTripper` (oauth_client.go)

The recommended way to talk to a vendor API. `WrapHTTPClient` returns
a new `*http.Client` whose `Transport` is an `OAuthRoundTripper`
around the input client's transport. Preserves the input client's
`Timeout`, `CheckRedirect`, `Jar`.

```go
func (cs *Controllers) OperationPull(c fiber.Ctx) error {
    client := common.WrapHTTPClient(http.DefaultClient, cs.OAuthConnector, c)
    req, _ := http.NewRequestWithContext(c.Context(), http.MethodGet,
        "https://api.vendor.example/v1/items", http.NoBody)
    resp, err := client.Do(req)
    if err != nil {
        return cs.WriteResolveError(c, err)
    }
    defer resp.Body.Close()
    // ... shape resp.Body into Irmin's storage format ...
}
```

The transport:
1. Calls `OAuthConnector.ResolveAccessToken(c)` and stamps
   `Authorization: Bearer …` on the request.
2. On a vendor 401, calls `ForceRefreshAccessToken(c)`, re-stamps,
   and retries **once**. After a single retry, a still-401 bubbles
   up — the user revoked Irmin at the vendor and needs to reconnect.
3. Buffers the request body once at entry so the retry can replay
   it. Honors `req.GetBody` if you set it (preferred for streaming
   bodies that shouldn't be buffered in memory).

If you talk to a vendor SDK that holds its own `*http.Client`, wrap
it the same way:

```go
sdkClient := vendor.NewClient(vendor.WithHTTPClient(
    common.WrapHTTPClient(http.DefaultClient, cs.OAuthConnector, c),
))
```

### Sentinel-to-HTTP mapping

Both `WriteResolveError` and the round-tripper use the same mapping:

| Sentinel | Status | JSON `code` |
|---|---|---|
| `lib.ErrNotConnected` | 428 Precondition Required | `oauth_not_connected` |
| `lib.ErrRefreshRejected` | 428 Precondition Required | `oauth_refresh_rejected` |
| `lib.ErrMissingConnectionHeader` | 400 Bad Request | `oauth_missing_connection_header` |
| `common.ErrOAuthNotConfigured` | 500 Internal Server Error | `oauth_not_configured` |
| `lib.ErrCoreUnavailable` | 502 Bad Gateway | `oauth_core_unavailable` |
| anything else | 500 Internal Server Error | `oauth_error` |

The console branches on `code`. The 428s are the signal that the
user must reconnect — do not return 401 for these (401 means "the
vendor rejected the call we just made", a different UX).

### Testing — `commontest` subpackage

`connectors/common/commontest/` ships reusable httptest fixtures so
per-connector tests don't reinvent OAuth simulators.

- **`NewFakeCore(t, systemToken, ...tokenSequence)`** — stands in
  for Core's `/api/v1/system/oauth/access-token`. Honors
  `force_refresh:true` by advancing through the seeded token
  sequence; tracks `LazyCalls()` and `ForceCalls()` for assertions.
- **`NewFakeVendor(t)`** — bare `httptest.Server` whose handler is
  set per-test. Records the `Authorization` header on every inbound
  request. Helper handlers:
  - `RejectOnceThenAccept(body)` — the canonical "vendor revoked
    mid-flight" scenario. First request returns 401; subsequent
    requests return 200 with `body`.
  - `AlwaysReject()` — terminal revocation. Useful for asserting the
    base only retries once.

Reference tests:
- `connectors/common/oauth_base_test.go` — drives every scenario
  through a real `fiber.App`. Copy the patterns wholesale.
- `connectors/common/oauth_fake_vendor_test.go` — a complete fake
  connector against the base in 99 LOC. Use it as the upper bound
  on how much glue a new vendor connector should need.