package orchestrator

import (
	"context"
	"fmt"
	connectorsclient "irmin-api/connectors-client"
	"irmin-api/db"
	"irmin-api/lakefs"
	"irmin-api/lib"
	"strings"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// workflowOperation represents the type of workflow operation.
type workflowOperation string

const (
	operationImport workflowOperation = "import"
	operationExport workflowOperation = "export"
)

// operationResult holds the results of an import or export operation.
type operationResult struct {
	importedObjects []lakefs.ObjectMetadata
	exportedPaths   []string
	operationLogs   []connectorsclient.OperationLog
	errors          []error
}

// trimPaths removes leading slashes from path slices.
func trimPaths(paths []string) []string {
	var trimmed []string
	for _, path := range paths {
		trimmed = append(trimmed, strings.TrimLeft(path, "/"))
	}
	return trimmed
}

// performImportOperation executes the import operation.
func (o *Orchestrator) performImportOperation(
	ctx context.Context,
	connection *db.Connection,
	connectionPaths []string,
	workspace *db.Workspace,
	repository *db.Repository,
	repositoryBranch string,
	repositoryPaths []string,
	fieldMappings []irminmodels.FieldMapping,
) operationResult {
	repositoryPath := ""
	if len(repositoryPaths) > 0 {
		repositoryPath = repositoryPaths[0]
	}

	importedObjects, operationLogs, errors := o.dataEngine.DataImport(
		ctx,
		connection,
		connectionPaths,
		workspace.Slug,
		repository.Slug,
		repositoryBranch,
		repositoryPath,
		fieldMappings,
	)

	return operationResult{
		importedObjects: importedObjects,
		operationLogs:   operationLogs,
		errors:          errors,
	}
}

// performExportOperation executes the export operation.
func (o *Orchestrator) performExportOperation(
	ctx context.Context,
	connection *db.Connection,
	connectionPaths []string,
	workspace *db.Workspace,
	repository *db.Repository,
	repositoryBranch string,
	repositoryPaths []string,
	fieldMappings []irminmodels.FieldMapping,
) operationResult {
	connectionPath := ""
	if len(connectionPaths) > 0 {
		connectionPath = connectionPaths[0]
	}

	exportedPaths, operationLogs, errors := o.dataEngine.DataExport(
		ctx,
		connection,
		connectionPath,
		workspace.Slug,
		repository.Slug,
		repositoryBranch,
		repositoryPaths,
		fieldMappings,
	)

	return operationResult{
		exportedPaths: exportedPaths,
		operationLogs: operationLogs,
		errors:        errors,
	}
}

// processOperationResults handles logging and error processing for operation results.
func (o *Orchestrator) processOperationResults(
	ctx context.Context,
	result operationResult,
	operation workflowOperation,
) []string {
	var logs []string

	if len(result.errors) > 0 {
		for _, err := range result.errors {
			o.logger.ErrorContext(ctx, fmt.Sprintf("Error during data %s", operation), "error", err)
			logs = append(logs, fmt.Sprintf("Error during data %s: %v", operation, err))
		}
	} else {
		logs = append(logs, fmt.Sprintf("Data %sed successfully from the connector", operation))
	}

	// Log connector operation logs
	for _, operationLog := range result.operationLogs {
		logs = append(
			logs,
			fmt.Sprintf(
				"Connector operation log: %s: %s, %s %v",
				operationLog.Type,
				operationLog.Message,
				operationLog.CreatedAt,
				operationLog.Metadata,
			),
		)
	}

	// Log imported objects
	for _, object := range result.importedObjects {
		o.logger.InfoContext(ctx, fmt.Sprintf("Imported object: %s", object.Path), "path", object.Path)
		logs = append(logs, fmt.Sprintf("Imported object: %s", object.Path))
	}

	// Log exported paths
	for _, path := range result.exportedPaths {
		o.logger.InfoContext(ctx, fmt.Sprintf("Exported data path: %s", path), "path", path)
		logs = append(logs, fmt.Sprintf("Exported data path: %s", path))
	}

	return logs
}

// checkContextCancellation checks if context is cancelled and returns appropriate logs and error.
func checkContextCancellation(ctx context.Context, stage string) ([]string, error) {
	if ctx.Err() != nil {
		logs := []string{fmt.Sprintf("Workflow execution cancelled %s: %v", stage, ctx.Err())}
		return logs, ctx.Err()
	}
	return nil, nil
}

// saveDirectoryObjectToDB saves the directory object of the import target repository to the database.
// It is called asynchronously after a successful import operation.
func (o *Orchestrator) saveDirectoryObjectToDB(
	ctx context.Context,
	workspace *db.Workspace,
	repository *db.Repository,
	repositoryPath, repositoryBranch string,
	importedObjects []lakefs.ObjectMetadata,
) {
	// Check if anything was imported
	if len(importedObjects) == 0 {
		return
	}
	// Get the directory object of the import target repository
	engineObject, getErr := o.dataEngine.GetPath(workspace.Slug, repository.Slug, repositoryPath, repositoryBranch)
	if getErr != nil {
		o.logger.ErrorContext(ctx, "Error getting root object from data engine", "error", getErr)
		return
	}
	// Save the directory object to the database
	_, saveObjectErr := lib.SaveObject(o.db, o.logger, o.env, engineObject, repositoryBranch, repository.ID)
	if saveObjectErr != nil {
		o.logger.ErrorContext(ctx, "Error saving root object to database", "error", saveObjectErr)
	}
}

// executeWorkflowableCommon handles the common execution logic for both import and export workflowables.
// It takes an operation type to determine whether to perform import or export.
func (o *Orchestrator) executeWorkflowableCommon(
	ctx context.Context,
	workflow *db.Workflow,
	run *db.WorkflowRun,
	connectionID uint,
	connectionPaths []string,
	workspace *db.Workspace,
	repository *db.Repository,
	repositoryPaths []string,
	repositoryBranch string,
	operation workflowOperation,
	fieldMappings []irminmodels.FieldMapping,
) ([]string, error) {
	// Check for context cancellation before starting
	if logs, contextErr := checkContextCancellation(ctx, "before starting"); contextErr != nil {
		return logs, contextErr
	}

	// Fetch the connection
	connection, getConnectionErr := o.db.GetConnectionByID(connectionID)
	if getConnectionErr != nil {
		o.logger.ErrorContext(ctx, "Error getting connection", "error", getConnectionErr)
		logs := []string{fmt.Sprintf("Error getting connection: %v", getConnectionErr)}
		return logs, getConnectionErr
	}

	// Check for context cancellation before data operation
	if logs, contextErr := checkContextCancellation(ctx, fmt.Sprintf("before data %s", operation)); contextErr != nil {
		return logs, contextErr
	}

	// Trim leading slashes from paths
	trimmedConnectionPaths := trimPaths(connectionPaths)
	trimmedRepositoryPaths := trimPaths(repositoryPaths)

	// Perform the appropriate operation
	var result operationResult
	switch operation {
	case operationImport:
		result = o.performImportOperation(
			ctx,
			connection,
			trimmedConnectionPaths,
			workspace,
			repository,
			repositoryBranch,
			trimmedRepositoryPaths,
			fieldMappings,
		)
	case operationExport:
		result = o.performExportOperation(
			ctx,
			connection,
			trimmedConnectionPaths,
			workspace,
			repository,
			repositoryBranch,
			trimmedRepositoryPaths,
			fieldMappings,
		)
	}

	// Check for context cancellation after data operation
	if ctx.Err() != nil {
		logs := o.processOperationResults(ctx, result, operation)
		logs = append(logs, fmt.Sprintf("Workflow execution cancelled after data %s: %v", operation, ctx.Err()))
		return logs, ctx.Err()
	}

	// Process operation results
	logs := o.processOperationResults(ctx, result, operation)

	// Save directory object for import operations
	if operation == operationImport && len(trimmedRepositoryPaths) > 0 {
		go o.saveDirectoryObjectToDB(
			ctx,
			workspace,
			repository,
			trimmedRepositoryPaths[0],
			repositoryBranch,
			result.importedObjects,
		)
	}

	// Commit changes if import operation was successful (no errors)
	// Export operations only read from the repository, so they should not commit
	if operation == operationImport && len(result.errors) == 0 {
		// Get author from workflow owner
		author := workflow.Owner.Email
		if workflow.Owner.FirstName != "" && workflow.Owner.LastName != "" {
			author = fmt.Sprintf("%s %s <%s>", workflow.Owner.FirstName, workflow.Owner.LastName, workflow.Owner.Email)
		}

		// Commit the changes
		commitLogs := o.commitWorkflowChanges(
			ctx,
			workspace.Slug,
			repository.Slug,
			repositoryBranch,
			workflow.Name,
			string(operation),
			run.ID,
			"", // no stage info for import/export
			author,
		)
		logs = append(logs, commitLogs...)
	}

	return logs, nil
}

// commitWorkflowChanges commits changes to a repository branch with workflow metadata in the commit message.
// This function is non-fatal - if the commit fails or there are no changes, it logs the result but doesn't return an error.
func (o *Orchestrator) commitWorkflowChanges(
	ctx context.Context,
	workspace string,
	repository string,
	branch string,
	workflowName string,
	workflowType string,
	runID uint,
	stageInfo string,
	author string,
) []string {
	var logs []string

	// Check for context cancellation before committing
	if ctx.Err() != nil {
		o.logger.InfoContext(ctx, "Skipping commit due to context cancellation")
		return logs
	}

	// Construct commit message with workflow metadata
	var commitMessage string
	if stageInfo != "" {
		// Pipeline stage commit
		commitMessage = fmt.Sprintf(
			"[Workflow Pipeline] %s - %s - Run #%d\n\nAutomated commit from pipeline stage execution.\nStage: %s\nRun ID: %d",
			workflowName,
			stageInfo,
			runID,
			stageInfo,
			runID,
		)
	} else {
		// Regular workflow commit
		commitMessage = fmt.Sprintf(
			"[Workflow %s] %s - Run #%d\n\nAutomated commit from workflow execution.\nType: %s\nRun ID: %d",
			workflowType,
			workflowName,
			runID,
			workflowType,
			runID,
		)
	}

	// Attempt to commit changes (allowEmpty=false to skip if no changes)
	commit, commitErr := o.dataEngine.CommitChanges(
		workspace,
		repository,
		branch,
		commitMessage,
		author,
		false, // allowEmpty
	)

	if commitErr != nil {
		// Check if error is due to no changes (this is expected and not a failure)
		if strings.Contains(commitErr.Error(), "no changes") ||
			strings.Contains(commitErr.Error(), "nothing to commit") {
			o.logger.InfoContext(ctx, "No changes to commit for workflow", "workflow", workflowName, "run_id", runID)
			logs = append(logs, "No changes to commit")
			return logs
		}

		// Log error but don't fail the workflow
		o.logger.ErrorContext(
			ctx,
			"Failed to commit workflow changes",
			"error", commitErr,
			"workflow", workflowName,
			"run_id", runID,
			"branch", branch,
		)
		logs = append(logs, fmt.Sprintf("Warning: Failed to commit changes: %v", commitErr))
		return logs
	}

	// Success
	o.logger.InfoContext(
		ctx,
		"Successfully committed workflow changes",
		"workflow", workflowName,
		"run_id", runID,
		"branch", branch,
		"commit_hash", commit.Hash,
	)
	logs = append(logs, fmt.Sprintf("Changes committed to branch '%s' (commit: %s)", branch, commit.Hash))

	return logs
}
