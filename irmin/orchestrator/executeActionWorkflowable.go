package orchestrator

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"irmin-api/db"
	"irmin-api/lib"
	"strings"

	sandbox "irmin-api/compute-sandbox"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// executeActionWorkflowable executes an action workflowable in the compute sandbox.
// It runs the executable file in the compute sandbox and saves the results to the repository if specified.
// It returns the logs generated during the execution and any error encountered.
func (o *Orchestrator) executeActionWorkflowable(
	ctx context.Context,
	workflow *db.Workflow,
	run *db.WorkflowRun,
	workflowable *db.ActionWorkflowable,
) ([]string, error) {
	var logs []string

	// Check for context cancellation before starting
	if ctx.Err() != nil {
		logs = append(logs, fmt.Sprintf("Workflow execution cancelled before starting: %v", ctx.Err()))
		return logs, ctx.Err()
	}

	// Process input files
	inputFiles, inputLogs, err := o.processActionInputs(ctx, workflow, workflowable)
	logs = append(logs, inputLogs...)
	if err != nil {
		return logs, err
	}

	// Check for context cancellation before compute execution
	if ctx.Err() != nil {
		logs = append(logs, fmt.Sprintf("Workflow execution cancelled before compute execution: %v", ctx.Err()))
		return logs, ctx.Err()
	}

	// Execute the workflowable
	computeResult, execLogs, err := o.executeActionWorkflowableCompute(ctx, workflow, workflowable, inputFiles)
	logs = append(logs, execLogs...)
	if err != nil {
		return logs, err
	}

	// Check for context cancellation before saving results
	if ctx.Err() != nil {
		logs = append(logs, fmt.Sprintf("Workflow execution cancelled before saving results: %v", ctx.Err()))
		return logs, ctx.Err()
	}

	// Save results if needed
	resultLogs, err := o.saveActionResults(ctx, workflow, run, workflowable, computeResult)
	logs = append(logs, resultLogs...)

	return logs, err
}

// processActionInputs processes input files for an action workflowable.
func (o *Orchestrator) processActionInputs(
	ctx context.Context,
	workflow *db.Workflow,
	workflowable *db.ActionWorkflowable,
) (map[string][]byte, []string, error) {
	var logs []string
	inputFiles := make(map[string][]byte)

	for _, input := range workflowable.Inputs {
		// Check for context cancellation during input processing
		if ctx.Err() != nil {
			logs = append(logs, fmt.Sprintf("Workflow execution cancelled during input processing: %v", ctx.Err()))
			return nil, logs, ctx.Err()
		}

		// Trim slashes from the path
		inputPath := strings.TrimLeft(input.RepositoryPath, "/")
		// Get the object content from the data engine
		content, err := o.dataEngine.GetObjectContent(
			workflow.Workspace.Slug,
			input.Repository.Slug,
			inputPath,
			input.RepositoryRef,
		)
		if err != nil {
			o.logger.ErrorContext(ctx, "Error getting input object content", "error", err)
			logs = append(logs, fmt.Sprintf("Error getting input object content: %v", err))
			continue
		}
		inputFiles[inputPath] = content
	}

	return inputFiles, logs, nil
}

// executeActionWorkflowableCompute executes the compute logic for an action workflowable.
func (o *Orchestrator) executeActionWorkflowableCompute(
	ctx context.Context,
	workflow *db.Workflow,
	workflowable *db.ActionWorkflowable,
	inputFiles map[string][]byte,
) (sandbox.ExecutionResult, []string, error) {
	var logs []string

	if workflowable.ExecutableType == irminmodels.ActionExecutableTypeQuery {
		return o.executeQueryWorkflowable(ctx, workflow, workflowable, logs)
	}
	return o.executeScriptWorkflowable(ctx, workflow, workflowable, inputFiles, logs)
}

// executeQueryWorkflowable executes a query-based action workflowable.
func (o *Orchestrator) executeQueryWorkflowable(
	ctx context.Context,
	workflow *db.Workflow,
	workflowable *db.ActionWorkflowable,
	logs []string,
) (sandbox.ExecutionResult, []string, error) {
	if workflowable.Query == nil {
		logs = append(logs, "Query is not set for query executable type")
		return sandbox.ExecutionResult{}, logs, errors.New("query is not set for query executable type")
	}

	queryResult := o.dataEngine.ExecuteQuery(ctx, &workflow.Owner, &workflow.Workspace, workflowable.Query.SQL)
	computeResult := convertQueryResultToExecutionResult(queryResult)

	// Always append query execution logs to workflow logs
	logs = append(logs, computeResult.Logs)

	if queryResult.HasErrors {
		err := fmt.Errorf("query execution failed: %v", queryResult.Logs)
		if ctx.Err() != nil {
			logs = append(logs, fmt.Sprintf("Workflow execution cancelled during query execution: %v", ctx.Err()))
			return computeResult, logs, ctx.Err()
		}
		o.logger.ErrorContext(ctx, "Failed to execute workflowable", "error", err)
		logs = append(logs, "Failed to execute workflowable in query execution.")
		return computeResult, logs, err
	}

	return computeResult, logs, nil
}

