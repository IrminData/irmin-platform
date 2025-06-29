package orchestrator

import (
	"context"
	"fmt"
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
	_, saveObjectErr := lib.SaveObject(o.db, engineObject, repositoryBranch, repository.ID)
	if saveObjectErr != nil {
		o.logger.ErrorContext(ctx, "Error saving root object to database", "error", saveObjectErr)
	}
}

// executeWorkflowableCommon handles the common execution logic for both import and export workflowables.
// It takes an operation type to determine whether to perform import or export.
func (o *Orchestrator) executeWorkflowableCommon(
	ctx context.Context,
	workflow *db.Workflow,
	connectionID uint,
	connectionPath string,
	workspace *db.Workspace,
	repository *db.Repository,
	repositoryPath string,
	repositoryBranch string,
	operation workflowOperation,
	fieldMappings []irminmodels.FieldMapping,
) ([]string, error) {
	var logs []string

	// Check for context cancellation before starting
	if ctx.Err() != nil {
		logs = append(logs, fmt.Sprintf("Workflow execution cancelled before starting: %v", ctx.Err()))
		return logs, ctx.Err()
	}

	// Fetch the connection and its connector information
	connection, err := o.db.GetConnectionByID(connectionID)
	if err != nil {
		o.logger.ErrorContext(ctx, "Error getting connection", "error", err)
		logs = append(logs, fmt.Sprintf("Error getting connection: %v", err))
		return logs, err
	}

	// Check for context cancellation before data operation
	if ctx.Err() != nil {
		logs = append(logs, fmt.Sprintf("Workflow execution cancelled before data %s: %v", operation, ctx.Err()))
		return logs, ctx.Err()
	}

	// Trim leading slashes from the paths
	connectionPath = strings.TrimLeft(connectionPath, "/")
	repositoryPath = strings.TrimLeft(repositoryPath, "/")

	var importedObjects []lakefs.ObjectMetadata
	var exportedPaths []string
	var errors []error

	// Perform the appropriate operation based on the type
	switch operation {
	case operationImport:
		importedObjects, errors = o.dataEngine.DataImport(
			connection,
			connectionPath,
			workflow.Workspace.Slug,
			repository.Slug,
			repositoryBranch,
			repositoryPath,
			fieldMappings,
		)
	case operationExport:
		exportedPaths, errors = o.dataEngine.DataExport(
			connection,
			connectionPath,
			workflow.Workspace.Slug,
			repository.Slug,
			repositoryBranch,
			repositoryPath,
			fieldMappings,
		)
	}

	// Check for context cancellation after data operation
	if ctx.Err() != nil {
		// Even if cancelled, collect any logs from the operation
		if len(errors) > 0 {
			for _, err := range errors {
				o.logger.ErrorContext(ctx, fmt.Sprintf("Error during data %s", operation), "error", err)
				logs = append(logs, fmt.Sprintf("Error during data %s: %v", operation, err))
			}
		}
		for _, object := range importedObjects {
			logs = append(logs, fmt.Sprintf("Imported object: %s", object.Path))
		}
		for _, path := range exportedPaths {
			logs = append(logs, fmt.Sprintf("Exported data path: %s", path))
		}
		logs = append(logs, fmt.Sprintf("Workflow execution cancelled after data %s: %v", operation, ctx.Err()))
		return logs, ctx.Err()
	}

	if len(errors) > 0 {
		for _, err := range errors {
			o.logger.ErrorContext(ctx, fmt.Sprintf("Error during data %s", operation), "error", err)
			logs = append(logs, fmt.Sprintf("Error during data %s: %v", operation, err))
		}
	} else {
		// Log the successful operation
		logs = append(logs, fmt.Sprintf("Data %sed successfully from the connector", operation))
	}

	// Log the paths of the processed data
	for _, object := range importedObjects {
		o.logger.InfoContext(ctx, fmt.Sprintf("Imported object: %s", object.Path), "path", object.Path)
		logs = append(logs, fmt.Sprintf("Imported object: %s", object.Path))
	}
	for _, path := range exportedPaths {
		o.logger.InfoContext(ctx, fmt.Sprintf("Exported data path: %s", path), "path", path)
		logs = append(logs, fmt.Sprintf("Exported data path: %s", path))
	}

	// Save the root object of the import target repository to the database in a go routine
	go o.saveDirectoryObjectToDB(ctx, workspace, repository, repositoryPath, repositoryBranch, importedObjects)

	return logs, nil
}
