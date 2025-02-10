package connectors

import (
	"fmt"
	"irmin-connectors/db"
	"irmin-connectors/utils"

	"github.com/IrminData/irmin-sdk-go/client"
	"github.com/IrminData/irmin-sdk-go/models"
	"github.com/IrminData/irmin-sdk-go/services"
)

// registerConnector registers a new connector with the Irmin API.
func registerConnector(apiBaseURL, apiToken, baseUrl, connectorName, connectorSlug string) (*models.Connector, error) {
	// Initialise the client and service
	apiClient := client.NewClient(apiBaseURL, apiToken, "en")
	connectorService := services.NewConnectorService(apiClient)

	// Generate a random system token to be used by the Irmin API to access the connector.
	token, err := utils.GenerateToken(32)
	if err != nil {
		return nil, fmt.Errorf("error generating token: %v", err)
	}

	// Structure the base URL for the connector
	connectorURL := fmt.Sprintf("%s/%s", baseUrl, connectorSlug)

	// Fetch matching connector registrations from the database
	connectorRegistrations, err := db.GetConnectorRegistrationByConnectorName(connectorName)
	if err != nil {
		return nil, fmt.Errorf("error fetching connector registration: %v", err)
	}
	var connectorRegistration *db.ConnectorRegistration
	if len(connectorRegistrations) > 0 {
		connectorRegistration = &connectorRegistrations[0]
	}

	// Check if the connector is already registered
	if connectorRegistration != nil {
		// If the connector is already registered, request the update of the connector and return.
		newConnector, res, err := connectorService.UpdateRegisteredConnector(connectorRegistration.IrminID, connectorURL, token)
		if err != nil {
			return nil, fmt.Errorf("error updating connector: %v", err)
		}
		fmt.Println(res.Message)

		// Update the connector in the database
		err = utils.UpdateConnectorInDB(newConnector.ID, token, connectorName)
		if err != nil {
			return nil, fmt.Errorf("error updating connector in the database: %v", err)
		}

		return newConnector, nil
	}

	// Send a request to register the connector
	newConnector, res, err := connectorService.RegisterNewConnector(connectorURL, token)
	if err != nil {
		return nil, fmt.Errorf("error registering connector: %v", err)
	}
	fmt.Println(res.Message)

	// Create a new connector in the database
	err = utils.UpdateConnectorInDB(newConnector.ID, token, connectorName)
	if err != nil {
		return nil, fmt.Errorf("error updating connector in the database: %v", err)
	}

	return newConnector, nil
}
