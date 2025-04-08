package lib

import (
	"context"
	"irmin-api/db"
	"irmin-api/engine"
)

// ExecuteExportWorkflowable executes the export workflow for a given workflowable.
// It retrieves the connector information and uses the Data Engine to export data from the connector to the requested repository.
// It returns a slice of logs and an error if any occurred during the process.
func ExecuteExportWorkflowable(ctx context.Context, workflow *db.Workflow, workflowable *db.ExportWorkflowable, run *db.WorkflowRun) ([]string, error) {
	var logs []string

	// Get the connector information
	connector, err := db.GetConnector(workflowable.Connection.ConnectorID)
	if err != nil {
		logs = append(logs, "Failed to get connector information")
		return logs, err
	}

	// Initialise the Data Engine
	DataEngine := engine.NewClient("en")

	// Export data from the connector to the requested repository
	err = DataEngine.DataExport(workflow.Workspace.Slug, connector.SystemToken, connector.APIBaseURL, workflowable.Repository.Slug, workflowable.Branch, workflowable.Path)
	if err != nil {
		logs = append(logs, "Failed to export data from the connector")
		return logs, err
	}

	// Log the successful export
	logs = append(logs, "Data exported successfully from the connector")

	return logs, nil
}
