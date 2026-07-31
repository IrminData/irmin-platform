# Scripting and the compute sandbox

## Overview

Irmin provides powerful scripting capabilities for executing custom code and scripts within workflows. The compute sandbox executes scripts in a secure, isolated, docker container.

> Only Go-lang is currently supported.

## Go-lang scripts

Scripts can only be 1 file. The file should be `package main` and have a `main()` function to execute.

No 3rd party packages are allowed. Only the standard library and the Irmin SDK are available.

## Irmin SDK

The Irmin SDK is available to be used in the scripts, with packages like `irmincore` and `irminutils`.

The SDK is published as a package, and can be installed with `go get github.com/IrminData/irmin-sdk-go`. To learn more about the SDK, please refer to the [SDK documentation](https://github.com/IrminData/irmin-sdk-go).

The SDK provides utilities to interact with the Irmin API, to get the input files, send the results back to the caller, and common utilities for working with data.

The SDK, through the Irmin API, provides access read, write and create repositories, objects, commits, branches, tags, connections, workflows, and more.

```go
import (
	"context"
	
	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminutils "github.com/IrminData/irmin-sdk-go/utils"
)

func main() {
	// Create a context for API calls.
	ctx := context.Background()
	
	// Parse command line flags for API key and URL.
	apiURL, apiKey, getAPIFromFlagsErr := irminutils.GetAPIFromFlags()
	if getAPIFromFlagsErr != nil {
		log.Fatalf("Error getting API flags: %v", getAPIFromFlagsErr)
	}

	// Initialise the Irmin API client.
	client := irmincore.NewClient(apiURL, apiKey, "en")

	// Example API call with context.
	// workspaces, _, err := client.ListWorkspaces(ctx)
	
	// ...
} 
```

## Script input

The scripts can receive input files from repositories in the workspace to be processed. 

When the script is executed independently from a workflow, the input files need to be manually specified as an array of repositories, paths, and refs.

When the script is executed as part of an `action` workflow, the input files are specified in the workflowable configuration.

```json
{
    "inputFiles": [
        {
            "workspace": "workspace-slug",
            "repository": "repository-slug",
            "ref": "main", // branch, tag, or commit hash
            "path": "path/to/file.txt"
        }
    ]
}
```

When the script is executed as part of a `pipeline` workflow, the result of the previous step is available as input files, if there are any.
 
`irminutils.ListInputFiles() ([]string, error)` returns a list of input file names which have been passed to the script.

`irminutils.GetInputFile(inputFile string) ([]byte, error)` returns the content of the input file. The input file is the name of the file, which is returned by `ListInputFiles()`.

```go
// Get the input files.
inputFiles, listInputFilesErr := irminutils.ListInputFiles()
if listInputFilesErr != nil {
	log.Fatalf("Error listing input files: %v", listInputFilesErr)
}

// Get the content of the input file.
content, getInputFileErr := irminutils.GetInputFile(inputFile)
if getInputFileErr != nil {
	log.Fatalf("Error getting input file content: %v", getInputFileErr)
}
```

## Script output

The scripts can return results to the caller. 

When the script is executed independently from a workflow, the output will be shown to the user, but not saved anywhere. This is useful for debugging and testing.

When the script is used as part of an `action` workflow, these results can then be saved to a repository to a specific path and branch.

In `pipeline` workflows, when the script is one of the steps, the results get passed to the next step. If the next step is a script, the results are available as input files. If the next step is a repository, the results are saved to the repository. If the next step is a connection, the results are going to be exported to the connection.

The results can be saved by using the `irminutils.SendComputeResult` function. The first argument is the content of the result, the second argument is the file name to save/receive the result as.

```go
sendComputeResultErr := irminutils.SendComputeResult(content, "output.txt")
if sendComputeResultErr != nil {
    log.Fatalf("Error sending compute result: %v", sendComputeResultErr)
}
```

## Queries vs Scripts

Both queries (SQL) and scripts (Go) can be used in action workflows and pipeline stages. They handle inputs and outputs similarly:

### Input Handling
- **Scripts**: Use `irminutils.ListInputFiles()` and `irminutils.GetInputFile(filename)`
- **Queries**: Input files automatically loaded as virtual tables (e.g., `/data/sales.csv` → `data_sales_csv`)

### Output Handling
- **Scripts**: Use `irminutils.SendComputeResult(content, filename)` to create result files
- **Queries**: Results automatically exported as `query_results.csv` (or can use `COPY TO` for custom naming)

### When to Use Each
- **Use Queries (SQL)** for: Data transformations, filtering, joins, aggregations, analytics
- **Use Scripts (Go)** for: Complex logic, API calls, custom file processing, non-tabular operations

Both can:
- Accept input files from repositories or previous pipeline stages
- Save results to repositories
- Pass results to subsequent pipeline stages

## Example

This example script will fetch the log events for the first workspace available to the executing user, save the log events to a file, which will be returned as a result, and the input files to the repository.

```go
package main

import (
	"context"
	"encoding/json"
	"log"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminutils "github.com/IrminData/irmin-sdk-go/utils"
)

const (
	// logsPage is the page number to fetch log events from.
	logsPage = 1
	// logsLimit is the number of log events to fetch per page.
	logsLimit = 20
)

func main() {
	// Create a context for API calls.
	ctx := context.Background()
	
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

	// Initialise the Irmin API client.
	client := irmincore.NewClient(apiURL, apiKey, "en")

	// List available workspaces.
	workspaces, _, listWorkspacesErr := client.ListWorkspaces(ctx)
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
	logEvents, _, fetchLogEventsErr := client.FetchLogEvents(ctx, workspaces[0].Slug, "", logsPage, logsLimit)
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
