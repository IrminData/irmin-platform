package examples

import (
	"fmt"
	"irmin-sdk/client"
	"irmin-sdk/services"
)

func TestLogs(baseURL, apiToken, locale string) {
	// Initialise the client and service
	apiClient := client.NewClient(baseURL, apiToken, locale)
	logService := services.NewLogService(apiClient)

	// Fetch all logs
	logEvents, res, err := logService.FetchLogEvents()
	if err != nil {
		fmt.Println("Error fetching log events:", err)
		return
	}
	fmt.Println(res.Message)
	for _, logEvent := range logEvents {
		fmt.Printf("Log Event: %+v\n", logEvent)
	}
}
