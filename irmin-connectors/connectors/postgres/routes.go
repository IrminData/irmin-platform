package postgresConnector

import (
	postgresControllers "irmin-connectors/connectors/postgres/controllers"

	"github.com/gorilla/mux"
)

// SetupRoutes sets up the routes for the PostgreSQL connector
func SetupRoutes(r *mux.Router) *mux.Router {
	s := r.PathPrefix("/postgres").Subrouter()

	s.HandleFunc("/info", postgresControllers.Info).Methods("GET")
	s.HandleFunc("/configuration/{key}/fields", postgresControllers.ConfigFields).Methods("POST")
	s.HandleFunc("/configuration/validate", postgresControllers.ConfigValidate).Methods("POST")
	s.HandleFunc("/schema/{operation}", postgresControllers.SchemaGet).Methods("POST")
	s.HandleFunc("/operation/init", postgresControllers.OperationInit).Methods("POST")
	s.HandleFunc("/operation/push", postgresControllers.OperationPush).Methods("POST")
	s.HandleFunc("/operation/patch", postgresControllers.OperationPatch).Methods("POST")
	s.HandleFunc("/operation/pull", postgresControllers.OperationPull).Methods("POST")
	s.HandleFunc("/operation/subscribe", postgresControllers.SubscribeToChanges).Methods("POST")
	s.HandleFunc("/operation/cancel", postgresControllers.OperationCancel).Methods("POST")

	return r
}
