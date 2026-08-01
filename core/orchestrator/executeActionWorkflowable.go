package orchestrator

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"irmin-api/db"
	"irmin-api/lib"
	"irmin-api/utils"
	"strings"
	"time"

	sandbox "irmin-api/compute-sandbox"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
)

const (
	// maxQueryPreviewLength is the maximum length for SQL query preview in logs.
	maxQueryPreviewLength = 200
	// maxOutputPreviewLength is the maximum length for script output preview in logs.
	maxOutputPreviewLength = 500
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
	lb := NewWorkflowLogBuilder()
	inputFiles := make(map[string][]byte)

	for _, input := range workflowable.Inputs {
		// Check for context cancellation during input processing
		if ctx.Err() != nil {
			logs = append(logs, fmt.Sprintf("Workflow execution cancelled during input processing: %v", ctx.Err()))
			return nil, logs, ctx.Err()
		}

		// Trim slashes from the path
		inputPath := strings.TrimLeft(input.RepositoryPath, "/")

		// Pre-check file size before loading into memory
		maxInputSize := utils.MaxWorkflowInputFileSizeBytes(o.env)
		inputObject, findErr := o.db.FindObject(&inputPath, &input.RepositoryID, &input.RepositoryRef)
		if findErr == nil && inputObject != nil && inputObject.SizeBytes > maxInputSize {
			errMsg := fmt.Sprintf(
				"Input file %s exceeds max size (%d MB), skipping",
				inputPath, o.env.MaxWorkflowInputFileSizeMB,
			)
			o.logger.WarnContext(ctx, errMsg, "size_bytes", inputObject.SizeBytes, "max_bytes", maxInputSize)
			logs = append(logs, errMsg)
			continue
		}

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

		// Add structured input file log
		logs = append(logs, lb.InputFile(InputFileLog{
			BaseLogEntry: BaseLogEntry{
				Message: fmt.Sprintf(
					"Loaded input: %s from %s@%s",
					inputPath,
					input.Repository.Slug,
					input.RepositoryRef,
				),
			},
			RepositorySlug: input.Repository.Slug,
			Path:           inputPath,
			Ref:            input.RepositoryRef,
			SizeBytes:      int64(len(content)),
		}))
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
		return o.executeQueryWorkflowable(ctx, workflow, workflowable, inputFiles, logs)
	}
	return o.executeScriptWorkflowable(ctx, workflow, workflowable, inputFiles, logs)
}

// executeQueryWorkflowable executes a query-based action workflowable.
func (o *Orchestrator) executeQueryWorkflowable(
	ctx context.Context,
	workflow *db.Workflow,
	workflowable *db.ActionWorkflowable,
	inputFiles map[string][]byte,
	logs []string,
) (sandbox.ExecutionResult, []string, error) {
	lb := NewWorkflowLogBuilder()

	if workflowable.Query == nil {
		logs = append(logs, "Query is not set for query executable type")
		return sandbox.ExecutionResult{}, logs, errors.New("query is not set for query executable type")
	}

	startTime := time.Now()
	queryResult := o.dataEngine.ExecuteQueryWithInputs(
		ctx,
		&workflow.Owner,
		&workflow.Workspace,
		workflowable.Query.SQL,
		inputFiles,
	)
	endTime := time.Now()
	computeResult := convertQueryResultToExecutionResult(queryResult)

	// Always append query execution logs to workflow logs
	logs = append(logs, computeResult.Logs)

	// Add structured query execution log
	queryPreview := workflowable.Query.SQL
	if len(queryPreview) > maxQueryPreviewLength {
		queryPreview = queryPreview[:maxQueryPreviewLength-3] + "..."
	}

	errorMsg := ""
	if queryResult.HasErrors {
		errorMsg = strings.Join(queryResult.Logs, "; ")
	}

	logs = append(logs, lb.QueryExec(QueryExecutionLog{
		BaseLogEntry: BaseLogEntry{
			Message: fmt.Sprintf(
				"Query execution %s",
				map[bool]string{true: "failed", false: "completed"}[queryResult.HasErrors],
			),
		},
		QueryID:      workflowable.Query.ID,
		QueryPreview: queryPreview,
		StartTime:    startTime,
		EndTime:      endTime,
		DurationMs:   endTime.Sub(startTime).Milliseconds(),
		RowsReturned: len(queryResult.Data),
		Columns:      queryResult.Columns,
		Success:      !queryResult.HasErrors,
		ErrorMessage: errorMsg,
	}))

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
	lb := NewWorkflowLogBuilder()

	if workflowable.Script == nil {
		logs = append(logs, "Script is not set for script executable type")
		return sandbox.ExecutionResult{}, logs, errors.New("script is not set for script executable type")
	}

	// Check compute invocation usage limit before execution
	if limitErr := o.checkComputeInvocationLimit(workflow.WorkspaceID); limitErr != nil {
		logs = append(logs, "Compute invocation usage limit exceeded")
		return sandbox.ExecutionResult{}, logs, limitErr
	}

	computeResult, err := o.computeSandbox.ExecutedStoredScript(
		ctx,
		inputFiles,
		workflow.Owner,
		workflowable.Script,
	)

	// Track compute sandbox invocation for billing (regardless of success/failure)
	o.trackComputeInvocation(workflow.WorkspaceID)

	// Always append script execution logs to workflow logs
	logs = append(logs, computeResult.Logs)

	// Build input file names list
	inputFileNames := make([]string, 0, len(inputFiles))
	for name := range inputFiles {
		inputFileNames = append(inputFileNames, name)
	}

	// Build output file names list
	outputFileNames := make([]string, 0, len(computeResult.ResultFiles))
	for name := range computeResult.ResultFiles {
		outputFileNames = append(outputFileNames, name)
	}

	// Truncate output preview
	outputPreview := computeResult.Logs
	if len(outputPreview) > maxOutputPreviewLength {
		outputPreview = outputPreview[:maxOutputPreviewLength-3] + "..."
	}

	// Add structured script execution log
	logs = append(logs, lb.ScriptExec(ScriptExecutionLog{
		BaseLogEntry: BaseLogEntry{
			Message: fmt.Sprintf(
				"Script execution %s: %s",
				map[bool]string{true: "failed", false: "completed"}[err != nil],
				workflowable.Script.Name,
			),
		},
		ScriptID:      workflowable.Script.ID,
		ScriptName:    workflowable.Script.Name,
		RuntimeType:   workflowable.Script.Language,
		StartTime:     computeResult.StartTime,
		EndTime:       computeResult.EndTime,
		DurationMs:    computeResult.EndTime.Sub(computeResult.StartTime).Milliseconds(),
		Success:       err == nil,
		InputFiles:    inputFileNames,
		OutputFiles:   outputFileNames,
		OutputPreview: outputPreview,
	}))

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
	lb := NewWorkflowLogBuilder()

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

	// Add structured output file / object modified log
	logs = append(logs, lb.ObjectModified(ObjectModifiedLog{
		BaseLogEntry: BaseLogEntry{
			Message: fmt.Sprintf("Created: %s", uploadObjectToPath),
		},
		Operation:      "created",
		RepositorySlug: workflowable.ResultsRepository.Slug,
		Path:           uploadObjectToPath,
		Branch:         *branch,
		SizeBytes:      int64(len(fileContent)),
		ContentType:    newObject.ContentType,
	}))

	return logs, *branch, nil
}
