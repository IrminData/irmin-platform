package connectors

import (
	"fmt"
	"irmin-connectors/db"
	"irmin-connectors/lib"
	"irmin-connectors/utils"

	irminCore "github.com/IrminData/irmin-sdk-go/core-api"
	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

// registerConnector registers a new connector with the Irmin API.
func registerConnector(apiBaseURL, apiToken, baseUrl, connectorName, connectorSlug string) (*irminModels.Connector, error) {
	// Initialise the client and service
	apiClient := irminCore.NewClient(apiBaseURL, apiToken, "en")

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
		// Update the connector in the database
		err = lib.UpdateConnectorInDB(connectorRegistration.IrminID, token, connectorName)
		if err != nil {
			return nil, fmt.Errorf("error updating connector in the database: %v", err)
		}

		// If the connector is already registered, request the update of the connector and return.
		newConnector, res, err := apiClient.UpdateRegisteredConnector(connectorRegistration.IrminID, connectorURL, token)
		if err != nil {
			return nil, fmt.Errorf("error updating connector: %v", err)
		}
		fmt.Println(res.Message)

		return newConnector, nil
	}

	// Make sure the connector is registered in the database for the token validation
	//
	// Explanation: The Irmin API will call /info endpoint of the connector with the provided
	// system token to get information about it. If the connector is not registered in the database,
	// the API will not be able to validate the token and the registration will fail.
	tempRegistration, err := db.CreateConnectorRegistration(&db.ConnectorRegistration{
		IrminID:       fmt.Sprintf("temp-%s", connectorSlug),
		ConnectorName: connectorName,
		SystemToken:   token,
	})
	if err != nil {
		return nil, fmt.Errorf("error updating connector in the database: %v", err)
	}

	// Send a request to register the connector
	newConnector, res, err := apiClient.RegisterNewConnector(connectorURL, token)
	if err != nil {
		return nil, fmt.Errorf("error registering connector: %v", err)
	}
	fmt.Println(res.Message)

	// Delete the temporary registration
	err = db.DeleteConnectorRegistration(tempRegistration.ID)
	if err != nil {
		return nil, fmt.Errorf("error deleting temporary connector registration: %v", err)
	}

	// Create a new connector in the database
	err = lib.UpdateConnectorInDB(newConnector.ID, token, connectorName)
	if err != nil {
		return nil, fmt.Errorf("error updating connector in the database: %v", err)
	}

	return newConnector, nil
}
