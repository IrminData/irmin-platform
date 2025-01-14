package examples

import (
	"fmt"

	"github.com/IrminData/irmin-sdk-go/client"
	"github.com/IrminData/irmin-sdk-go/services"
)

func CreateTestConnection(baseURL, apiToken, locale string) *string {
	// Initialise the client and service
	apiClient := client.NewClient(baseURL, apiToken, locale)
	connectionService := services.NewConnectionService(apiClient)

	// Create a new connection
	connection, res, err := connectionService.CreateConnection("connector-f817ec7768badf505a3bac3d4c3079fd", map[string]string{
		"host":     "127.0.0.1",
		"password": "secret",
	}, map[string]string{
		"username": "admin",
	}, "Test connection", "Example connection for testing")
	if err != nil {
		fmt.Println("Error creating connection:", err)
		return nil
	}
	fmt.Println(res.Message)
	return &connection.ID
}

func DeleteTestConnection(connectionID, baseURL, apiToken, locale string) {
	// Initialise the client and service
	apiClient := client.NewClient(baseURL, apiToken, locale)
	connectionService := services.NewConnectionService(apiClient)

	// Delete the connection
	res, err := connectionService.DeleteConnection(connectionID)
	if err != nil {
		fmt.Println("Error deleting connection:", err)
		return
	}
	fmt.Println(res.Message)
}

func TestConnections(exampleConnectionID, baseURL, apiToken, locale string) {
	// Initialise the client and service
	apiClient := client.NewClient(baseURL, apiToken, locale)
	connectionService := services.NewConnectionService(apiClient)

	// Get a list of all connections
	connections, res, err := connectionService.FetchConnections()
	if err != nil {
		fmt.Println("Error fetching connections:", err)
		return
	}
	fmt.Println(res.Message)
	for _, connection := range connections {
		fmt.Println("Connection:", connection.ID, connection.Name)
	}

	// Get the example connection
	connection, res, err := connectionService.FetchConnection(exampleConnectionID)
	if err != nil {
		fmt.Println("Error fetching connection:", err)
		return
	}
	fmt.Println(res.Message)
	fmt.Println("Example connection:", connection.ID, connection.Name)

	// Update the example connections description
	connection, res, err = connectionService.UpdateConnection(exampleConnectionID, connection.Name, "Updated example connection description", "Updated example connection documentation")
	if err != nil {
		fmt.Println("Error updating connection:", err)
		return
	}
	fmt.Println(res.Message)
	fmt.Println("Updated example connection:", connection.ID, connection.Name, connection.Description)
}
