package postgrescontrollers

import (
	"irmin-connectors/db"
	"log/slog"
)

// Controller holds the dependencies for the PostgreSQL connector controllers.
type Controller struct {
	DB     *db.Database
	Logger *slog.Logger
}

// NewControllers creates a new instance of controllers with the required dependencies.
func NewControllers(database *db.Database) *Controller {
	return &Controller{
		DB:     database,
		Logger: slog.Default(),
	}
}