// executeScriptWorkflowable executes a script-based action workflowable.
func (o *Orchestrator) executeScriptWorkflowable(
	ctx context.Context,
	workflow *db.Workflow,
	workflowable *db.ActionWorkflowable,
	inputFiles map[string][]byte,
	logs []string,
) (sandbox.ExecutionResult, []string, error) {
	if workflowable.Script == nil {
		logs = append(logs, "Script is not set for script executable type")
		return sandbox.ExecutionResult{}, logs, errors.New("script is not set for script executable type")
	}

	computeResult, err := o.computeSandbox.ExecutedStoredScript(
		ctx,
		inputFiles,
		workflow.Owner,
		workflowable.Script,
	)

	// Always append script execution logs to workflow logs
	logs = append(logs, computeResult.Logs)

	if err != nil {
		if ctx.Err() != nil {
			logs = append(logs, fmt.Sprintf("Workflow execution cancelled during script execution: %v", ctx.Err()))
			return computeResult, logs, ctx.Err()
		}
		o.logger.ErrorContext(ctx, "Failed to execute workflowable", "error", err)
		logs = append(logs, "Failed to execute workflowable in script execution.")
		return computeResult, logs, err
	}

	return computeResult, logs, nil
}

// saveActionResults saves the results of an action workflowable to the repository if specified.
func (o *Orchestrator) saveActionResults(
	ctx context.Context,
	workflow *db.Workflow,
	run *db.WorkflowRun,
	workflowable *db.ActionWorkflowable,
	computeResult sandbox.ExecutionResult,
) ([]string, error) {
	var logs []string

	if workflowable.ResultsRepository == nil {
		return logs, nil
	}

	// Track how many files were successfully saved and the branch used
	savedFiles := 0
	var usedBranch string

	for fileName, fileContent := range computeResult.ResultFiles {
		// Check for context cancellation during result saving
		if ctx.Err() != nil {
			logs = append(logs, fmt.Sprintf("Workflow execution cancelled during result saving: %v", ctx.Err()))
			return logs, ctx.Err()
		}

		resultLogs, branch, err := o.saveSingleResultFile(ctx, workflow, workflowable, fileName, fileContent)
		logs = append(logs, resultLogs...)
		if err != nil {
			continue
		}
		usedBranch = branch
		savedFiles++
	}

	// Commit changes if at least one file was successfully saved
	if savedFiles > 0 {
		// Get author from workflow owner
		author := workflow.Owner.Email
		if workflow.Owner.FirstName != "" && workflow.Owner.LastName != "" {
			author = fmt.Sprintf("%s %s <%s>", workflow.Owner.FirstName, workflow.Owner.LastName, workflow.Owner.Email)
		}

		// Commit the changes
		commitLogs := o.commitWorkflowChanges(
			ctx,
			workflow.Workspace.Slug,
			workflowable.ResultsRepository.Slug,
			usedBranch,
			workflow.Name,
			"Action",
			run.ID,
			"", // no stage info for actions
			author,
		)
		logs = append(logs, commitLogs...)
	}

	return logs, nil
}

// saveSingleResultFile saves a single result file to the repository.
func (o *Orchestrator) saveSingleResultFile(
	ctx context.Context,
	workflow *db.Workflow,
	workflowable *db.ActionWorkflowable,
	fileName string,
	fileContent []byte,
) ([]string, string, error) {
	var logs []string

	// Determine the branch to use: specified branch or default branch
	branch := workflowable.ResultsRepositoryBranch
	if branch == nil || *branch == "" {
		if workflowable.ResultsRepository != nil && workflowable.ResultsRepository.DefaultBranch != "" {
			branch = &workflowable.ResultsRepository.DefaultBranch
			o.logger.InfoContext(
				ctx,
				"Using repository default branch",
				"repository", workflowable.ResultsRepository.Slug,
				"branch", *branch,
			)
			logs = append(logs, fmt.Sprintf("Using default branch '%s' for results", *branch))
		} else {
			return logs, "", errors.New("results repository branch is not specified and repository has no default branch")
		}
	}

	// Create multipart file from the byte array
	file := bytes.NewReader(fileContent)
	// Construct the path to save the file
	uploadObjectToPath := strings.Trim(*workflowable.ResultsRepositoryPath, "/") + "/" + fileName
	// Upload the object to the path in the repository at ref
	newObject, err := o.dataEngine.UploadObject(
		workflow.Workspace.Slug,
		workflowable.ResultsRepository.Slug,
		uploadObjectToPath,
		*branch,
		file,
	)
	if err != nil {
		o.logger.ErrorContext(ctx, "Error uploading object to Data Engine", "error", err)
		logs = append(
			logs,
			fmt.Sprintf(
				"Error saving result object ('%s') to %s@%s/%s.",
				fileName,
				workflowable.ResultsRepository.Slug,
				*branch,
				uploadObjectToPath,
			),
		)
		return logs, *branch, err
	}

	// Save the object to the database in a go routine
	go func() {
		_, saveObjectErr := lib.SaveObject(
			o.db,
			o.logger,
			o.env,
			newObject,
			*branch,
			*workflowable.ResultsRepositoryID,
		)
		if saveObjectErr != nil {
			o.logger.ErrorContext(ctx, "Error saving object to database", "error", saveObjectErr)
		}
	}()

	logs = append(logs, fmt.Sprintf("Result object ('%s') saved to repository.", fileName))
	return logs, *branch, nil
}
