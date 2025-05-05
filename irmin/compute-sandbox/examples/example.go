package main

import (
	"encoding/json"
	"log"

	irminCore "github.com/IrminData/irmin-sdk-go/core-api"
	irminUtils "github.com/IrminData/irmin-sdk-go/utils"
)

func main() {
	// Parse command line flags for API key and URL.
	apiURL, apiKey, err := irminUtils.GetAPIFromFlags()
	if err != nil {
		log.Fatalf("Error getting API flags: %v", err)
	}

	// Initialise the Irmin client.
	client := irminCore.NewClient(apiURL, apiKey, "en")

	// List available workspaces.
	workspaces, _, err := client.ListWorkspaces()
	if err != nil {
		log.Fatalf("Error listing workspaces: %v", err)
	}
	if len(workspaces) == 0 {
		log.Fatal("No workspaces found")
	}

	// Print the workspace names.
	for _, workspace := range workspaces {
		println(workspace.Name)
	}

	// Fetch a list of log events for the first workspace.
	logEvents, _, err := client.FetchLogEvents(workspaces[0].Slug, "", 1, 20)
	if err != nil {
		log.Fatalf("Error fetching log events: %v", err)
	}

	// Marshal the log events into a JSON format.
	logEventsJSON, err := json.MarshalIndent(logEvents, "", "  ")
	if err != nil {
		log.Fatalf("Error marshalling log events: %v", err)
	}

	// Return the log events as a script result.
	err = irminUtils.SendComputeResult(logEventsJSON, "logEvents.json")
	if err != nil {
		log.Fatalf("Error sending compute result: %v", err)
	}

	// Print that everything is done.
	println("Done!")
}
