package orchestrator

import (
	"context"
	"fmt"
	"irmin-api/db"
	"strings"
)

// workflowOperation represents the type of workflow operation.
type workflowOperation string

const (
	operationImport workflowOperation = "import"
	operationExport workflowOperation = "export"
)

// executeWorkflowableCommon handles the common execution logic for both import and export workflowables.
// It takes an operation type to determine whether to perform import or export.
func (o *Orchestrator) executeWorkflowableCommon(
	ctx context.Context,
	workflow *db.Workflow,
	connectionID uint,
	connectionPath string,
	path string,
	repoSlug string,
	branch string,
	operation workflowOperation,
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
	path = strings.TrimLeft(path, "/")

	var paths []string
	var errors []error

	// Perform the appropriate operation based on the type
	switch operation {
	case operationImport:
		paths, errors = o.dataEngine.DataImport(
			connection,
			connectionPath,
			workflow.Workspace.Slug,
			repoSlug,
			branch,
			path,
		)
	case operationExport:
		paths, errors = o.dataEngine.DataExport(
			connection,
			connectionPath,
			workflow.Workspace.Slug,
			repoSlug,
			branch,
			path,
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
		for _, path := range paths {
			o.logger.InfoContext(ctx, fmt.Sprintf("%sed data path", operation), "path", path)
			logs = append(logs, fmt.Sprintf("%sed data path: %s", operation, path))
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
	for _, path := range paths {
		o.logger.InfoContext(ctx, fmt.Sprintf("%sed data path", operation), "path", path)
		logs = append(logs, fmt.Sprintf("%sed data path: %s", operation, path))
	}

	return logs, nil
}
