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

All connectors must implement this interface:

```go
type ConnectorController interface {
	// Base methods (always required)
	Info(c fiber.Ctx) error
	ConfigFields(c fiber.Ctx) error
	ConfigValidate(c fiber.Ctx) error
	OperationInit(c fiber.Ctx) error
	OperationCancel(c fiber.Ctx) error
	OperationStatus(c fiber.Ctx) error
	OperationSchemaGet(c fiber.Ctx) error
	DetailsPage(c fiber.Ctx) error

	// Middleware
	ValidateSystemTokenMiddleware(c fiber.Ctx) error
	ValidateOperationTokenMiddleware(c fiber.Ctx) error

	// Capability-based (optional)
	OperationPull(c fiber.Ctx) error
	OperationPush(c fiber.Ctx) error
	OperationPatch(c fiber.Ctx) error
	SubscribeToChanges(c fiber.Ctx) error
}
```

## One-Line Implementations

```go
// Info and details
func (cs *Controllers) Info(c fiber.Ctx) error {
	return common.RenderConnectorInfo(c, cs.App, config.GetConnectorInfo)
}

func (cs *Controllers) DetailsPage(c fiber.Ctx) error {
	return common.RenderConnectorDetailsPage(c, "myconnector", config.GetConnectorInfo)
}

// Token validation
func (cs *Controllers) ValidateSystemTokenMiddleware(c fiber.Ctx) error {
	return common.ValidateSystemToken(c, cs.App, config.GetConnectorInfo)
}

// Operations
func (cs *Controllers) OperationCancel(c fiber.Ctx) error {
	return common.CancelOperation(c, cs.App, common.DefaultDatabaseCancellation)
}

func (cs *Controllers) OperationStatus(c fiber.Ctx) error {
	return common.HandleOperationStatus(c, config.GetConnectorInfo, cs.App)
}
```

## Provider Pattern for Complex Operations

```go
// Pull operations
func (cs *Controllers) OperationPull(c fiber.Ctx) error {
	provider := &MySQLPullProvider{}
	return common.HandleOperationPull(c, provider, cs.Logger)
}

// Push operations  
func (cs *Controllers) OperationPush(c fiber.Ctx) error {
	provider := &MySQLPushProvider{}
	return common.HandleOperationPush(c, provider, cs.Logger)
}

// Patch operations
func (cs *Controllers) OperationPatch(c fiber.Ctx) error {
	provider := &MySQLPatchProvider{}
	return common.HandleOperationPatch(c, provider, cs.Logger)
}

// Schema operations
func (cs *Controllers) OperationSchemaGet(c fiber.Ctx) error {
	provider := &MySQLSchemaProvider{}
	return common.HandleOperationSchemaGet(c, provider, cs.Logger)
}
```

## Provider Interfaces

**Pull Operations:**
```go
type PullOperationProvider interface {
	InitializeClient(c fiber.Ctx, logger *slog.Logger, operation *db.Operation) (client any, databaseName *string, cleanup func(), err error)
	GetAllFiles(c fiber.Ctx, client any) ([]string, [][]byte, error)
	GetFileByPath(c fiber.Ctx, client any, path string) (string, []byte, error)
}
```

**Push Operations:**
```go
type PushOperationProvider interface {
	InitializeClient(c fiber.Ctx, logger *slog.Logger, operation *db.Operation) (client any, databaseName *string, cleanup func(), err error)
	ProcessFiles(c fiber.Ctx, client any, files map[string][]byte, targetPath string) error
}
```

**Patch Operations:**
```go
type PatchOperationProvider interface {
	InitializeClient(c fiber.Ctx, logger *slog.Logger, operation *db.Operation) (client any, cleanup func(), err error)
	ExecutePatchOperation(c fiber.Ctx, client any, op irminmodels.PatchOperation, tableName, rowIdentifier, columnName string) error
}
```

**Schema Operations:**
```go
type SchemaOperationProvider interface {
	InitializeClient(c fiber.Ctx, logger *slog.Logger, operation *db.Operation) (client any, databaseName *string, cleanup func(), err error)
	GetSchema(c fiber.Ctx, client any, operationType string, databaseName *string) (*irminmodels.ObjectSchema, error)
	GetSupportedOperationTypes() []string
}
```

For schema providers, implement `GetSupportedOperationTypes()` using:
```go
func (p *MySQLSchemaProvider) GetSupportedOperationTypes() []string {
	return common.CapabilitiesToOperationTypes(config.GetConnectorInfo().Capabilities)
}
```

## Unsupported Operations

```go
func (cs *Controllers) OperationPatch(c fiber.Ctx) error {
	return common.HandleNotSupportedPatch(c)
}
```

## Automatic Route Registration

Routes are created automatically based on connector capabilities:

**Base routes (always registered):**
- `GET /info`, `POST /configuration/*`, `POST /operation/{init,cancel,status,schema}`, `GET /details`

**Capability-based routes:**
- `POST /operation/pull` (ConnectorCapabilityPull)
- `POST /operation/push` (ConnectorCapabilityPush)  
- `POST /operation/patch` (ConnectorCapabilityApplyPatch)
- `POST /operation/subscribe` (ConnectorCapabilityPatchEvent)

See existing connectors (MySQL, PostgreSQL, SFTP) for implementation examples.