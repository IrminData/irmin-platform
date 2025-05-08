package postgresconnector

import (
	postgrescontrollers "irmin-connectors/connectors/postgres/controllers"
	"irmin-connectors/db"

	"github.com/gorilla/mux"
)

// SetupRoutes sets up the routes for the PostgreSQL connector.
func SetupRoutes(r *mux.Router, d *db.Database) *mux.Router {
	s := r.PathPrefix("/postgres").Subrouter()

	// Create a new controller instance with the database dependency
	controller := postgrescontrollers.NewControllers(d)

	// Connector API routes
	s.HandleFunc("/info", controller.Info).Methods("GET")
	s.HandleFunc("/configuration/{key}/fields", controller.ConfigFields).Methods("POST")
	s.HandleFunc("/configuration/validate", controller.ConfigValidate).Methods("POST")
	s.HandleFunc("/operation/schema/{operation}", controller.OperationSchemaGet).Methods("POST")
	s.HandleFunc("/operation/init", controller.OperationInit).Methods("POST")
	s.HandleFunc("/operation/push", controller.OperationPush).Methods("POST")
	s.HandleFunc("/operation/patch", controller.OperationPatch).Methods("POST")
	s.HandleFunc("/operation/pull", controller.OperationPull).Methods("POST")
	s.HandleFunc("/operation/subscribe", controller.SubscribeToChanges).Methods("POST")
	s.HandleFunc("/operation/cancel", controller.OperationCancel).Methods("POST")
	s.HandleFunc("/operation/status", controller.OperationStatus).Methods("POST")

	// Public information about the connector
	s.HandleFunc("/details", controller.DetailsPage).Methods("GET")

	return r
}
