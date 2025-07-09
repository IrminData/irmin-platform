package mysqlcontrollers

import (
	"irmin-connectors/db"
	"irmin-connectors/models"
	"log/slog"
)

// Controllers holds the dependencies for the MySQL connector controllers.
type Controllers struct {
	App    *models.ConnectorsApp
	DB     *db.Database
	Logger *slog.Logger
}

// NewControllers creates a new instance of controllers with the required dependencies.
func NewControllers(app *models.ConnectorsApp) *Controllers {
	return &Controllers{
		App:    app,
		DB:     app.DB,
		Logger: app.Logger,
	}
}
