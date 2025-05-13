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

	// Connector API routes
	postgresRoutes.Get("/info", controller.Info)
	postgresRoutes.Post("/configuration/:key/fields", controller.ConfigFields)
	postgresRoutes.Post("/configuration/validate", controller.ConfigValidate)
	postgresRoutes.Post("/operation/schema/:operation", controller.OperationSchemaGet)
	postgresRoutes.Post("/operation/init", controller.OperationInit)
	postgresRoutes.Post("/operation/push", controller.OperationPush)
	postgresRoutes.Post("/operation/patch", controller.OperationPatch)
	postgresRoutes.Post("/operation/pull", controller.OperationPull)
	postgresRoutes.Post("/operation/subscribe", controller.SubscribeToChanges)
	postgresRoutes.Post("/operation/cancel", controller.OperationCancel)
	postgresRoutes.Post("/operation/status", controller.OperationStatus)

	// Public information about the connector
	postgresRoutes.Get("/details", controller.DetailsPage)
}
