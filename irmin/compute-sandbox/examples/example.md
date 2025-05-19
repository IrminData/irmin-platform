# Example

```go
package main

import (
	"encoding/json"
	"log"

	irmincore "github.com/IrminData/irmin-sdk-go/core-api"
	irminutils "github.com/IrminData/irmin-sdk-go/utils"
)

const (
	// logsPage is the page number to fetch log events from.
	logsPage = 1
	// logsLimit is the number of log events to fetch per page.
	logsLimit = 20
)

func main() {
	// Parse command line flags for API key and URL.
	apiURL, apiKey, getAPIFromFlagsErr := irminutils.GetAPIFromFlags()
	if getAPIFromFlagsErr != nil {
		log.Fatalf("Error getting API flags: %v", getAPIFromFlagsErr)
	}

	// Get the input files.
	inputFiles, listInputFilesErr := irminutils.ListInputFiles()
	if listInputFilesErr != nil {
		log.Fatalf("Error listing input files: %v", listInputFilesErr)
	}

	// Collect the contents of the input files.
	inputFileContents := make(map[string][]byte)
	for _, inputFile := range inputFiles {
		// Print the input file.
		println(inputFile)

		// Get the content of the input file.
		content, getInputFileErr := irminutils.GetInputFile(inputFile)
		if getInputFileErr != nil {
			log.Fatalf("Error getting input file content: %v", getInputFileErr)
		}
		inputFileContents[inputFile] = content
	}

	// Initialise the Irmin client.
	client := irmincore.NewClient(apiURL, apiKey, "en")

	// List available workspaces.
	workspaces, _, listWorkspacesErr := client.ListWorkspaces()
	if listWorkspacesErr != nil {
		log.Fatalf("Error listing workspaces: %v", listWorkspacesErr)
	}
	if len(workspaces) == 0 {
		log.Fatal("No workspaces found")
	}

	// Print the workspace names.
	for _, workspace := range workspaces {
		println(workspace.Name)
	}

	// Fetch a list of log events for the first workspace.
	logEvents, _, fetchLogEventsErr := client.FetchLogEvents(workspaces[0].Slug, "", logsPage, logsLimit)
	if fetchLogEventsErr != nil {
		log.Fatalf("Error fetching log events: %v", fetchLogEventsErr)
	}

	// Marshal the log events into a JSON format.
	logEventsJSON, marshalLogEventsErr := json.MarshalIndent(logEvents, "", "  ")
	if marshalLogEventsErr != nil {
		log.Fatalf("Error marshalling log events: %v", marshalLogEventsErr)
	}

	// Return the log events as a script result.
	sendComputeResultErr := irminutils.SendComputeResult(logEventsJSON, "logEvents.json")
	if sendComputeResultErr != nil {
		log.Fatalf("Error sending compute result: %v", sendComputeResultErr)
	}

	// Return the input file contents as a script result.
	for inputFile, content := range inputFileContents {
		sendInputAsResultErr := irminutils.SendComputeResult(content, inputFile)
		if sendInputAsResultErr != nil {
			log.Fatalf("Error sending input as result: %v", sendInputAsResultErr)
		}
	}

	// Print that everything is done.
	println("Done!")
}
```
