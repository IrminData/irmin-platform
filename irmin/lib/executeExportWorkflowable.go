package lib

import (
	"context"
	"fmt"
	"irmin-api/db"
	"irmin-api/engine"
	"log"
	"strings"
)

// ExecuteExportWorkflowable executes the export workflow for a given workflowable.
// It retrieves the connector information and uses the Data Engine to export data from the connector to the requested repository.
// It returns a slice of logs and an error if any occurred during the process.
func ExecuteExportWorkflowable(
	ctx context.Context,
	d *db.Database,
	workflow *db.Workflow,
	workflowable *db.ExportWorkflowable,
) ([]string, error) {
	var logs []string

	// Check for context cancellation before starting
	if ctx.Err() != nil {
		logs = append(logs, fmt.Sprintf("Workflow execution cancelled before starting: %v", ctx.Err()))
		return logs, ctx.Err()
	}

	// Fetch the connection and it's connector information
	connection, err := d.GetConnectionByID(workflowable.ConnectionID)
	if err != nil {
		log.Printf("Error getting connection: %v", err)
		logs = append(logs, fmt.Sprintf("Error getting connection: %v", err))
		return logs, err
	}

	// Check for context cancellation before data export
	if ctx.Err() != nil {
		logs = append(logs, fmt.Sprintf("Workflow execution cancelled before data export: %v", ctx.Err()))
		return logs, ctx.Err()
	}

	// Initialise the Data Engine
	dataEngine := engine.NewClient("en")

	// Trim leading slashes from the connection path and the path
	connectionPath := strings.TrimLeft(workflowable.ConnectionPath, "/")
	path := strings.TrimLeft(workflowable.Path, "/")

	// Export data from the connector to the requested repository
	paths, errors := dataEngine.DataExport(
		connection,
		connectionPath,
		workflow.Workspace.Slug,
		workflowable.Repository.Slug,
		workflowable.Branch,
		path,
	)

	// Check for context cancellation after data export
	if ctx.Err() != nil {
		// Even if cancelled, collect any logs from the export operation
		if len(errors) > 0 {
			for _, err := range errors {
				log.Printf("Error exporting data: %v", err)
				logs = append(logs, fmt.Sprintf("Error exporting data: %v", err))
			}
		}
		for _, path := range paths {
			log.Printf("Exported data path: %s", path)
			logs = append(logs, fmt.Sprintf("Exported data path: %s", path))
		}
		logs = append(logs, fmt.Sprintf("Workflow execution cancelled after data export: %v", ctx.Err()))
		return logs, ctx.Err()
	}

	if len(errors) > 0 {
		for _, err := range errors {
			log.Printf("Error exporting data: %v", err)
			logs = append(logs, fmt.Sprintf("Error exporting data: %v", err))
		}
	} else {
		// Log the successful export
		logs = append(logs, "Data exported successfully from the connector")
	}

	// Log the paths of the exported data
	for _, path := range paths {
		log.Printf("Exported data path: %s", path)
		logs = append(logs, fmt.Sprintf("Exported data path: %s", path))
	}

	return logs, nil
}
