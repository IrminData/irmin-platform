package examples

import (
	"fmt"
	"irmin-sdk/client"
	"irmin-sdk/services"
)

func TestConnectors(baseURL, apiToken, locale string) {
	// Initialise the client and service
	apiClient := client.NewClient(baseURL, apiToken, locale)
	connectorService := services.NewConnectorService(apiClient)

	// Fetch all connectors
	connectors, res, err := connectorService.FetchAllConnectors()
	if err != nil {
		fmt.Println("Error fetching connectors:", err)
		return
	}
	fmt.Println(res.Message)
	fmt.Println("Connectors:", connectors)

	if len(connectors) == 0 {
		fmt.Println("No connectors found")
		return
	}

	// Fetch configuration fields for the first connector
	firstConnector := connectors[0]
	connectionDetailsFields, res, err := connectorService.FetchConnectorConfigurationFields(
		firstConnector.ID,
		"details",
		map[string]string{},
		map[string]string{},
	)
	if err != nil {
		fmt.Println("Error fetching connector configuration fields:", err)
		return
	}
	fmt.Println(res.Message)
	fmt.Println("Connection details fields:", connectionDetailsFields)

	// Fetch schema for the first connector
	connectorSchema, res, err := connectorService.FetchConnectorSchema(firstConnector.ID, "pull", map[string]string{}, map[string]string{})
	if err != nil {
		fmt.Println("Error fetching connector schema:", err)
		return
	}
	fmt.Println(res.Message)
	fmt.Println("Connector schema:", connectorSchema)
}
