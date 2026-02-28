package orchestrator

import (
	"bytes"
	"context"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	irmincache "irmin-api/cache"
	"irmin-api/db"
	"irmin-api/embeddings"
	"irmin-api/engine"
	enginevalidation "irmin-api/engine/validation"
	"irmin-api/lib"
	"irmin-api/utils"
	"maps"
	"slices"
	"sort"
	"strings"
	"time"

	sandbox "irmin-api/compute-sandbox"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

const (
	// Validation modes
	validationModeSingle = "single"
	validationModeAll    = "all"

	// Maximum length for sample strings in validation logs
	maxSampleStringLength = 200
)

// executePipelineWorkflowable executes a pipeline workflowable.
//
// It executes each stage in the pipeline in order, handling the execution of actions, connections, and repositories.
// It returns the logs from each stage and any errors that occurred during execution.
//
// It also listens for context cancellation and returns an error if the context is cancelled.
//
//nolint:funlen // Pipeline orchestration requires handling multiple stage types in a single flow
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

	// Inject trigger payload as trigger_event.json if present on the workflow run
	// This makes connection event data and diff patches available to pipeline stages
	if len(run.TriggerPayload) > 0 {
		previousStageResults["trigger_event.json"] = run.TriggerPayload
		logs = append(logs, "Injected trigger payload as trigger_event.json")
	}

	// Sort the stages by order sequence
	slices.SortFunc(workflowable.Stages, func(a, b db.PipelineStage) int {
		return a.OrderSequence - b.OrderSequence
	})

	// Execute each stage in the pipeline
	lb := NewWorkflowLogBuilder()

	for key, stage := range workflowable.Stages {
		// Check for context cancellation before each stage
		if ctx.Err() != nil {
			logs = append(logs, fmt.Sprintf("Workflow execution cancelled before stage %d: %v", key+1, ctx.Err()))
			return logs, ctx.Err()
		}

		stageStart := time.Now()
		stageNum := key + 1

		// Log stage start
		logs = append(logs, lb.StageStart(StageLog{
			BaseLogEntry: BaseLogEntry{
				Message: fmt.Sprintf("Starting stage %d: %s", stageNum, stage.Type),
			},
			StageNumber: stageNum,
			StageType:   string(stage.Type),
			Description: stage.Description,
		}))

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
		case db.PipelineStageTypeTransform:
			stageLogs, errResult = o.handleTransformStage(
				ctx,
				&stage,
				previousStageResults,
			)
		case db.PipelineStageTypeEmbeddings:
			stageLogs, errResult = o.handleEmbeddingsStage(
				ctx,
				workflow,
				&stage,
				previousStageResults,
			)
		case db.PipelineStageTypePatch:
			stageLogs, errResult = o.handlePatchStage(
				ctx,
				workflow,
				&stage,
				previousStageResults,
			)
		case db.PipelineStageTypeFieldMapping:
			stageLogs, errResult = o.handleFieldMappingStage(
				ctx,
				&stage,
				previousStageResults,
			)
		default:
			logs = append(logs, fmt.Sprintf("Unknown stage type: %s", stage.Type))
			continue
		}

		stageDuration := time.Since(stageStart)

		if errResult != nil {
			// Append stage logs first to maintain chronological order
			logs = append(logs, stageLogs...)

			// Log stage end with failure
			logs = append(logs, lb.StageEnd(StageLog{
				BaseLogEntry: BaseLogEntry{
					Message: fmt.Sprintf("Stage %d failed: %s", stageNum, stage.Type),
				},
				StageNumber: stageNum,
				StageType:   string(stage.Type),
				DurationMs:  stageDuration.Milliseconds(),
				Success:     false,
			}))

			if ctx.Err() != nil {
				logs = append(logs, errResult.Error())
				return logs, ctx.Err()
			}
			o.logger.ErrorContext(ctx, "Error executing stage", "error", errResult)
			logs = append(logs, fmt.Sprintf("Error executing stage: %v", errResult))
			return logs, errResult
		}

		// Append stage logs first to maintain chronological order
		logs = append(logs, stageLogs...)

		// Log stage end with success
		logs = append(logs, lb.StageEnd(StageLog{
			BaseLogEntry: BaseLogEntry{
				Message: fmt.Sprintf("Stage %d completed: %s", stageNum, stage.Type),
			},
			StageNumber: stageNum,
			StageType:   string(stage.Type),
			DurationMs:  stageDuration.Milliseconds(),
			Success:     true,
		}))
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

	// Check accumulated size to prevent OOM on large pulls
	var totalSize int64
	for _, content := range pulledPaths {
		totalSize += int64(len(content))
	}
	maxMB := o.env.MaxInMemorySizeMB * engine.InMemoryMultiplier
	maxBytes := int64(maxMB) * int64(utils.BytesPerMB)
	if totalSize > maxBytes {
		return logs, fmt.Errorf(
			"pulled data exceeds pipeline memory limit (%d MB)",
			maxMB,
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
	case irminmodels.RepositoryActionTypeDelete:
		return o.handleRepositoryDeleteAction(ctx, workflow, stage)
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

// handleRepositoryDeleteAction handles deleting an object from the repository.
func (o *Orchestrator) handleRepositoryDeleteAction(
	ctx context.Context,
	workflow *db.Workflow,
	stage *db.PipelineStage,
) ([]string, error) {
	var logs []string

	// Validate delete path
	if stage.RepositoryActionDeletePath == nil || *stage.RepositoryActionDeletePath == "" {
		logs = append(logs, "Delete path is required for delete action")
		return logs, errors.New("delete path is required for delete action")
	}

	deletePath := *stage.RepositoryActionDeletePath

	// Delete the object from the repository
	err := o.dataEngine.DeleteObject(
		workflow.Workspace.Slug,
		stage.RepositoryActionRepository.Slug,
		deletePath,
		*stage.RepositoryActionBranch,
	)
	if err != nil {
		if ctx.Err() != nil {
			logs = append(logs, fmt.Sprintf("Workflow execution cancelled during delete: %v", ctx.Err()))
			return logs, ctx.Err()
		}
		o.logger.ErrorContext(ctx, "Error deleting object", "error", err)
		logs = append(logs, fmt.Sprintf("Error deleting object: %v", err))
		return logs, err
	}

	logs = append(
		logs,
		fmt.Sprintf(
			"Deleted object at %s@%s (path: %s)",
			stage.RepositoryActionRepository.Slug,
			*stage.RepositoryActionBranch,
			deletePath,
		),
	)

	// Optionally commit the deletion if a commit message is provided
	if stage.RepositoryActionCommitMessage != nil && *stage.RepositoryActionCommitMessage != "" {
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

		// Commit the deletion
		commit, commitErr := o.dataEngine.CommitChanges(
			workflow.Workspace.Slug,
			stage.RepositoryActionRepository.Slug,
			*stage.RepositoryActionBranch,
			*stage.RepositoryActionCommitMessage,
			author,
			true,
		)
		if commitErr != nil {
			if ctx.Err() != nil {
				logs = append(logs, fmt.Sprintf("Workflow execution cancelled during commit: %v", ctx.Err()))
				return logs, ctx.Err()
			}
			o.logger.ErrorContext(ctx, "Error committing deletion", "error", commitErr)
			logs = append(logs, fmt.Sprintf("Error committing deletion: %v", commitErr))
			return logs, commitErr
		}

		logs = append(
			logs,
			fmt.Sprintf(
				"Committed deletion to %s@%s (commit: %s)",
				stage.RepositoryActionRepository.Slug,
				*stage.RepositoryActionBranch,
				commit.Hash,
			),
		)
	}

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
	validationConfig := &enginevalidation.Config{
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

		// Log file details before validation
		*logs = append(*logs, fmt.Sprintf("Validating file '%s' (size: %d bytes)", fileName, len(fileData)))

		// Log schema details
		o.logValidationSchemaDetails(stage.ValidationSchema, logs)

		// Log actual data structure (for JSON files)
		o.logValidationDataStructure(fileData, logs)

		result := enginevalidation.ValidateFile(ctx, fileName, fileData, stage.ValidationSchema, validationConfig)
		filesValidated++

		// Log results
		if result.Valid {
			filesValid++
			*logs = append(*logs, fmt.Sprintf("✓ File '%s' passed validation", fileName))
		} else {
			*logs = append(*logs, fmt.Sprintf("✗ File '%s' failed validation:", fileName))
			for _, err := range result.Errors {
				*logs = append(*logs, fmt.Sprintf("  - %s", err.Message))
				validationErrors = append(validationErrors, fmt.Sprintf("%s: %s", fileName, err.Message))
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

// logValidationSchemaDetails logs details about the validation schema.
func (o *Orchestrator) logValidationSchemaDetails(schema *irminmodels.ObjectSchema, logs *[]string) {
	if schema == nil {
		return
	}

	schemaType := string(schema.Type)
	*logs = append(*logs, fmt.Sprintf("  Schema type: %s", schemaType))

	if schema.Type == irminmodels.ObjectTypeStructured && schema.Schema != nil {
		*logs = append(*logs, fmt.Sprintf("  JSON Schema type: %s", schema.Schema.Type))
		if len(schema.Schema.Required) > 0 {
			*logs = append(*logs, fmt.Sprintf("  Required fields: %v", schema.Schema.Required))
		}
		if len(schema.Schema.Properties) > 0 {
			propertyNames := make([]string, 0, len(schema.Schema.Properties))
			for propName := range schema.Schema.Properties {
				propertyNames = append(propertyNames, propName)
			}
			*logs = append(*logs, fmt.Sprintf("  Schema properties: %v", propertyNames))
		}
	}
	if schema.ContentType != nil {
		*logs = append(*logs, fmt.Sprintf("  Expected content type: %s", *schema.ContentType))
	}
}

// logValidationDataStructure logs details about the actual data structure being validated.
func (o *Orchestrator) logValidationDataStructure(fileData []byte, logs *[]string) {
	if len(fileData) == 0 {
		return
	}

	var parsedData any
	if err := json.Unmarshal(fileData, &parsedData); err == nil {
		dataType := fmt.Sprintf("%T", parsedData)
		*logs = append(*logs, fmt.Sprintf("  Actual data type: %s", dataType))

		// Log sample structure for arrays and objects
		switch v := parsedData.(type) {
		case []any:
			o.logArraySample(v, logs)
		case map[string]any:
			o.logObjectSample(v, logs)
		}
	} else {
		*logs = append(*logs, fmt.Sprintf("  Data is not valid JSON: %v", err))
	}
}

// logArraySample logs sample data for array types.
func (o *Orchestrator) logArraySample(arr []any, logs *[]string) {
	*logs = append(*logs, fmt.Sprintf("  Array length: %d", len(arr)))
	if len(arr) == 0 {
		return
	}

	*logs = append(*logs, fmt.Sprintf("  First item type: %T", arr[0]))
	firstItemSample, err := json.Marshal(arr[0])
	if err != nil {
		return
	}

	sampleStr := string(firstItemSample)
	if len(sampleStr) > maxSampleStringLength {
		sampleStr = sampleStr[:maxSampleStringLength] + "..."
	}
	*logs = append(*logs, fmt.Sprintf("  First item sample: %s", sampleStr))
}

// logObjectSample logs sample data for object types.
func (o *Orchestrator) logObjectSample(obj map[string]any, logs *[]string) {
	keys := make([]string, 0, len(obj))
	for k := range obj {
		keys = append(keys, k)
	}
	*logs = append(*logs, fmt.Sprintf("  Object keys: %v", keys))

	if len(obj) == 0 {
		return
	}

	objSample, err := json.Marshal(obj)
	if err != nil {
		return
	}

	sampleStr := string(objSample)
	if len(sampleStr) > maxSampleStringLength {
		sampleStr = sampleStr[:maxSampleStringLength] + "..."
	}
	*logs = append(*logs, fmt.Sprintf("  Object sample: %s", sampleStr))
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

// handleTransformStage handles the execution of a transform stage.
func (o *Orchestrator) handleTransformStage(
	ctx context.Context,
	stage *db.PipelineStage,
	previousStageResults map[string][]byte,
) ([]string, error) {
	var logs []string

	// Check for context cancellation
	if ctx.Err() != nil {
		return logs, fmt.Errorf("workflow execution cancelled before transform: %w", ctx.Err())
	}

	// Validate transform operation
	if stage.TransformOperation == nil {
		logs = append(logs, "Transform operation is not set")
		return logs, errors.New("transform operation is not set")
	}

	// Get transform mode (default to "all")
	mode := "all"
	if stage.TransformMode != nil {
		mode = *stage.TransformMode
	}

	// Get target name for single mode
	targetName := ""
	if stage.TransformTargetName != nil {
		targetName = *stage.TransformTargetName
	}

	logs = append(logs, fmt.Sprintf("Starting transform (operation: %s, mode: %s)", *stage.TransformOperation, mode))

	// Build transform config
	config := o.buildTransformConfig(stage, mode, targetName)

	// Log operation-specific details
	o.logTransformDetails(&logs, stage, config)

	// Execute transformation
	transformedFiles, err := o.dataEngine.ProcessTransformations(ctx, previousStageResults, config)
	if err != nil {
		if ctx.Err() != nil {
			logs = append(logs, fmt.Sprintf("Workflow execution cancelled during transform: %v", ctx.Err()))
			return logs, ctx.Err()
		}
		logs = append(logs, fmt.Sprintf("Transform failed: %v", err))
		return logs, err
	}

	// Update previous stage results with transformed files
	// Clear the map first
	for key := range previousStageResults {
		delete(previousStageResults, key)
	}
	maps.Copy(previousStageResults, transformedFiles)

	// Log success
	logs = append(logs, fmt.Sprintf("Transform complete: %d file(s) processed", len(transformedFiles)))
	for fileName := range transformedFiles {
		logs = append(logs, fmt.Sprintf("  - %s", fileName))
	}

	return logs, nil
}

// buildTransformConfig builds an engine.TransformConfig from the pipeline stage.
func (o *Orchestrator) buildTransformConfig(
	stage *db.PipelineStage,
	mode string,
	targetName string,
) engine.TransformConfig {
	config := engine.TransformConfig{
		Operation:  *stage.TransformOperation,
		Mode:       mode,
		TargetName: targetName,
	}

	// Set operation-specific fields
	switch *stage.TransformOperation {
	case irminmodels.TransformOpFieldRename:
		config.FieldRenames = stage.TransformFieldRenames
	case irminmodels.TransformOpFieldRemove:
		config.FieldsToRemove = stage.TransformFieldsToRemove
	case irminmodels.TransformOpFileRename:
		if stage.TransformOutputName != nil {
			config.OutputName = *stage.TransformOutputName
		}
	case irminmodels.TransformOpFileRemove:
		// file_remove doesn't require additional config
	case irminmodels.TransformOpFormatConvert:
		if stage.TransformOutputFormat != nil {
			config.OutputFormat = *stage.TransformOutputFormat
		}
	}

	return config
}

// logTransformDetails logs operation-specific details for the transform stage.
func (o *Orchestrator) logTransformDetails(logs *[]string, stage *db.PipelineStage, config engine.TransformConfig) {
	switch *stage.TransformOperation {
	case irminmodels.TransformOpFieldRename:
		*logs = append(*logs, fmt.Sprintf("  Field renames: %d mapping(s)", len(config.FieldRenames)))
		for _, r := range config.FieldRenames {
			*logs = append(*logs, fmt.Sprintf("    - %s -> %s", r.OldName, r.NewName))
		}
	case irminmodels.TransformOpFieldRemove:
		*logs = append(*logs, fmt.Sprintf("  Fields to remove: %v", config.FieldsToRemove))
	case irminmodels.TransformOpFileRename:
		*logs = append(*logs, fmt.Sprintf("  Output name: %s", config.OutputName))
	case irminmodels.TransformOpFileRemove:
		*logs = append(*logs, "  Operation: Remove file from pipeline")
	case irminmodels.TransformOpFormatConvert:
		*logs = append(*logs, fmt.Sprintf("  Output format: %s", config.OutputFormat))
	}
}

// handleEmbeddingsStage handles the execution of an embeddings stage.
func (o *Orchestrator) handleEmbeddingsStage(
	ctx context.Context,
	workflow *db.Workflow,
	stage *db.PipelineStage,
	previousStageResults map[string][]byte,
) ([]string, error) {
	var logs []string

	// Check for context cancellation
	if ctx.Err() != nil {
		return logs, fmt.Errorf("workflow execution cancelled before embeddings stage: %w", ctx.Err())
	}

	// Validate required fields
	if stage.EmbeddingsOperation == nil {
		logs = append(logs, "Embeddings operation is not set")
		return logs, errors.New("embeddings operation is not set")
	}

	if stage.EmbeddingsRepository == nil {
		logs = append(logs, "Embeddings repository is not set")
		return logs, errors.New("embeddings repository is not set")
	}

	logs = append(logs, fmt.Sprintf("Starting embeddings stage (operation: %s)", *stage.EmbeddingsOperation))

	// Route to appropriate handler based on operation type
	switch *stage.EmbeddingsOperation {
	case irminmodels.EmbeddingsOpVectorize:
		return o.handleEmbeddingsVectorize(ctx, workflow, stage, previousStageResults, logs)
	case irminmodels.EmbeddingsOpSearch:
		return o.handleEmbeddingsSearch(ctx, workflow, stage, previousStageResults, logs)
	default:
		logs = append(logs, fmt.Sprintf("Unknown embeddings operation: %s", *stage.EmbeddingsOperation))
		return logs, fmt.Errorf("unknown embeddings operation: %s", *stage.EmbeddingsOperation)
	}
}

// handleEmbeddingsVectorize creates embeddings from previous stage files.
//
//nolint:funlen,gocognit // Complex but well-structured function for embeddings vectorize workflow
func (o *Orchestrator) handleEmbeddingsVectorize(
	ctx context.Context,
	workflow *db.Workflow,
	stage *db.PipelineStage,
	previousStageResults map[string][]byte,
	logs []string,
) ([]string, error) {
	// Validate vectorize-specific fields
	if stage.EmbeddingsOutputPath == nil || *stage.EmbeddingsOutputPath == "" {
		logs = append(logs, "Embeddings output path is required for vectorize operation")
		return logs, errors.New("embeddings output path is required for vectorize operation")
	}

	if len(previousStageResults) == 0 {
		logs = append(logs, "No files from previous stage to vectorize")
		return logs, errors.New("no files from previous stage to vectorize")
	}

	// Determine branch
	var branch string
	switch {
	case stage.EmbeddingsBranch != nil && *stage.EmbeddingsBranch != "":
		branch = *stage.EmbeddingsBranch
	case stage.EmbeddingsRepository.DefaultBranch != "":
		branch = stage.EmbeddingsRepository.DefaultBranch
		logs = append(logs, fmt.Sprintf("Using default branch '%s' for embeddings", branch))
	default:
		logs = append(logs, "No branch specified and repository has no default branch")
		return logs, errors.New("no branch specified and repository has no default branch")
	}

	logs = append(logs, fmt.Sprintf("Vectorizing %d file(s) to %s@%s/%s",
		len(previousStageResults),
		stage.EmbeddingsRepository.Slug,
		branch,
		*stage.EmbeddingsOutputPath,
	))

	// Initialize embeddings client
	embeddingsClient, err := o.createEmbeddingsClient(ctx)
	if err != nil {
		logs = append(logs, fmt.Sprintf("Error creating embeddings client: %v", err))
		return logs, err
	}
	defer embeddingsClient.Close()

	// Build embedding config
	config := o.buildEmbeddingConfig(stage)
	logs = append(logs, fmt.Sprintf("Using model: %s, dimensions: %d, chunk_size: %d, overlap: %d",
		config.Model, config.Dimensions, config.ChunkSize, config.Overlap))

	// Process all files and collect embeddings
	var allRecords []embeddings.EmbeddingRecord
	for fileName, fileContent := range previousStageResults {
		// Check for context cancellation during each file
		if ctx.Err() != nil {
			logs = append(logs, fmt.Sprintf("Workflow execution cancelled during vectorization: %v", ctx.Err()))
			return logs, ctx.Err()
		}

		logs = append(logs, fmt.Sprintf("Creating embeddings from file: %s", fileName))

		result, embedErr := embeddingsClient.CreateEmbeddingsFromFile(ctx, fileContent, fileName, config)
		if embedErr != nil {
			logs = append(logs, fmt.Sprintf("Error creating embeddings from file %s: %v", fileName, embedErr))
			return logs, fmt.Errorf("error creating embeddings from file %s: %w", fileName, embedErr)
		}

		logs = append(logs, fmt.Sprintf("Created %d embedding chunks from %s", result.TotalChunks, fileName))

		// Apply stage-level metadata and priority to all records from this file
		for i := range result.Records {
			maps.Copy(result.Records[i].Metadata, stage.EmbeddingsMetadata)
			if stage.EmbeddingsPriority != nil {
				result.Records[i].Priority = float32(*stage.EmbeddingsPriority)
			}
		}

		allRecords = append(allRecords, result.Records...)
	}

	if len(stage.EmbeddingsMetadata) > 0 || stage.EmbeddingsPriority != nil {
		logs = append(logs, fmt.Sprintf("Applied stage metadata (%d keys) and priority to embedding records",
			len(stage.EmbeddingsMetadata)))
	}

	logs = append(logs, fmt.Sprintf("Total embeddings created: %d chunks", len(allRecords)))

	// Save embeddings to Parquet bytes
	parquetData, err := embeddingsClient.SaveEmbeddingsToParquetBytes(ctx, allRecords)
	if err != nil {
		logs = append(logs, fmt.Sprintf("Error saving embeddings to parquet: %v", err))
		return logs, fmt.Errorf("error saving embeddings to parquet: %w", err)
	}

	// Get source file names
	sourceFiles := make([]string, 0, len(previousStageResults))
	for fileName := range previousStageResults {
		sourceFiles = append(sourceFiles, fileName)
	}

	// Upload to LakeFS
	uploadConfig := embeddings.UploadConfig{
		RepositoryID: utils.ConstructLakeFSRepositoryName(workflow.Workspace.Slug, stage.EmbeddingsRepository.Slug),
		Branch:       branch,
		Path:         *stage.EmbeddingsOutputPath,
		SourceFiles:  sourceFiles,
		Model:        config.Model,
		Dimensions:   config.Dimensions,
		ChunkCount:   len(allRecords),
	}

	// Create embeddings client with LakeFS
	embeddingsWithLakeFS, err := o.createEmbeddingsClientWithLakeFS(ctx)
	if err != nil {
		logs = append(logs, fmt.Sprintf("Error creating embeddings client with LakeFS: %v", err))
		return logs, fmt.Errorf("error creating embeddings client with LakeFS: %w", err)
	}
	defer embeddingsWithLakeFS.Close()

	metadata, err := embeddingsWithLakeFS.UploadToLakeFS(ctx, uploadConfig, parquetData)
	if err != nil {
		logs = append(logs, fmt.Sprintf("Error uploading embeddings to LakeFS: %v", err))
		return logs, fmt.Errorf("error uploading embeddings to LakeFS: %w", err)
	}

	logs = append(logs, fmt.Sprintf("Successfully uploaded embeddings file (%d bytes) to %s",
		metadata.SizeBytes, *stage.EmbeddingsOutputPath))

	// Invalidate HTTP and DB object caches so the new file appears in listings
	if o.cacheStorage != nil {
		objectsPath := fmt.Sprintf("/api/v1/workspaces/%s/repositories/%s/objects",
			workflow.Workspace.Slug, stage.EmbeddingsRepository.Slug)
		if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(o.cacheStorage, objectsPath); invalidationErr != nil {
			o.logger.ErrorContext(
				ctx,
				"Error invalidating objects cache after embedding upload",
				"error",
				invalidationErr,
			)
		}
		embeddingsPath := fmt.Sprintf("/api/v1/workspaces/%s/repositories/%s/embeddings",
			workflow.Workspace.Slug, stage.EmbeddingsRepository.Slug)
		if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(o.cacheStorage, embeddingsPath); invalidationErr != nil {
			o.logger.ErrorContext(
				ctx,
				"Error invalidating embeddings cache after embedding upload",
				"error",
				invalidationErr,
			)
		}
	}
	if staleErr := o.db.MarkObjectCacheStale(*stage.EmbeddingsRepositoryID, branch); staleErr != nil {
		o.logger.ErrorContext(ctx, "Error marking object cache stale after embedding upload", "error", staleErr)
	}

	// Get the object from LakeFS after upload to save it to the database
	// This ensures it shows up in the repository object list even without committing
	irminObject, err := o.dataEngine.GetPath(
		workflow.Workspace.Slug,
		stage.EmbeddingsRepository.Slug,
		*stage.EmbeddingsOutputPath,
		branch,
	)
	if err != nil {
		logs = append(logs, fmt.Sprintf("Warning: Error getting uploaded object from data engine: %v", err))
		// Don't fail the stage if we can't get the object, it's already uploaded
	} else {
		// Save the object to the database in a goroutine to update the cache
		go func() {
			_, saveObjectErr := lib.SaveObject(
				o.db,
				o.logger,
				o.env,
				irminObject,
				branch,
				*stage.EmbeddingsRepositoryID,
			)
			if saveObjectErr != nil {
				o.logger.ErrorContext(ctx, "Error saving embeddings object to database", "error", saveObjectErr)
			}
		}()
		logs = append(logs, fmt.Sprintf("Saving embeddings object ('%s') to repository cache in background.", irminObject.Name))
	}

	return logs, nil
}

// handleEmbeddingsSearch searches an embedding file with a static query.
//
//nolint:gocognit,funlen // Complex but well-structured function for embeddings search workflow
func (o *Orchestrator) handleEmbeddingsSearch(
	ctx context.Context,
	workflow *db.Workflow,
	stage *db.PipelineStage,
	previousStageResults map[string][]byte,
	logs []string,
) ([]string, error) {
	// Validate search-specific fields
	if stage.EmbeddingsPath == nil || *stage.EmbeddingsPath == "" {
		logs = append(logs, "Embeddings path is required for search operation")
		return logs, errors.New("embeddings path is required for search operation")
	}

	if stage.EmbeddingsQuery == nil || *stage.EmbeddingsQuery == "" {
		logs = append(logs, "Embeddings query is required for search operation")
		return logs, errors.New("embeddings query is required for search operation")
	}

	// Determine branch
	var branch string
	switch {
	case stage.EmbeddingsBranch != nil && *stage.EmbeddingsBranch != "":
		branch = *stage.EmbeddingsBranch
	case stage.EmbeddingsRepository.DefaultBranch != "":
		branch = stage.EmbeddingsRepository.DefaultBranch
		logs = append(logs, fmt.Sprintf("Using default branch '%s' for embeddings", branch))
	default:
		logs = append(logs, "No branch specified and repository has no default branch")
		return logs, errors.New("no branch specified and repository has no default branch")
	}

	// Determine top_k
	topK := 10
	if stage.EmbeddingsTopK != nil && *stage.EmbeddingsTopK > 0 {
		topK = *stage.EmbeddingsTopK
	}

	logs = append(logs, fmt.Sprintf("Searching embeddings in %s@%s/%s with query: '%s' (top_k: %d)",
		stage.EmbeddingsRepository.Slug,
		branch,
		*stage.EmbeddingsPath,
		*stage.EmbeddingsQuery,
		topK,
	))

	// Initialize embeddings client with LakeFS
	embeddingsClient, err := o.createEmbeddingsClientWithLakeFS(ctx)
	if err != nil {
		logs = append(logs, fmt.Sprintf("Error creating embeddings client: %v", err))
		return logs, err
	}
	defer embeddingsClient.Close()

	// Download embedding file
	lakeFSRepositoryName := utils.ConstructLakeFSRepositoryName(
		workflow.Workspace.Slug,
		stage.EmbeddingsRepository.Slug,
	)
	parquetData, err := embeddingsClient.DownloadFromLakeFS(ctx, lakeFSRepositoryName, branch, *stage.EmbeddingsPath)
	if err != nil {
		logs = append(logs, fmt.Sprintf("Error downloading embedding file: %v", err))
		return logs, fmt.Errorf("error downloading embedding file: %w", err)
	}

	// Get metadata to determine model and dimensions
	objectMetadata, err := o.dataEngine.LakeFSClient.GetObjectMetadata(
		lakeFSRepositoryName,
		branch,
		*stage.EmbeddingsPath,
		true,
		false,
	)
	if err != nil {
		o.logger.WarnContext(ctx, "Error getting object metadata", "error", err)
	}

	// Extract model and dimensions from metadata
	model := embeddings.DefaultModel
	dimensions := embeddings.DefaultDimensions
	if stage.EmbeddingsModel != nil && *stage.EmbeddingsModel != "" {
		model = *stage.EmbeddingsModel
	}
	if stage.EmbeddingsDimensions != nil && *stage.EmbeddingsDimensions > 0 {
		dimensions = *stage.EmbeddingsDimensions
	}

	// Override with metadata if available
	if objectMetadata != nil && objectMetadata.Metadata != nil {
		meta := embeddings.GetEmbeddingMetadata(objectMetadata.Metadata)
		if meta.Model != "" {
			model = meta.Model
		}
		if meta.Dimensions > 0 {
			dimensions = meta.Dimensions
		}
	}

	logs = append(logs, fmt.Sprintf("Using model: %s, dimensions: %d", model, dimensions))

	// Create embedding config for query
	config := embeddings.EmbeddingConfig{
		Model:      model,
		Dimensions: dimensions,
	}

	// Create query embedding
	queryVector, err := embeddingsClient.CreateEmbeddingForQuery(ctx, *stage.EmbeddingsQuery, config)
	if err != nil {
		logs = append(logs, fmt.Sprintf("Error creating query embedding: %v", err))
		return logs, fmt.Errorf("error creating query embedding: %w", err)
	}

	// Perform search
	var results []embeddings.SearchResult
	if len(stage.EmbeddingsFilter) > 0 {
		logs = append(logs, fmt.Sprintf("Applying filter: %v", stage.EmbeddingsFilter))
		results, err = embeddingsClient.SearchWithFilterFromBytes(
			ctx,
			queryVector,
			parquetData,
			topK,
			stage.EmbeddingsFilter,
		)
		if err != nil {
			logs = append(logs, fmt.Sprintf("Error searching embeddings with filter: %v", err))
			return logs, fmt.Errorf("error searching embeddings with filter: %w", err)
		}
	} else {
		results, err = embeddingsClient.SearchSimilarFromBytes(ctx, queryVector, parquetData, topK)
		if err != nil {
			logs = append(logs, fmt.Sprintf("Error searching embeddings: %v", err))
			return logs, fmt.Errorf("error searching embeddings: %w", err)
		}
	}

	logs = append(logs, fmt.Sprintf("Found %d results", len(results)))

	// Convert results to JSON format matching EmbeddingSearchResponse
	searchResults := make([]irminmodels.EmbeddingSearchResult, len(results))
	for i, result := range results {
		searchResults[i] = irminmodels.EmbeddingSearchResult{
			ID:         result.ID,
			Content:    result.Content,
			SourceFile: result.SourceFile,
			ChunkIndex: result.ChunkIndex,
			Score:      result.Score,
			Distance:   result.Distance,
			Metadata:   result.Metadata,
		}
	}

	response := irminmodels.EmbeddingSearchResponse{
		Results: searchResults,
		Query:   *stage.EmbeddingsQuery,
		Model:   model,
		TopK:    topK,
	}

	// Convert to JSON
	jsonData, err := json.Marshal(response)
	if err != nil {
		logs = append(logs, fmt.Sprintf("Error converting results to JSON: %v", err))
		return logs, fmt.Errorf("error converting results to JSON: %w", err)
	}

	// Store in previousStageResults
	previousStageResults["search_results.json"] = jsonData
	logs = append(logs, "Search results stored as search_results.json")

	return logs, nil
}

// createEmbeddingsClient creates an embeddings client without LakeFS.
func (o *Orchestrator) createEmbeddingsClient(ctx context.Context) (*embeddings.Client, error) {
	return embeddings.NewClient(ctx, o.env, o.logger, nil)
}

// createEmbeddingsClientWithLakeFS creates an embeddings client with LakeFS access.
func (o *Orchestrator) createEmbeddingsClientWithLakeFS(ctx context.Context) (*embeddings.Client, error) {
	return embeddings.NewClient(ctx, o.env, o.logger, o.dataEngine.LakeFSClient)
}

// buildEmbeddingConfig builds an embeddings config from the pipeline stage.
func (o *Orchestrator) buildEmbeddingConfig(stage *db.PipelineStage) embeddings.EmbeddingConfig {
	config := embeddings.DefaultConfig()

	if stage.EmbeddingsModel != nil && *stage.EmbeddingsModel != "" {
		config.Model = *stage.EmbeddingsModel
	}
	if stage.EmbeddingsDimensions != nil && *stage.EmbeddingsDimensions > 0 {
		config.Dimensions = *stage.EmbeddingsDimensions
	}
	if stage.EmbeddingsChunkSize != nil && *stage.EmbeddingsChunkSize > 0 {
		config.ChunkSize = *stage.EmbeddingsChunkSize
	}
	if stage.EmbeddingsOverlap != nil {
		config.Overlap = *stage.EmbeddingsOverlap
	}

	return config
}
