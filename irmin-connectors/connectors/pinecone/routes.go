package pineconeconnector

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/pinecone/config"
	pineconecontrollers "irmin-connectors/connectors/pinecone/controllers"
	"irmin-connectors/models"
)

// SetupRoutes sets up the routes for the Pinecone connector.
func SetupRoutes(app *models.ConnectorsApp) {
	// Create a new controller instance with the database dependency
	controller := pineconecontrollers.NewControllers(app)

	// Setup routes using the common function based on connector capabilities
	common.SetupConnectorRoutes(common.ConnectorRouteConfig{
		App:           app,
		Controller:    controller,
		ConnectorSlug: "pinecone",
		Capabilities:  common.GetConnectorCapabilitiesFromConfig(config.GetConnectorInfo),
	})
}
