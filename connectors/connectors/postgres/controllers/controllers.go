package postgrescontrollers

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/models"
)

// Controllers holds the dependencies for the PostgreSQL connector controllers.
type Controllers struct {
	*common.Controllers
}

// NewControllers creates a new instance of controllers with the required dependencies.
func NewControllers(app *models.ConnectorsApp) *Controllers {
	return &Controllers{
		Controllers: common.NewControllers(app),
	}
}
