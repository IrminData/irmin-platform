package main

import (
	"encoding/json"
	"log"

	irmincore "github.com/IrminData/irmin-sdk-go/core-api"
	irminutils "github.com/IrminData/irmin-sdk-go/utils"
)

func main() {
	// Parse command line flags for API key and URL.
	apiURL, apiKey, err := irminutils.GetAPIFromFlags()
	if err != nil {
		log.Fatalf("Error getting API flags: %v", err)
	}

	// Get the input files.
	inputFiles, err := irminutils.ListInputFiles()
	if err != nil {
		log.Fatalf("Error listing input files: %v", err)
	}

	// Collect the contents of the input files.
	inputFileContents := make(map[string][]byte)
	for _, inputFile := range inputFiles {
		// Print the input file.
		println(inputFile)

		// Get the content of the input file.
		content, err := irminutils.GetInputFile(inputFile)
		if err != nil {
			log.Fatalf("Error getting input file content: %v", err)
		}
		inputFileContents[inputFile] = content
	}

	// Initialise the Irmin client.
	client := irmincore.NewClient(apiURL, apiKey, "en")

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
	err = irminutils.SendComputeResult(logEventsJSON, "logEvents.json")
	if err != nil {
		log.Fatalf("Error sending compute result: %v", err)
	}

	// Return the input file contents as a script result.
	for inputFile, content := range inputFileContents {
		err = irminutils.SendComputeResult(content, inputFile)
		if err != nil {
			log.Fatalf("Error sending compute result: %v", err)
		}
	}

	// Print that everything is done.
	println("Done!")
}
