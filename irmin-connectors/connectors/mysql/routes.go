package mysqlconnector

import (
	mysqlcontrollers "irmin-connectors/connectors/mysql/controllers"
	"irmin-connectors/models"
)

// SetupRoutes sets up the routes for the MySQL connector.
func SetupRoutes(app *models.ConnectorsApp) {
	// Create a new controller instance with the database dependency
	controller := mysqlcontrollers.NewControllers(app)

	// Create a new group for the MySQL connector routes
	mysqlRoutes := app.App.Group("/mysql")

	// Connector API routes (system token required)
	mysqlRoutes.Get("/info", controller.Info, controller.ValidateSystemTokenMiddleware)
	mysqlRoutes.Post("/configuration/:key/fields", controller.ConfigFields, controller.ValidateSystemTokenMiddleware)
	mysqlRoutes.Post("/configuration/validate", controller.ConfigValidate, controller.ValidateSystemTokenMiddleware)
	mysqlRoutes.Post("/operation/init", controller.OperationInit, controller.ValidateSystemTokenMiddleware)
	mysqlRoutes.Post("/operation/cancel", controller.OperationCancel, controller.ValidateSystemTokenMiddleware)
	mysqlRoutes.Post("/operation/status", controller.OperationStatus, controller.ValidateSystemTokenMiddleware)

	// Connector API routes (operation token required)
	mysqlRoutes.Post(
		"/operation/schema/:operation",
		controller.OperationSchemaGet,
		controller.ValidateOperationTokenMiddleware,
	)
	mysqlRoutes.Post("/operation/push", controller.OperationPush, controller.ValidateOperationTokenMiddleware)
	mysqlRoutes.Post("/operation/patch", controller.OperationPatch, controller.ValidateOperationTokenMiddleware)
	mysqlRoutes.Post("/operation/pull", controller.OperationPull, controller.ValidateOperationTokenMiddleware)
	mysqlRoutes.Post(
		"/operation/subscribe",
		controller.SubscribeToChanges,
		controller.ValidateOperationTokenMiddleware,
	)

	// Public information about the connector
	mysqlRoutes.Get("/details", controller.DetailsPage)
}
