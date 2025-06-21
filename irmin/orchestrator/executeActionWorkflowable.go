package orchestrator

import (
	"bytes"
	"context"
	"fmt"
	"irmin-api/db"
	"irmin-api/lib"
	"strings"
)

// executeActionWorkflowable executes an action workflowable in the compute sandbox.
// It runs the executable file in the compute sandbox and saves the results to the repository if specified.
// It returns the logs generated during the execution and any error encountered.
//
//nolint:gocognit // This function is simple to read and understand as is, and it's not worth refactoring.
func (o *Orchestrator) executeActionWorkflowable(
	ctx context.Context,
	workflow *db.Workflow,
	workflowable *db.ActionWorkflowable,
) ([]string, error) {
	var logs []string

	// Check for context cancellation before starting
	if ctx.Err() != nil {
		logs = append(logs, fmt.Sprintf("Workflow execution cancelled before starting: %v", ctx.Err()))
		return logs, ctx.Err()
	}

	// Initialize a map to store the input objects
	inputFiles := make(map[string][]byte)

	// Iterate over the inputs and add them to the input files map
	for _, input := range workflowable.Inputs {
		// Check for context cancellation during input processing
		if ctx.Err() != nil {
			logs = append(logs, fmt.Sprintf("Workflow execution cancelled during input processing: %v", ctx.Err()))
			return logs, ctx.Err()
		}

		// Trim slashes from the path
		inputPath := strings.TrimLeft(input.RepositoryPath, "/")
		// Get the object content from the data engine
		content, getObjectContentErr := o.dataEngine.GetObjectContent(
			workflow.Workspace.Slug,
			input.Repository.Slug,
			inputPath,
			input.RepositoryRef,
		)
		if getObjectContentErr != nil {
			o.logger.ErrorContext(ctx, "Error getting input object content", "error", getObjectContentErr)
			logs = append(logs, fmt.Sprintf("Error getting input object content: %v", getObjectContentErr))
			continue
		}
		inputFiles[inputPath] = content
	}

	// Check for context cancellation before compute execution
	if ctx.Err() != nil {
		logs = append(logs, fmt.Sprintf("Workflow execution cancelled before compute execution: %v", ctx.Err()))
		return logs, ctx.Err()
	}

	// Run the executable file in the compute sandbox
	computeResult, err := o.computeSandbox.ExecuteEditorItem(
		ctx,
		inputFiles,
		workflow.Owner,
		workflowable.Executable,
		workflow.Workspace.Slug,
	)
	if err != nil {
		if ctx.Err() != nil {
			// If cancelled, append cancellation message but keep all logs
			logs = append(logs, computeResult.Logs)
			logs = append(logs, fmt.Sprintf("Workflow execution cancelled during compute execution: %v", ctx.Err()))
			return logs, ctx.Err()
		}
		o.logger.ErrorContext(ctx, "Failed to execute workflowable", "error", err)
		logs = append(logs, "Failed to execute workflowable in compute sandbox.")
		return logs, err
	}

	// Append the logs from the compute result to the workflow run logs
	logs = append(logs, computeResult.Logs)

	// Check for context cancellation before saving results
	if ctx.Err() != nil {
		logs = append(logs, fmt.Sprintf("Workflow execution cancelled before saving results: %v", ctx.Err()))
		return logs, ctx.Err()
	}

	// Check if the results need to be saved
	if workflowable.Repository != nil {
		// Loop through the results and save them to the repository
		for fileName, fileContent := range computeResult.ResultFiles {
			// Check for context cancellation during result saving
			if ctx.Err() != nil {
				logs = append(logs, fmt.Sprintf("Workflow execution cancelled during result saving: %v", ctx.Err()))
				return logs, ctx.Err()
			}

			// Create multipart file from the byte array
			file := bytes.NewReader(fileContent)
			// Construct the path to save the file
			uploadObjectToPath := strings.Trim(*workflowable.RepositoryPath, "/") + "/" + fileName
			// Upload the object to the path in the repository at ref
			newObject, uploadObjectErr := o.dataEngine.UploadObject(
				workflow.Workspace.Slug,
				workflowable.Repository.Slug,
				uploadObjectToPath,
				*workflowable.RepositoryBranch,
				file,
			)
			if uploadObjectErr != nil {
				o.logger.ErrorContext(ctx, "Error uploading object to Data Engine", "error", uploadObjectErr)
				logs = append(
					logs,
					fmt.Sprintf(
						"Error saving result object ('%s') to %s@%s/%s.",
						fileName,
						workflowable.Repository.Slug,
						*workflowable.RepositoryBranch,
						uploadObjectToPath,
					),
				)
				continue
			}
			// Save the object to the database in a go routine
			go func() {
				_, saveObjectErr := lib.SaveObject(
					o.db,
					newObject,
					*workflowable.RepositoryBranch,
					*workflowable.RepositoryID,
				)
				if saveObjectErr != nil {
					o.logger.ErrorContext(ctx, "Error saving object to database", "error", saveObjectErr)
				}
			}()

			logs = append(logs, fmt.Sprintf("Result object ('%s') saved to repository.", fileName))
		}
	}

	return logs, nil
}
