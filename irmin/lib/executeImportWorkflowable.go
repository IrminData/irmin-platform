package lib

import (
	"context"
	"fmt"
	"irmin-api/db"
	"irmin-api/engine"
	"log"
)

// ExecuteImportWorkflowable executes the import workflow for a given workflowable.
// It retrieves the connector information and uses the Data Engine to import data from the connector to the requested repository.
// It returns a slice of logs and an error if any occurred during the process.
func ExecuteImportWorkflowable(ctx context.Context, workflow *db.Workflow, workflowable *db.ImportWorkflowable, run *db.WorkflowRun) ([]string, error) {
	var logs []string

	// Fetch the connection and it's connector information
	connection, err := db.GetConnectionByID(workflowable.ConnectionID)
	if err != nil {
		log.Printf("Error getting connection: %v", err)
		logs = append(logs, fmt.Sprintf("Error getting connection: %v", err))
		return logs, err
	}

	// Initialise the Data Engine
	DataEngine := engine.NewClient("en")

	// Import data from the connector to the requested repository
	paths, errors := DataEngine.DataImport(ctx, connection, workflowable.ConnectionPath, workflow.Workspace.Slug, workflowable.Repository.Slug, workflowable.Branch, workflowable.Path)
	if len(errors) > 0 {
		for _, err := range errors {
			log.Printf("Error importing data: %v", err)
			logs = append(logs, fmt.Sprintf("Error importing data: %v", err))
		}
	} else {
		// Log the successful import
		logs = append(logs, "Data imported successfully from the connector")
	}

	// Log the paths of the imported data
	for _, path := range paths {
		log.Printf("Imported data path: %s", path)
		logs = append(logs, fmt.Sprintf("Imported data path: %s", path))
	}

	return logs, nil
}
