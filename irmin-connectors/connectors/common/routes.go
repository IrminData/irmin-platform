package common

import (
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
	OperationInit(c fiber.Ctx) error
	OperationCancel(c fiber.Ctx) error
	OperationStatus(c fiber.Ctx) error
	OperationSchemaGet(c fiber.Ctx) error
	DetailsPage(c fiber.Ctx) error

	// Middleware methods
	ValidateSystemTokenMiddleware(c fiber.Ctx) error
	ValidateOperationTokenMiddleware(c fiber.Ctx) error

	// Capability-based methods (optional - will only be called if capability is supported)
	OperationPull(c fiber.Ctx) error
	OperationPush(c fiber.Ctx) error
	OperationPatch(c fiber.Ctx) error
	SubscribeToChanges(c fiber.Ctx) error
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
	connectorRoutes.Post(
		"/operation/init",
		config.Controller.ValidateSystemTokenMiddleware,
		config.Controller.OperationInit,
	)
	connectorRoutes.Post(
		"/operation/cancel",
		config.Controller.ValidateSystemTokenMiddleware,
		config.Controller.OperationCancel,
	)
	connectorRoutes.Post(
		"/operation/status",
		config.Controller.ValidateSystemTokenMiddleware,
		config.Controller.OperationStatus,
	)

	// Setup operation routes that require operation token
	connectorRoutes.Post(
		"/operation/schema/:operation",
		config.Controller.ValidateOperationTokenMiddleware,
		config.Controller.OperationSchemaGet,
	)

	// Setup capability-based routes (operation token required)
	setupCapabilityRoutes(connectorRoutes, config.Controller, config.Capabilities)

	// Public information about the connector (no authentication required)
	connectorRoutes.Get("/details", config.Controller.DetailsPage)
}

// setupCapabilityRoutes sets up routes based on the connector's capabilities.
func setupCapabilityRoutes(
	routes fiber.Router,
	controller ConnectorController,
	capabilities []irminmodels.ConnectorCapability,
) {
	for _, capability := range capabilities {
		switch capability {
		case irminmodels.ConnectorCapabilityPull:
			routes.Post("/operation/pull", controller.ValidateOperationTokenMiddleware, controller.OperationPull)

		case irminmodels.ConnectorCapabilityPush:
			routes.Post("/operation/push", controller.ValidateOperationTokenMiddleware, controller.OperationPush)

		case irminmodels.ConnectorCapabilityApplyPatch:
			routes.Post("/operation/patch", controller.ValidateOperationTokenMiddleware, controller.OperationPatch)

		case irminmodels.ConnectorCapabilityPatchEvent:
			routes.Post(
				"/operation/subscribe",
				controller.ValidateOperationTokenMiddleware,
				controller.SubscribeToChanges,
			)
		}
	}
}

// GetConnectorCapabilitiesFromConfig is a helper function to extract capabilities from connector info.
func GetConnectorCapabilitiesFromConfig(
	getConnectorInfo func() models.ConnectorDetails,
) []irminmodels.ConnectorCapability {
	return getConnectorInfo().Capabilities
}
