package orchestrator

import (
	"bytes"
	"context"
	"encoding/csv"
	"errors"
	"fmt"
	"irmin-api/db"
	"irmin-api/lib"
	"maps"
	"slices"
	"sort"
	"strings"

	sandbox "irmin-api/compute-sandbox"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

const (
	// Validation modes
	validationModeSingle = "single"
	validationModeAll    = "all"
)

// executePipelineWorkflowable executes a pipeline workflowable.
//
// It executes each stage in the pipeline in order, handling the execution of actions, connections, and repositories.
// It returns the logs from each stage and any errors that occurred during execution.
//
// It also listens for context cancellation and returns an error if the context is cancelled.
func (o *Orchestrator) executePipelineWorkflowable(
	ctx context.Context,
	workflow *db.Workflow,
	run *db.WorkflowRun,
	workflowable *db.PipelineWorkflowable,
) ([]string, error) {
	var logs []string

	// Check for context cancellation before starting
	if ctx.Err() != nil {
		logs = append(logs, fmt.Sprintf("Workflow execution cancelled before starting: %v", ctx.Err()))
		return logs, ctx.Err()
	}

	// Store the results of the previously executed stage
	// This is a byte array map where the key is the result file name and the value is the file content
	previousStageResults := make(map[string][]byte)

	// Sort the stages by order sequence
	slices.SortFunc(workflowable.Stages, func(a, b db.PipelineStage) int {
		return a.OrderSequence - b.OrderSequence
	})

	// Execute each stage in the pipeline
	for key, stage := range workflowable.Stages {
		// Check for context cancellation before each stage
		if ctx.Err() != nil {
			logs = append(logs, fmt.Sprintf("Workflow execution cancelled before stage %d: %v", key+1, ctx.Err()))
			return logs, ctx.Err()
		}

		logs = append(logs, fmt.Sprintf("Executing stage %d", key+1))

		var stageLogs []string
		var errResult error

		switch stage.Type {
		case db.PipelineStageTypeAction:
			stageLogs, errResult = o.handleActionStage(
				ctx,
				workflow,
				&stage,
				previousStageResults,
			)
		case db.PipelineStageTypeConnection:
			stageLogs, errResult = o.handleConnectionStage(
				ctx,
				&stage,
				previousStageResults,
			)
		case db.PipelineStageTypeRepository:
			stageLogs, errResult = o.handleRepositoryStage(
				ctx,
				workflow,
				run,
				&stage,
				key+1,
				previousStageResults,
			)
		case db.PipelineStageTypeRepositoryAction:
			stageLogs, errResult = o.handleRepositoryActionStage(
				ctx,
				workflow,
				&stage,
			)
		case db.PipelineStageTypeTriggerWorkflow:
			stageLogs, errResult = o.handleTriggerWorkflowStage(
				ctx,
				workflow,
				&stage,
			)
		case db.PipelineStageTypeValidation:
			stageLogs, errResult = o.handleValidationStage(
				ctx,
				&stage,
				previousStageResults,
			)
		default:
			logs = append(logs, fmt.Sprintf("Unknown stage type: %s", stage.Type))
			continue
		}

		if errResult != nil {
			if ctx.Err() != nil {
				logs = append(logs, stageLogs...)
				logs = append(logs, errResult.Error())
				return logs, ctx.Err()
			}
			o.logger.ErrorContext(ctx, "Error executing stage", "error", errResult)
			logs = append(logs, stageLogs...)
			logs = append(logs, fmt.Sprintf("Error executing stage: %v", errResult))
			return logs, errResult
		}

		logs = append(logs, stageLogs...)
	}

	return logs, nil
}

// handleActionStage handles the execution of an action stage.
func (o *Orchestrator) handleActionStage(
	ctx context.Context,
	workflow *db.Workflow,
	stage *db.PipelineStage,
	previousStageResults map[string][]byte,
) ([]string, error) {
	var logs []string

	// If required, pass the previous stage results to the action workflowable on execution when the sandbox supports it
	var computeInputFiles map[string][]byte
	if stage.Write {
		computeInputFiles = previousStageResults
	}

	var computeResult sandbox.ExecutionResult
	var err error

	// Execute based on executable type
	if stage.ExecutableType == irminmodels.ActionExecutableTypeQuery {
		// Execute query
		if stage.Query == nil {
			logs = append(logs, "Query is not set for query executable type")
			return logs, errors.New("query is not set for query executable type")
		}

		queryResult := o.dataEngine.ExecuteQueryWithInputs(
			ctx,
			&workflow.Owner,
			&workflow.Workspace,
			stage.Query.SQL,
			computeInputFiles,
		)

		// Convert QueryResult to ExecutionResult
		computeResult = convertQueryResultToExecutionResult(queryResult)
		if queryResult.HasErrors {
			err = fmt.Errorf("query execution failed: %v", queryResult.Logs)
		}
	} else {
		// Execute script (default behavior)
		if stage.Script == nil {
			logs = append(logs, "Script is not set for script executable type")
			return logs, errors.New("script is not set for script executable type")
		}

		computeResult, err = o.computeSandbox.ExecutedStoredScript(
			ctx,
			computeInputFiles,
			workflow.Owner,
			stage.Script,
		)
	}

	// Always append the logs from the compute result to the workflow run logs
	logs = append(logs, computeResult.Logs)

	if err != nil {
		if ctx.Err() != nil {
			// If cancelled, append cancellation message but keep all logs
			logs = append(
				logs,
				fmt.Sprintf("Workflow execution cancelled during action execution: %v", ctx.Err()),
			)
			return logs, ctx.Err()
		}
		logs = append(logs, "Failed to execute workflowable in action execution.")
		return logs, err
	}

	if stage.Read {
		// Set the results of the previous stage to the compute result
		maps.Copy(previousStageResults, computeResult.ResultFiles)
	}

	return logs, nil
}

// handleConnectionStage handles the execution of a connection stage.
func (o *Orchestrator) handleConnectionStage(
	ctx context.Context,
	stage *db.PipelineStage,
	previousStageResults map[string][]byte,
) ([]string, error) {
	var logs []string

	// Fetch the connection and it's connector information
	connection, err := o.db.GetConnectionByID(*stage.ConnectionID)
	if err != nil {
		o.logger.ErrorContext(ctx, "Error getting connection", "error", err)
		return logs, fmt.Errorf("error getting connection: %w", err)
	}

	if stage.Write {
		writeLogs, writeLogsErr := o.handleConnectionWrite(ctx, connection, stage, previousStageResults)
		logs = append(logs, writeLogs...)
		if writeLogsErr != nil {
			return logs, writeLogsErr
		}
	}

	if stage.Read {
		readLogs, readLogsErr := o.handleConnectionRead(ctx, connection, stage, previousStageResults)
		logs = append(logs, readLogs...)
		if readLogsErr != nil {
			return logs, readLogsErr
		}
	}

	return logs, nil
}

// handleConnectionWrite handles writing data to a connection.
func (o *Orchestrator) handleConnectionWrite(
	ctx context.Context,
	connection *db.Connection,
	stage *db.PipelineStage,
	previousStageResults map[string][]byte,
) ([]string, error) {
	var logs []string

	connectionPath := strings.TrimLeft(*stage.ConnectionWritePath, "/")
	pushedPaths, operationLogs, err := o.dataEngine.PushFilesToConnector(
		ctx,
		connection,
		connectionPath,
		nil,
		previousStageResults,
	)
	if err != nil {
		if ctx.Err() != nil {
			// If cancelled, collect any logs from the push operation
			for _, pushedPath := range pushedPaths {
				logs = append(logs, fmt.Sprintf("Object ('%s') pushed to connector.", pushedPath))
			}
			logs = append(logs, fmt.Sprintf("Workflow execution cancelled during connection write: %v", ctx.Err()))
			return logs, ctx.Err()
		}
		o.logger.ErrorContext(ctx, "Error pushing files to connector", "error", err)
		return logs, err
	}

	for _, operationLog := range operationLogs {
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

	for _, pushedPath := range pushedPaths {
		logs = append(logs, fmt.Sprintf("Object ('%s') pushed to connector.", pushedPath))
	}
	return logs, nil
}

// handleConnectionRead handles reading data from a connection.
func (o *Orchestrator) handleConnectionRead(
	ctx context.Context,
	connection *db.Connection,
	stage *db.PipelineStage,
	previousStageResults map[string][]byte,
) ([]string, error) {
	var logs []string

	pulledPaths, operationLogs, err := o.dataEngine.PullFilesFromConnector(ctx, connection, stage.ConnectionReadPaths)
	if err != nil {
		if ctx.Err() != nil {
			// If cancelled, collect any logs from the pull operation
			for fileName := range pulledPaths {
				logs = append(logs, fmt.Sprintf("Object ('%s') retrieved from connection.", fileName))
			}
			logs = append(logs, fmt.Sprintf("Workflow execution cancelled during connection read: %v", ctx.Err()))
			return logs, ctx.Err()
		}
		o.logger.ErrorContext(ctx, "Error pulling files from connector", "error", err)
		return logs, err
	}

	for _, operationLog := range operationLogs {
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

	for fileName, fileContent := range pulledPaths {
		previousStageResults[fileName] = fileContent
		logs = append(logs, fmt.Sprintf("Object ('%s') retrieved from connection.", fileName))
	}
	return logs, nil
}

// handleRepositoryStage handles the execution of a repository stage.
func (o *Orchestrator) handleRepositoryStage(
	ctx context.Context,
	workflow *db.Workflow,
	run *db.WorkflowRun,
	stage *db.PipelineStage,
	stageNumber int,
	previousStageResults map[string][]byte,
) ([]string, error) {
	var logs []string

	if stage.Write {
		writeLogs, uploadedFiles, branch, err := o.handleRepositoryWrite(ctx, workflow, stage, previousStageResults)
		logs = append(logs, writeLogs...)
		if err != nil {
			return logs, err
		}

		// Commit changes if at least one file was successfully uploaded
		if uploadedFiles > 0 {
			commitLogs := o.commitPipelineStageChanges(ctx, workflow, run, stage, stageNumber, branch)
			logs = append(logs, commitLogs...)
		}
	}

	if stage.Read {
		readLogs, err := o.handleRepositoryRead(ctx, workflow, stage, previousStageResults)
		logs = append(logs, readLogs...)
		if err != nil {
			return logs, err
		}
	}

	return logs, nil
}

// handleRepositoryWrite uploads files from previous stage to the repository.
func (o *Orchestrator) handleRepositoryWrite(
	ctx context.Context,
	workflow *db.Workflow,
	stage *db.PipelineStage,
	previousStageResults map[string][]byte,
) ([]string, int, string, error) {
	var logs []string
	uploadedFiles := 0

	// Determine the branch to use: specified branch or default branch
	branch := stage.RepositoryBranch
	if branch == nil || *branch == "" {
		if stage.Repository != nil && stage.Repository.DefaultBranch != "" {
			branch = &stage.Repository.DefaultBranch
			o.logger.InfoContext(
				ctx,
				"Using repository default branch",
				"repository", stage.Repository.Slug,
				"branch", *branch,
			)
			logs = append(logs, fmt.Sprintf("Using default branch '%s' for repository writes", *branch))
		} else {
			return logs, uploadedFiles, "", errors.New("repository branch is not specified and repository has no default branch")
		}
	}

	// Upload the previous stage results to the repository
	for fileName, fileContent := range previousStageResults {
		// Check for context cancellation during each file upload
		if ctx.Err() != nil {
			return logs, uploadedFiles, *branch, fmt.Errorf(
				"workflow execution cancelled during repository write: %w",
				ctx.Err(),
			)
		}

		// Create multipart file from the byte array
		file := bytes.NewReader(fileContent)
		// Construct the path to save the file
		uploadObjectToPath := strings.Trim(*stage.RepositoryWritePath, "/") + "/" + fileName
		// Upload the object to the path in the repository at ref
		newObject, err := o.dataEngine.UploadObject(
			workflow.Workspace.Slug,
			stage.Repository.Slug,
			uploadObjectToPath,
			*branch,
			file,
		)
		if err != nil {
			o.logger.ErrorContext(
				ctx,
				"Error uploading object to Data Engine",
				"error",
				err,
				"path",
				uploadObjectToPath,
			)
			logs = append(
				logs,
				fmt.Sprintf(
					"Error saving result object ('%s') to %s@%s/%s.",
					fileName,
					stage.Repository.Slug,
					*branch,
					uploadObjectToPath,
				),
			)
			continue
		}
		// Save the object to the database in a go routine
		go func() {
			_, saveObjectErr := lib.SaveObject(
				o.db,
				o.logger,
				o.env,
				newObject,
				*branch,
				*stage.RepositoryID,
			)
			if saveObjectErr != nil {
				o.logger.ErrorContext(ctx, "Error saving object to database", "error", saveObjectErr)
			}
		}()
		logs = append(logs, fmt.Sprintf("Result object ('%s') saved to repository.", fileName))
		uploadedFiles++
	}

	return logs, uploadedFiles, *branch, nil
}

// commitPipelineStageChanges commits changes for a pipeline stage.
func (o *Orchestrator) commitPipelineStageChanges(
	ctx context.Context,
	workflow *db.Workflow,
	run *db.WorkflowRun,
	stage *db.PipelineStage,
	stageNumber int,
	branch string,
) []string {
	// Get author from workflow owner
	author := workflow.Owner.Email
	if workflow.Owner.FirstName != "" && workflow.Owner.LastName != "" {
		author = fmt.Sprintf(
			"%s %s <%s>",
			workflow.Owner.FirstName,
			workflow.Owner.LastName,
			workflow.Owner.Email,
		)
	}

	// Construct stage info for commit message
	stageInfo := fmt.Sprintf("Stage %d", stageNumber)
	if stage.Description != "" {
		stageInfo = fmt.Sprintf("Stage %d (%s)", stageNumber, stage.Description)
	}

	// Commit the changes
	return o.commitWorkflowChanges(
		ctx,
		workflow.Workspace.Slug,
		stage.Repository.Slug,
		branch,
		workflow.Name,
		"Pipeline",
		run.ID,
		stageInfo,
		author,
	)
}

// handleRepositoryRead handles reading objects from a repository stage.
func (o *Orchestrator) handleRepositoryRead(
	ctx context.Context,
	workflow *db.Workflow,
	stage *db.PipelineStage,
	previousStageResults map[string][]byte,
) ([]string, error) {
	var logs []string

	// Check for context cancellation before reading from repository
	if ctx.Err() != nil {
		return logs, fmt.Errorf("workflow execution cancelled before repository read: %w", ctx.Err())
	}

	// Process all repository read paths
	for _, repositoryPath := range stage.RepositoryReadPaths {
		// Check for context cancellation before each path
		if ctx.Err() != nil {
			return logs, fmt.Errorf("workflow execution cancelled during repository read: %w", ctx.Err())
		}

		// Read the files from the repository and set them to the previous stage results
		irminObject, err := o.dataEngine.GetPath(
			workflow.Workspace.Slug,
			stage.Repository.Slug,
			repositoryPath,
			*stage.RepositoryBranch,
		)
		if err != nil {
			if ctx.Err() != nil {
				return logs, fmt.Errorf("workflow execution cancelled during repository read: %w", ctx.Err())
			}
			o.logger.ErrorContext(ctx, "Error getting object from Data Engine", "error", err, "path", repositoryPath)
			logs = append(
				logs,
				fmt.Sprintf("Error getting object from Data Engine at path '%s': %v", repositoryPath, err),
			)
			continue
		}
		logs = append(logs, fmt.Sprintf("Object ('%s') retrieved from repository.", irminObject.Name))

		if irminObject.Type == irminmodels.ObjectTypeGroup {
			groupLogs, groupReadErr := o.handleRepositoryGroupRead(
				ctx,
				workflow,
				stage,
				irminObject,
				previousStageResults,
				[]string{},
			)
			logs = append(logs, groupLogs...)
			if groupReadErr != nil {
				return logs, groupReadErr
			}
		} else {
			singleObjectLogs, singleObjectReadErr := o.handleRepositorySingleObjectRead(
				ctx,
				workflow,
				stage,
				irminObject,
				previousStageResults,
				[]string{},
			)
			logs = append(logs, singleObjectLogs...)
			if singleObjectReadErr != nil {
				return logs, singleObjectReadErr
			}
		}
	}

	return logs, nil
}

// handleRepositoryGroupRead handles reading a group of objects from a repository.
func (o *Orchestrator) handleRepositoryGroupRead(
	ctx context.Context,
	workflow *db.Workflow,
	stage *db.PipelineStage,
	irminObject *irminmodels.Object,
	previousStageResults map[string][]byte,
	logs []string,
) ([]string, error) {
	// Read the content of every child object
	for _, child := range irminObject.Children {
		// Check for context cancellation during each child object read
		if ctx.Err() != nil {
			return logs, fmt.Errorf("workflow execution cancelled during repository child read: %w", ctx.Err())
		}

		content, err := o.dataEngine.GetObjectContent(
			workflow.Workspace.Slug,
			stage.Repository.Slug,
			child.Path,
			*stage.RepositoryBranch,
		)
		if err != nil {
			o.logger.ErrorContext(ctx, "Error getting object from Data Engine", "error", err, "path", child.Path)
			logs = append(logs, fmt.Sprintf("Error getting object from Data Engine: %v", err))
			continue
		}
		logs = append(logs, fmt.Sprintf("Object's ('%s') content retrieved from repository.", child.Name))
		// Append the content to the previous stage results
		previousStageResults[child.Name] = content
	}
	return logs, nil
}

// handleRepositorySingleObjectRead handles reading a single object from a repository.
func (o *Orchestrator) handleRepositorySingleObjectRead(
	ctx context.Context,
	workflow *db.Workflow,
	stage *db.PipelineStage,
	irminObject *irminmodels.Object,
	previousStageResults map[string][]byte,
	logs []string,
) ([]string, error) {
	// Read the content of the object
	content, err := o.dataEngine.GetObjectContent(
		workflow.Workspace.Slug,
		stage.Repository.Slug,
		irminObject.Path,
		*stage.RepositoryBranch,
	)
	if err != nil {
		if ctx.Err() != nil {
			return logs, fmt.Errorf("workflow execution cancelled during repository object read: %w", ctx.Err())
		}
		o.logger.ErrorContext(ctx, "Error getting object from Data Engine", "error", err, "path", irminObject.Path)
		return logs, fmt.Errorf("error getting object from Data Engine: %w", err)
	}
	logs = append(logs, fmt.Sprintf("Object's ('%s') content retrieved from repository.", irminObject.Name))
	// Append the content to the previous stage results
	previousStageResults[irminObject.Name] = content
	return logs, nil
}

// convertQueryResultToExecutionResult converts a QueryResult to an ExecutionResult.
// Query results are converted to CSV format and stored in ResultFiles.
func convertQueryResultToExecutionResult(queryResult *irminmodels.QueryResult) sandbox.ExecutionResult {
	result := sandbox.ExecutionResult{
		StartTime:   queryResult.StartedAt,
		EndTime:     queryResult.FinishedAt,
		Logs:        strings.Join(queryResult.Logs, "\n"),
		ResultFiles: make(map[string][]byte),
	}

	// Convert query data to CSV if there's data
	if len(queryResult.Data) > 0 && len(queryResult.Columns) > 0 {
		csvData, err := convertQueryDataToCSV(queryResult.Data, queryResult.Columns)
		if err != nil {
			result.Logs += fmt.Sprintf("\nError converting query data to CSV: %v", err)
		} else {
			result.ResultFiles["query_results.csv"] = csvData
		}
	}

	return result
}

// convertQueryDataToCSV converts query data rows and columns to CSV format.
func convertQueryDataToCSV(data []map[string]any, columns []string) ([]byte, error) {
	var csvBuffer bytes.Buffer
	writer := csv.NewWriter(&csvBuffer)

	// Write header
	if err := writer.Write(columns); err != nil {
		return nil, fmt.Errorf("writing CSV header: %w", err)
	}

	// Write rows
	for _, row := range data {
		record := make([]string, len(columns))
		for i, col := range columns {
			val := row[col]
			if val == nil {
				record[i] = ""
			} else {
				record[i] = fmt.Sprintf("%v", val)
			}
		}
		if err := writer.Write(record); err != nil {
			return nil, fmt.Errorf("writing CSV row: %w", err)
		}
	}

	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, fmt.Errorf("flushing CSV: %w", err)
	}

	return csvBuffer.Bytes(), nil
}

// handleRepositoryActionStage handles the execution of a repository action stage.
func (o *Orchestrator) handleRepositoryActionStage(
	ctx context.Context,
	workflow *db.Workflow,
	stage *db.PipelineStage,
) ([]string, error) {
	var logs []string

	// Check for context cancellation
	if ctx.Err() != nil {
		return logs, fmt.Errorf("workflow execution cancelled before repository action: %w", ctx.Err())
	}

	// Validate required fields
	if stage.RepositoryActionType == nil {
		logs = append(logs, "Repository action type is not set")
		return logs, errors.New("repository action type is not set")
	}

	if stage.RepositoryActionRepository == nil {
		logs = append(logs, "Repository action repository is not set")
		return logs, errors.New("repository action repository is not set")
	}

	if stage.RepositoryActionBranch == nil || *stage.RepositoryActionBranch == "" {
		logs = append(logs, "Repository action branch is not set")
		return logs, errors.New("repository action branch is not set")
	}

	// Execute based on action type
	switch *stage.RepositoryActionType {
	case irminmodels.RepositoryActionTypeCommit:
		return o.handleRepositoryCommitAction(ctx, workflow, stage)
	case irminmodels.RepositoryActionTypeMerge:
		return o.handleRepositoryMergeAction(ctx, workflow, stage)
	case irminmodels.RepositoryActionTypeRevert:
		return o.handleRepositoryRevertAction(ctx, workflow, stage)
	default:
		logs = append(logs, fmt.Sprintf("Unknown repository action type: %s", *stage.RepositoryActionType))
		return logs, fmt.Errorf("unknown repository action type: %s", *stage.RepositoryActionType)
	}
}

// handleRepositoryCommitAction handles committing uncommitted changes.
func (o *Orchestrator) handleRepositoryCommitAction(
	ctx context.Context,
	workflow *db.Workflow,
	stage *db.PipelineStage,
) ([]string, error) {
	var logs []string

	// Determine commit message
	commitMessage := "Automated commit from workflow"
	if stage.RepositoryActionCommitMessage != nil && *stage.RepositoryActionCommitMessage != "" {
		commitMessage = *stage.RepositoryActionCommitMessage
	}

	// Get author from workflow owner
	author := workflow.Owner.Email
	if workflow.Owner.FirstName != "" && workflow.Owner.LastName != "" {
		author = fmt.Sprintf(
			"%s %s <%s>",
			workflow.Owner.FirstName,
			workflow.Owner.LastName,
			workflow.Owner.Email,
		)
	}

	// Commit changes
	commit, err := o.dataEngine.CommitChanges(
		workflow.Workspace.Slug,
		stage.RepositoryActionRepository.Slug,
		*stage.RepositoryActionBranch,
		commitMessage,
		author,
		true,
	)
	if err != nil {
		if ctx.Err() != nil {
			logs = append(logs, fmt.Sprintf("Workflow execution cancelled during commit: %v", ctx.Err()))
			return logs, ctx.Err()
		}
		o.logger.ErrorContext(ctx, "Error committing changes", "error", err)
		logs = append(logs, fmt.Sprintf("Error committing changes: %v", err))
		return logs, err
	}

	logs = append(
		logs,
		fmt.Sprintf(
			"Committed changes to %s@%s (commit: %s)",
			stage.RepositoryActionRepository.Slug,
			*stage.RepositoryActionBranch,
			commit.Hash,
		),
	)
	return logs, nil
}

// handleRepositoryMergeAction handles merging branches.
func (o *Orchestrator) handleRepositoryMergeAction(
	ctx context.Context,
	workflow *db.Workflow,
	stage *db.PipelineStage,
) ([]string, error) {
	var logs []string

	// Validate target branch
	if stage.RepositoryActionTargetBranch == nil || *stage.RepositoryActionTargetBranch == "" {
		logs = append(logs, "Target branch is required for merge action")
		return logs, errors.New("target branch is required for merge action")
	}

	// Determine commit message
	commitMessage := fmt.Sprintf("Merge %s into %s", *stage.RepositoryActionBranch, *stage.RepositoryActionTargetBranch)
	if stage.RepositoryActionCommitMessage != nil && *stage.RepositoryActionCommitMessage != "" {
		commitMessage = *stage.RepositoryActionCommitMessage
	}

	// Get author from workflow owner
	author := workflow.Owner.Email
	if workflow.Owner.FirstName != "" && workflow.Owner.LastName != "" {
		author = fmt.Sprintf(
			"%s %s <%s>",
			workflow.Owner.FirstName,
			workflow.Owner.LastName,
			workflow.Owner.Email,
		)
	}

	// Determine merge options
	strategy := ""
	if stage.RepositoryActionMergeStrategy != nil {
		strategy = *stage.RepositoryActionMergeStrategy
	}

	squash := false
	if stage.RepositoryActionSquash != nil {
		squash = *stage.RepositoryActionSquash
	}

	allowEmpty := false
	if stage.RepositoryActionAllowEmpty != nil {
		allowEmpty = *stage.RepositoryActionAllowEmpty
	}

	// Merge branches
	mergeCommit, err := o.dataEngine.MergeRefs(
		workflow.Workspace.Slug,
		stage.RepositoryActionRepository.Slug,
		*stage.RepositoryActionTargetBranch,
		*stage.RepositoryActionBranch,
		commitMessage,
		author,
		strategy,
		squash,
		allowEmpty,
	)
	if err != nil {
		if ctx.Err() != nil {
			logs = append(logs, fmt.Sprintf("Workflow execution cancelled during merge: %v", ctx.Err()))
			return logs, ctx.Err()
		}
		o.logger.ErrorContext(ctx, "Error merging branches", "error", err)
		logs = append(logs, fmt.Sprintf("Error merging branches: %v", err))
		return logs, err
	}

	logs = append(
		logs,
		fmt.Sprintf(
			"Merged %s into %s (commit: %s)",
			*stage.RepositoryActionBranch,
			*stage.RepositoryActionTargetBranch,
			mergeCommit.Hash,
		),
	)
	return logs, nil
}

// handleRepositoryRevertAction handles reverting uncommitted changes.
func (o *Orchestrator) handleRepositoryRevertAction(
	ctx context.Context,
	workflow *db.Workflow,
	stage *db.PipelineStage,
) ([]string, error) {
	var logs []string

	// Determine revert path
	revertPath := "/"
	if stage.RepositoryActionRevertPath != nil && *stage.RepositoryActionRevertPath != "" {
		revertPath = *stage.RepositoryActionRevertPath
	}

	// Revert uncommitted changes
	err := o.dataEngine.RevertUncommitedChanges(
		workflow.Workspace.Slug,
		stage.RepositoryActionRepository.Slug,
		*stage.RepositoryActionBranch,
		revertPath,
		"reset",
	)
	if err != nil {
		if ctx.Err() != nil {
			logs = append(logs, fmt.Sprintf("Workflow execution cancelled during revert: %v", ctx.Err()))
			return logs, ctx.Err()
		}
		o.logger.ErrorContext(ctx, "Error reverting changes", "error", err)
		logs = append(logs, fmt.Sprintf("Error reverting changes: %v", err))
		return logs, err
	}

	logs = append(
		logs,
		fmt.Sprintf(
			"Reverted uncommitted changes on %s@%s (path: %s)",
			stage.RepositoryActionRepository.Slug,
			*stage.RepositoryActionBranch,
			revertPath,
		),
	)
	return logs, nil
}

// handleTriggerWorkflowStage handles triggering another workflow.
func (o *Orchestrator) handleTriggerWorkflowStage(
	ctx context.Context,
	workflow *db.Workflow,
	stage *db.PipelineStage,
) ([]string, error) {
	var logs []string

	// Check for context cancellation
	if ctx.Err() != nil {
		return logs, fmt.Errorf("workflow execution cancelled before triggering workflow: %w", ctx.Err())
	}

	// Validate required fields
	if stage.TriggerWorkflowID == nil {
		logs = append(logs, "Trigger workflow ID is not set")
		return logs, errors.New("trigger workflow ID is not set")
	}

	// Get the target workflow
	targetWorkflow, err := o.db.GetWorkflowByID(*stage.TriggerWorkflowID)
	if err != nil {
		o.logger.ErrorContext(ctx, "Error getting target workflow", "error", err)
		logs = append(logs, fmt.Sprintf("Error getting target workflow: %v", err))
		return logs, fmt.Errorf("error getting target workflow: %w", err)
	}

	// Create a workflow run (fire-and-forget)
	tx := o.db.Begin()
	defer tx.Rollback()

	workflowRun, createRunErr := lib.CreateWorkflowRun(tx, targetWorkflow, &workflow.Owner, nil)
	if createRunErr != nil {
		o.logger.ErrorContext(ctx, "Error creating workflow run", "error", createRunErr)
		logs = append(logs, fmt.Sprintf("Error triggering workflow: %v", createRunErr))
		return logs, createRunErr
	}

	if commitErr := tx.Commit().Error; commitErr != nil {
		o.logger.ErrorContext(ctx, "Error committing workflow run transaction", "error", commitErr)
		logs = append(logs, fmt.Sprintf("Error committing workflow run: %v", commitErr))
		return logs, commitErr
	}

	logs = append(logs, fmt.Sprintf("Triggered workflow '%s' (run ID: %d)", targetWorkflow.Name, workflowRun.ID))
	return logs, nil
}

// handleValidationStage handles the execution of a validation stage.
func (o *Orchestrator) handleValidationStage(
	ctx context.Context,
	stage *db.PipelineStage,
	previousStageResults map[string][]byte,
) ([]string, error) {
	var logs []string

	// Check for context cancellation
	if ctx.Err() != nil {
		return logs, fmt.Errorf("workflow execution cancelled before validation: %w", ctx.Err())
	}

	if stage.ValidationSchema == nil {
		logs = append(logs, "Validation schema is not set")
		return logs, errors.New("validation schema is not set")
	}

	// Get validation mode (default to "all")
	mode := validationModeAll
	if stage.ValidationMode != nil {
		mode = *stage.ValidationMode
	}

	// Get fail on error setting (default to true)
	failOnError := true
	if stage.FailOnError != nil {
		failOnError = *stage.FailOnError
	}

	logs = append(logs, fmt.Sprintf("Starting validation (mode: %s, fail_on_error: %v)", mode, failOnError))

	// Verify target file exists if specified
	if mode == validationModeSingle && stage.ValidationTargetName != nil {
		if err := o.verifyTargetFileExists(stage.ValidationTargetName, previousStageResults, &logs); err != nil {
			return logs, err
		}
	}

	// Validate files
	filesValidated, filesValid, validationErrors := o.validateFiles(
		ctx,
		stage,
		previousStageResults,
		mode,
		&logs,
	)

	logs = append(logs, fmt.Sprintf("Validation complete: %d/%d files valid", filesValid, filesValidated))

	// Check results
	if err := o.checkValidationResults(filesValidated, validationErrors, mode, stage.ValidationTargetName, previousStageResults, failOnError, &logs); err != nil {
		return logs, err
	}

	return logs, nil
}

// verifyTargetFileExists checks if the target file exists in the results
func (o *Orchestrator) verifyTargetFileExists(
	targetName *string,
	results map[string][]byte,
	logs *[]string,
) error {
	for fileName := range results {
		if fileName == *targetName {
			return nil
		}
	}
	*logs = append(
		*logs,
		fmt.Sprintf("✗ Target file '%s' not found in previous stage results", *targetName),
	)
	return fmt.Errorf("validation target file '%s' not found in previous stage results", *targetName)
}

// validateFiles performs validation on the appropriate files based on mode
func (o *Orchestrator) validateFiles(
	ctx context.Context,
	stage *db.PipelineStage,
	previousStageResults map[string][]byte,
	mode string,
	logs *[]string,
) (int, int, []string) {
	var filesValidated, filesValid int
	var validationErrors []string
	// Get sorted file names for deterministic ordering
	fileNames := make([]string, 0, len(previousStageResults))
	for fileName := range previousStageResults {
		fileNames = append(fileNames, fileName)
	}
	sort.Strings(fileNames)

	// Create validation config with DuckDB support
	validationConfig := &lib.ValidationConfig{
		Ctx:    ctx,
		Env:    o.env,
		Logger: o.logger,
	}

	for _, fileName := range fileNames {
		// Skip files that don't match target in single mode
		if mode == validationModeSingle && stage.ValidationTargetName != nil &&
			fileName != *stage.ValidationTargetName {
			continue
		}

		fileData := previousStageResults[fileName]
		result := lib.ValidateDataAgainstSchemaWithConfig(fileName, fileData, stage.ValidationSchema, validationConfig)
		filesValidated++

		// Log results
		if result.Valid {
			filesValid++
			*logs = append(*logs, fmt.Sprintf("✓ File '%s' passed validation", fileName))
		} else {
			*logs = append(*logs, fmt.Sprintf("✗ File '%s' failed validation:", fileName))
			for _, err := range result.Errors {
				*logs = append(*logs, fmt.Sprintf("  - %s", err))
				validationErrors = append(validationErrors, fmt.Sprintf("%s: %s", fileName, err))
			}
		}

		// Log warnings
		for _, warning := range result.Warnings {
			*logs = append(*logs, fmt.Sprintf("⚠ Warning for '%s': %s", fileName, warning))
		}

		// In single mode, break after validating the first matching file
		if mode == validationModeSingle {
			if stage.ValidationTargetName == nil {
				*logs = append(
					*logs,
					fmt.Sprintf("Single mode: validated first file alphabetically: '%s'", fileName),
				)
			}
			break
		}
	}

	return filesValidated, filesValid, validationErrors
}

// checkValidationResults checks if validation succeeded and returns appropriate error
func (o *Orchestrator) checkValidationResults(
	filesValidated int,
	validationErrors []string,
	mode string,
	targetName *string,
	previousStageResults map[string][]byte,
	failOnError bool,
	logs *[]string,
) error {
	// Check if any files were validated
	if filesValidated == 0 {
		*logs = append(*logs, "⚠ No files were validated")
		if mode == validationModeSingle && targetName == nil {
			*logs = append(*logs, "No files available from previous stage to validate")
		}
		// If we expected to validate something but didn't, that's an error
		if len(previousStageResults) > 0 || (mode == validationModeSingle && targetName != nil) {
			return errors.New("no files were validated")
		}
	}

	// Handle validation failures
	if len(validationErrors) > 0 {
		if failOnError {
			*logs = append(*logs, "Pipeline failed due to validation errors")
			return fmt.Errorf("validation failed: %d error(s) found", len(validationErrors))
		}
		*logs = append(*logs, "Validation errors found but continuing (fail_on_error=false)")
	}

	return nil
}
