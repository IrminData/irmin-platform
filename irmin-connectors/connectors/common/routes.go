package common

import (
	"errors"
	"irmin-connectors/models"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// ConnectorController defines the interface that all connector controllers must implement.
type ConnectorController interface {
	// Required base controller methods
	Info(c fiber.Ctx) error
	ConfigFields(c fiber.Ctx) error
	ConfigValidate(c fiber.Ctx) error
	OperationSchemaGet(c fiber.Ctx) error
	DetailsPage(c fiber.Ctx) error

	// Middleware methods. Phase 4 added EnsureOperationMiddleware
	// (system-token + inline Operation upsert) and retired the
	// per-Connection ValidateOperationTokenMiddleware — every data
	// route now flows through EnsureOperationMiddleware, while the
	// per-job lifecycle routes (status / result / cancel) authenticate
	// with the per-job operation token via validateJobOperationToken
	// in operationJobHandlers.go.
	ValidateSystemTokenMiddleware(c fiber.Ctx) error
	EnsureOperationMiddleware(c fiber.Ctx) error

	// Capability-based methods (optional - will only be called if capability is supported)
	OperationPull(c fiber.Ctx) error
	OperationPush(c fiber.Ctx) error
	OperationPatch(c fiber.Ctx) error
	SubscribeToChanges(c fiber.Ctx) error
	UnsubscribeFromChanges(c fiber.Ctx) error

	// OperationConfigProvider methods. Embedded directly on the
	// controller because each connector's Controllers struct already
	// implements them. Phase-4 routes call EnsureOperationFromRequest
	// with the controller as the provider so Start* requests can
	// upsert the Operation row inline from the details / settings
	// carried on the request body — the same fields the legacy
	// /operation/init handshake used to ship once and then cache.
	OperationConfigProvider
}

// ConnectorRouteConfig holds the configuration for setting up connector routes.
type ConnectorRouteConfig struct {
	App           *models.ConnectorsApp
	Controller    ConnectorController
	ConnectorSlug string
	Capabilities  []irminmodels.ConnectorCapability
}

// SetupConnectorRoutes sets up all routes for a connector based on its capabilities.
func SetupConnectorRoutes(config ConnectorRouteConfig) {
	// Create a new group for the connector routes
	connectorRoutes := config.App.App.Group("/" + config.ConnectorSlug)

	// Setup base routes that all connectors must have (system token required)
	connectorRoutes.Get("/info", config.Controller.ValidateSystemTokenMiddleware, config.Controller.Info)
	connectorRoutes.Post(
		"/configuration/:key/fields",
		config.Controller.ValidateSystemTokenMiddleware,
		config.Controller.ConfigFields,
	)
	connectorRoutes.Post(
		"/configuration/validate",
		config.Controller.ValidateSystemTokenMiddleware,
		config.Controller.ConfigValidate,
	)

	// Phase-4 data routes — system token + inline Operation upsert.
	//
	// EnsureOperationMiddleware runs after ValidateSystemTokenMiddleware
	// (which stamps connectorInfo on the locals); it parses the
	// `details[<key>]=<value>` / `settings[<key>]=<value>` fields the
	// SDK now sends on every Start* request, finds-or-creates the
	// matching Operation row keyed on (Connector, ConfigHash), and
	// stamps the row on c.Locals("operation"). Handlers that read
	// c.Locals("operation") are unchanged.
	connectorRoutes.Post(
		"/operation/schema/:operation",
		config.Controller.ValidateSystemTokenMiddleware,
		config.Controller.EnsureOperationMiddleware,
		config.Controller.OperationSchemaGet,
	)

	setupCapabilityRoutes(connectorRoutes, config.Controller, config.Capabilities)

	// Mirror the per-job lifecycle routes (status / result / cancel)
	// under this connector's group so the SDK's slug-prefixed URLs
	// land on the right handlers. The same routes are also mounted
	// at the connectors-app root by RegisterJobHandlers; both share
	// one JobManager so it doesn't matter which mount the caller
	// hits — see operationJobHandlers.go for the rationale.
	MountJobHandlersOnGroup(connectorRoutes, config.App)

	// Public information about the connector (no authentication required)
	connectorRoutes.Get("/details", config.Controller.DetailsPage)
}

// setupCapabilityRoutes sets up routes based on the connector's capabilities.
//
// All data routes use the same Phase-4 chain: system token (proves the
// caller is Core), then EnsureOperationMiddleware (upserts the
// Operation row from request-body credentials so the worker has
// details / settings to operate against). The per-job lifecycle
// routes (status / result / cancel) are mounted both at the
// connectors-app root by RegisterJobHandlers and per-connector by
// MountJobHandlersOnGroup (see SetupConnectorRoutes); both mounts
// share one JobManager.
func setupCapabilityRoutes(
	routes fiber.Router,
	controller ConnectorController,
	capabilities []irminmodels.ConnectorCapability,
) {
	system := controller.ValidateSystemTokenMiddleware
	ensureOp := controller.EnsureOperationMiddleware
	for _, capability := range capabilities {
		switch capability {
		case irminmodels.ConnectorCapabilityPull:
			routes.Post("/operation/pull", system, ensureOp, controller.OperationPull)
		case irminmodels.ConnectorCapabilityPush:
			routes.Post("/operation/push", system, ensureOp, controller.OperationPush)
		case irminmodels.ConnectorCapabilityApplyPatch:
			routes.Post("/operation/patch", system, ensureOp, controller.OperationPatch)
		case irminmodels.ConnectorCapabilityPatchEvent:
			routes.Post("/operation/subscribe", system, ensureOp, controller.SubscribeToChanges)
			routes.Post("/operation/unsubscribe", system, ensureOp, controller.UnsubscribeFromChanges)
		}
	}
}

// GetConnectorCapabilitiesFromConfig is a helper function to extract capabilities from connector info.
func GetConnectorCapabilitiesFromConfig(
	getConnectorInfo func() models.ConnectorDetails,
) []irminmodels.ConnectorCapability {
	return getConnectorInfo().Capabilities
}

// ErrConnectorInfoMissing is returned by EnsureOperationMiddleware
// when the system-token middleware did not run (or did not stamp the
// connector info on locals). Indicates a route-wiring bug.
var ErrConnectorInfoMissing = errors.New("connector info not stamped on context")
