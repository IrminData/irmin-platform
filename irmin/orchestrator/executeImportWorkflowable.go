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
	run *db.WorkflowRun,
	workflowable *db.ImportWorkflowable,
) ([]string, error) {
	return o.executeWorkflowableCommon(
		ctx,
		workflow,
		run,
		workflowable.ConnectionID,
		workflowable.ImportFromConnectionPaths,
		&workflow.Workspace,
		&workflowable.Repository,
		[]string{workflowable.ImportToRepositoryPath},
		workflowable.RepositoryBranch,
		operationImport,
		workflowable.FieldMappings,
	)
}
