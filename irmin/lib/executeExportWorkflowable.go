package lib

import (
	"context"
	"fmt"
	"irmin-api/db"
	"irmin-api/engine"
	"log"
)

// ExecuteExportWorkflowable executes the export workflow for a given workflowable.
// It retrieves the connector information and uses the Data Engine to export data from the connector to the requested repository.
// It returns a slice of logs and an error if any occurred during the process.
func ExecuteExportWorkflowable(ctx context.Context, workflow *db.Workflow, workflowable *db.ExportWorkflowable, run *db.WorkflowRun) ([]string, error) {
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

	// Export data from the connector to the requested repository
	paths, errors := DataEngine.DataExport(ctx, connection, workflowable.ConnectionPath, workflow.Workspace.Slug, workflowable.Repository.Slug, workflowable.Branch, workflowable.Path)
	if len(errors) > 0 {
		for _, err := range errors {
			log.Printf("Error exporting data: %v", err)
			logs = append(logs, fmt.Sprintf("Error exporting data: %v", err))
		}
	} else {
		// Log the successful import
		logs = append(logs, "Data exported successfully from the connector")
	}

	// Log the paths of the exported data
	for _, path := range paths {
		log.Printf("Exported data path: %s", path)
		logs = append(logs, fmt.Sprintf("Exported data path: %s", path))
	}

	return logs, nil
}
