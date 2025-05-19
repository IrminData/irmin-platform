package orchestrator

import (
	"context"
	"irmin-api/db"
)

// executeExportWorkflowable executes the export workflow for a given workflowable.
// It uses the common workflowable execution logic to export data from the connector to the requested repository.
// It returns a slice of logs and an error if any occurred during the process.
func (o *Orchestrator) executeExportWorkflowable(
	ctx context.Context,
	workflow *db.Workflow,
	workflowable *db.ExportWorkflowable,
) ([]string, error) {
	return o.executeWorkflowableCommon(
		ctx,
		workflow,
		workflowable.ConnectionID,
		workflowable.ConnectionPath,
		workflowable.Path,
		workflowable.Repository.Slug,
		workflowable.Branch,
		operationExport,
	)
}
