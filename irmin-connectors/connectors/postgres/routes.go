package postgresconnector

import (
	postgrescontrollers "irmin-connectors/connectors/postgres/controllers"
	"irmin-connectors/models"
)

// SetupRoutes sets up the routes for the PostgreSQL connector.
func SetupRoutes(app *models.ConnectorsApp) {
	// Create a new controller instance with the database dependency
	controller := postgrescontrollers.NewControllers(app)

	// Create a new group for the PostgreSQL connector routes
	postgresRoutes := app.App.Group("/postgres")

	// Connector API routes (system token required)
	postgresSystemRoutes := postgresRoutes.Group("/", controller.ValidateSystemTokenMiddleware)
	postgresSystemRoutes.Get("/info", controller.Info)
	postgresSystemRoutes.Post("/configuration/:key/fields", controller.ConfigFields)
	postgresSystemRoutes.Post("/configuration/validate", controller.ConfigValidate)
	postgresSystemRoutes.Post("/operation/schema/:operation", controller.OperationSchemaGet)
	postgresSystemRoutes.Post("/operation/init", controller.OperationInit)
	postgresSystemRoutes.Post("/operation/cancel", controller.OperationCancel)
	postgresSystemRoutes.Post("/operation/status", controller.OperationStatus)

	// Connector API routes (operation token required)
	postgresOperationRoutes := postgresRoutes.Group("/", controller.ValidateOperationTokenMiddleware)
	postgresOperationRoutes.Post("/operation/push", controller.OperationPush)
	postgresOperationRoutes.Post("/operation/patch", controller.OperationPatch)
	postgresOperationRoutes.Post("/operation/pull", controller.OperationPull)
	postgresOperationRoutes.Post("/operation/subscribe", controller.SubscribeToChanges)

	// Public information about the connector
	postgresRoutes.Get("/details", controller.DetailsPage)
}
