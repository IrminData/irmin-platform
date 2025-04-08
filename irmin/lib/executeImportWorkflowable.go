package lib

import (
	"context"
	"irmin-api/db"
	"irmin-api/engine"
)

// ExecuteImportWorkflowable executes the import workflow for a given workflowable.
// It retrieves the connector information and uses the Data Engine to import data from the connector to the requested repository.
// It returns a slice of logs and an error if any occurred during the process.
func ExecuteImportWorkflowable(ctx context.Context, workflow *db.Workflow, workflowable *db.ImportWorkflowable, run *db.WorkflowRun) ([]string, error) {
	var logs []string

	// Get the connector information
	connector, err := db.GetConnector(workflowable.Connection.ConnectorID)
	if err != nil {
		logs = append(logs, "Failed to get connector information")
		return logs, err
	}

	// Initialise the Data Engine
	DataEngine := engine.NewClient("en")

	// Import data from the connector to the requested repository
	err = DataEngine.DataImport(ctx, workflow.Workspace.Slug, connector.SystemToken, connector.APIBaseURL, workflowable.Repository.Slug, workflowable.Branch, workflowable.Path)
	if err != nil {
		logs = append(logs, "Failed to import data from the connector")
		return logs, err
	}

	// Log the successful import
	logs = append(logs, "Data imported successfully from the connector")

	return logs, nil
}
