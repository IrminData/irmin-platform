package register

import (
	"fmt"
	"irmin-connectors/db"
	connectorModels "irmin-connectors/models"
	"irmin-connectors/utils"

	"github.com/IrminData/irmin-sdk-go/client"
	"github.com/IrminData/irmin-sdk-go/models"
	"github.com/IrminData/irmin-sdk-go/services"
)

const connectorName = "PostgreSQL"

// RegisterPostgresConnector registers the Postgres connector with the Irmin API.
func RegisterPostgresConnector(apiBaseURL, apiToken, baseUrl string) *models.Connector {
	// Initialise the client and service
	apiClient := client.NewClient(apiBaseURL, apiToken, "en")
	connectorService := services.NewConnectorService(apiClient)

	// Generate a random system token to be used by the Irmin API to access the connector.
	token, err := utils.GenerateToken(32)
	if err != nil {
		fmt.Printf("Error generating token: %v\n", err)
		return nil
	}

	// Structure the base URL for the connector
	connectorURL := fmt.Sprintf("%s/postgres", baseUrl)

	// Fetch matching registered connectors
	connectors, err := db.GetConnectorsByName(connectorName)
	if err != nil {
		fmt.Printf("Error fetching connectors from the database: %v\n", err)
		return nil
	}
	var connector *connectorModels.ConnectorInfo
	if len(connectors) > 0 {
		connector = &connectors[0]
	}

	if connector.ID != "" {
		// If the connector is already registered, request the update of the connector and return.
		newConnector, res, err := connectorService.UpdateRegisteredConnector(connector.ID, connectorURL, token)
		if err != nil {
			fmt.Printf("Error updating connector: %v\n", err)
			return nil
		}
		fmt.Println(res.Message)

		// Update the connector in the database
		updateConnectorInDB(&connector.ID, *newConnector, connectorURL, token)

		return newConnector
	}

	// Send a request to register the connector
	newConnector, res, err := connectorService.RegisterNewConnector(connectorURL, token)
	if err != nil {
		fmt.Printf("Error registering connector: %v\n", err)
		return nil
	}
	fmt.Println(res.Message)

	// Create a new connector in the database
	updateConnectorInDB(&newConnector.ID, *newConnector, connectorURL, token)

	return newConnector
}
