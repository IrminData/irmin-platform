package orchestrator

import (
	"context"
	"irmin-api/db"
)

// executeImportWorkflowable executes the import workflow for a given workflowable.
// It uses the common workflowable execution logic to import data from the connector to the requested repository.
// It returns a slice of logs and an error if any occurred during the process.
func (o *Orchestrator) executeImportWorkflowable(
	ctx context.Context,
	workflow *db.Workflow,
	workflowable *db.ImportWorkflowable,
) ([]string, error) {
	return o.executeWorkflowableCommon(
		ctx,
		workflow,
		workflowable.ConnectionID,
		workflowable.ConnectionPath,
		&workflow.Workspace,
		&workflowable.Repository,
		workflowable.RepositoryPath,
		workflowable.RepositoryBranch,
		operationImport,
		workflowable.FieldMappings,
	)
}
