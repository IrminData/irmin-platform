package sftpconnector

import (
	sftpcontrollers "irmin-connectors/connectors/sftp/controllers"
	"irmin-connectors/models"
)

// SetupRoutes sets up the routes for the SFTP connector.
func SetupRoutes(app *models.ConnectorsApp) {
	// Create a new controller instance with the database dependency
	controller := sftpcontrollers.NewControllers(app)

	// Create a new group for the SFTP connector routes
	sftpRoutes := app.App.Group("/sftp")

	// Connector API routes (system token required)
	sftpRoutes.Get("/info", controller.Info, controller.ValidateSystemTokenMiddleware)
	sftpRoutes.Post("/configuration/:key/fields", controller.ConfigFields, controller.ValidateSystemTokenMiddleware)
	sftpRoutes.Post("/configuration/validate", controller.ConfigValidate, controller.ValidateSystemTokenMiddleware)
	sftpRoutes.Post("/operation/init", controller.OperationInit, controller.ValidateSystemTokenMiddleware)
	sftpRoutes.Post("/operation/cancel", controller.OperationCancel, controller.ValidateSystemTokenMiddleware)
	sftpRoutes.Post("/operation/status", controller.OperationStatus, controller.ValidateSystemTokenMiddleware)

	// Connector API routes (operation token required)
	sftpRoutes.Post(
		"/operation/schema/:operation",
		controller.OperationSchemaGet,
		controller.ValidateOperationTokenMiddleware,
	)
	sftpRoutes.Post("/operation/push", controller.OperationPush, controller.ValidateOperationTokenMiddleware)
	sftpRoutes.Post("/operation/pull", controller.OperationPull, controller.ValidateOperationTokenMiddleware)

	// Note: SFTP connector does not support patch or subscribe operations
	// These endpoints are intentionally omitted as SFTP doesn't support:
	// - JSON patch-based updates (files are replaced entirely)
	// - Real-time subscriptions/webhooks

	// Public information about the connector
	sftpRoutes.Get("/details", controller.DetailsPage)
}
