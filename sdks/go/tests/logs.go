package irminSDKTests

import (
	"fmt"

	irminCore "github.com/IrminData/irmin-sdk-go/core-api"
)

func TestLogs(baseURL, apiToken, locale string) {
	// Initialise the client and service
	apiClient := irminCore.NewClient(baseURL, apiToken, locale)
	logService := irminCore.NewLogService(apiClient)

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
