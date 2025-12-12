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
	"strings"

	sandbox "irmin-api/compute-sandbox"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
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
			logs = append(logs, fmt.Sprintf("Workflow execution cancelled before stage %d: %v", key, ctx.Err()))
			return logs, ctx.Err()
		}

		logs = append(logs, fmt.Sprintf("Executing stage %d", key))

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
			logs = append(logs, fmt.Sprintf("Error executing stage: %v", errResult))
			continue
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

		queryResult := o.dataEngine.ExecuteQuery(ctx, &workflow.Owner, &workflow.Workspace, stage.Query.SQL)

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
	stage *db.PipelineStage,
	previousStageResults map[string][]byte,
) ([]string, error) {
	var logs []string

	if stage.Write {
		// Upload the previous stage results to the repository
		for fileName, fileContent := range previousStageResults {
			// Check for context cancellation during each file upload
			if ctx.Err() != nil {
				return logs, fmt.Errorf("workflow execution cancelled during repository write: %w", ctx.Err())
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
				*stage.RepositoryBranch,
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
						*stage.RepositoryBranch,
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
					*stage.RepositoryBranch,
					*stage.RepositoryID,
				)
				if saveObjectErr != nil {
					o.logger.ErrorContext(ctx, "Error saving object to database", "error", saveObjectErr)
				}
			}()
			logs = append(logs, fmt.Sprintf("Result object ('%s') saved to repository.", fileName))
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
func convertQueryDataToCSV(data []map[string]interface{}, columns []string) ([]byte, error) {
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
