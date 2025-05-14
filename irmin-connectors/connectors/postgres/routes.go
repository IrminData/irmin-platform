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
	postgresRoutes.Get("/info", controller.Info, controller.ValidateSystemTokenMiddleware)
	postgresRoutes.Post("/configuration/:key/fields", controller.ConfigFields, controller.ValidateSystemTokenMiddleware)
	postgresRoutes.Post("/configuration/validate", controller.ConfigValidate, controller.ValidateSystemTokenMiddleware)
	postgresRoutes.Post("/operation/init", controller.OperationInit, controller.ValidateSystemTokenMiddleware)
	postgresRoutes.Post("/operation/cancel", controller.OperationCancel, controller.ValidateSystemTokenMiddleware)
	postgresRoutes.Post("/operation/status", controller.OperationStatus, controller.ValidateSystemTokenMiddleware)

	// Connector API routes (operation token required)
	postgresRoutes.Post(
		"/operation/schema/:operation",
		controller.OperationSchemaGet,
		controller.ValidateOperationTokenMiddleware,
	)
	postgresRoutes.Post("/operation/push", controller.OperationPush, controller.ValidateOperationTokenMiddleware)
	postgresRoutes.Post("/operation/patch", controller.OperationPatch, controller.ValidateOperationTokenMiddleware)
	postgresRoutes.Post("/operation/pull", controller.OperationPull, controller.ValidateOperationTokenMiddleware)
	postgresRoutes.Post(
		"/operation/subscribe",
		controller.SubscribeToChanges,
		controller.ValidateOperationTokenMiddleware,
	)

	// Public information about the connector
	postgresRoutes.Get("/details", controller.DetailsPage)
}
