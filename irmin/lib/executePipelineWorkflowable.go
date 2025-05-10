package lib

import (
	"bytes"
	"context"
	"fmt"
	sandbox "irmin-api/compute-sandbox"
	"irmin-api/db"
	"irmin-api/engine"
	"log"
	"strings"

	irminconnectorclient "github.com/IrminData/irmin-sdk-go/connector"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

func ExecutePipelineWorkflowable(
	ctx context.Context,
	workflow *db.Workflow,
	workflowable *db.PipelineWorkflowable,
	run *db.WorkflowRun,
) ([]string, error) {
	var logs []string

	// Initialize Data Engine client
	dataEngine := engine.NewClient("en")

	// Store the results of the previously executed stage
	// This is a byte array map where the key is the result file name and the value is the file content
	previousStageResults := make(map[string][]byte)

	// Execute each stage in the pipeline
	for key, stage := range workflowable.Stages {
		logs = append(logs, fmt.Sprintf("Executing stage %d", key))

		switch stage.Type {
		case db.PipelineStageTypeAction:
			// If required, pass the previous stage results to the action workflowable on execution when the sandbox supports it
			var computeInputFiles map[string][]byte
			if stage.Write {
				computeInputFiles = previousStageResults
			}

			// Run the executable file in the compute sandbox
			computeResult, err := sandbox.ExecuteEditorItem(
				ctx,
				computeInputFiles,
				workflow.Owner,
				*stage.Executable,
				workflow.Workspace.Slug,
			)
			if err != nil {
				logs = append(logs, "Failed to execute workflowable in compute sandbox.")
			}

			// Append the logs from the compute result to the workflow run logs
			logs = append(logs, computeResult.Logs)

			if stage.Read {
				// Set the results of the previous stage to the compute result
				previousStageResults = computeResult.ResultFiles
			}

		case db.PipelineStageTypeConnection:

			// Fetch the connection and it's connector information
			connection, err := db.GetConnectionByID(*stage.ConnectionID)
			if err != nil {
				log.Printf("Error getting connection: %v", err)
				logs = append(logs, fmt.Sprintf("Error getting connection: %v", err))
				continue
			}

			// Create connector client instance.
			connectorClient := irminconnectorclient.NewClient(
				connection.Connector.APIBaseURL,
				connection.Connector.SystemToken,
				"en",
			)

			// Initialize operation with the connector
			op, err := connectorClient.InitOperation(connection.Details, connection.Settings)
			if err != nil {
				log.Printf("Error initializing operation: %v", err)
				logs = append(logs, fmt.Sprintf("Error initializing operation: %v", err))
				continue
			}

			// Create connector operation client
			connectorOpClient := irminconnectorclient.NewClient(connection.Connector.APIBaseURL, op.Token, "en")

			if stage.Write {
				// Upload the previous stage results to the connection

				// Loop through the results and save them to the connection
				for fileName, fileContent := range previousStageResults {
					// Construct the path to save the file to
					filePath := strings.Trim(*stage.ConnectionWritePath, "/")
					filePath = strings.Trim(filePath, fileName)
					filePath = fmt.Sprintf("%s/%s", filePath, fileName)
					// Push the file to the connector
					_, err := connectorOpClient.OperationPush(filePath, irminconnectorclient.FormFile{
						Reader: bytes.NewBuffer(fileContent),
					})
					if err != nil {
						log.Printf("Error pushing file to connector: %v", err)
						logs = append(logs, fmt.Sprintf("Error pushing file to connector: %v", err))
						continue
					}
					logs = append(logs, fmt.Sprintf("Result object ('%s') saved to connection.", fileName))
				}
			}

			if stage.Read {
				// Read the files from the connection and set them to the previous stage results

				// Pull the files from the connector
				connectionFiles, err := connectorOpClient.OperationPull(*stage.ConnectionReadPath)
				if err != nil {
					log.Printf("Error pulling object from connector: %v", err)
					logs = append(logs, fmt.Sprintf("Error pulling object from connector: %v", err))
					continue
				}

				// Loop through the files and set them to the previous stage results
				for _, file := range connectionFiles {
					// Append the content to the previous stage results
					previousStageResults[file.Filename] = file.Content
					logs = append(
						logs,
						fmt.Sprintf("Object's ('%s') content retrieved from connection.", file.Filename),
					)
				}
			}

			// Close the operation
			err = connectorClient.CancelOperation(int(op.ID))
			if err != nil {
				log.Printf("Error closing operation: %v", err)
				logs = append(logs, fmt.Sprintf("Error closing connector operation: %v", err))
				continue
			}

		case db.PipelineStageTypeRepository:

			if stage.Write {
				// Upload the previous stage results to the repository

				// Loop thorugh the results and save them to the repository
				for fileName, fileContent := range previousStageResults {
					// Create multipart file from the byte array
					file := bytes.NewReader(fileContent)
					// Construct the path to save the file
					uploadObjectToPath := strings.Trim(*stage.RepositoryPath, "/") + "/" + fileName
					// Upload the object to the path in the repository at ref
					_, err := dataEngine.UploadObject(
						workflow.Workspace.Slug,
						stage.Repository.Slug,
						uploadObjectToPath,
						*stage.RepositoryBranch,
						file,
					)
					if err != nil {
						log.Printf("Error uploading object to Data Engine: %v", err)
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
					logs = append(logs, fmt.Sprintf("Result object ('%s') saved to repository.", fileName))
				}
			}

			if stage.Read {
				// Read the files from the repository and set them to the previous stage results

				irminObject, err := dataEngine.GetPath(
					workflow.Workspace.Slug,
					stage.Repository.Slug,
					*stage.RepositoryPath,
					*stage.RepositoryBranch,
				)
				if err != nil {
					log.Printf("Error getting object from Data Engine: %v", err)
					logs = append(logs, fmt.Sprintf("Error getting object from Data Engine: %v", err))
					continue
				}
				logs = append(logs, fmt.Sprintf("Object ('%s') retrieved from repository.", irminObject.Name))

				if irminObject.Type == irminmodels.ObjectTypeGroup {
					// Read the content of every child object
					for _, child := range irminObject.Children {
						content, err := dataEngine.GetObjectContent(
							workflow.Workspace.Slug,
							stage.Repository.Slug,
							child.Path,
							*stage.RepositoryBranch,
						)
						if err != nil {
							log.Printf("Error getting object from Data Engine: %v", err)
							logs = append(logs, fmt.Sprintf("Error getting object from Data Engine: %v", err))
							continue
						}
						logs = append(
							logs,
							fmt.Sprintf("Object's ('%s') content retrieved from repository.", child.Name),
						)
						// Append the content to the previous stage results
						previousStageResults[child.Name] = content
					}
				} else {
					// Read the content of the object
					content, err := dataEngine.GetObjectContent(workflow.Workspace.Slug, stage.Repository.Slug, *stage.RepositoryPath, *stage.RepositoryBranch)
					if err != nil {
						log.Printf("Error getting object from Data Engine: %v", err)
						logs = append(logs, fmt.Sprintf("Error getting object from Data Engine: %v", err))
						continue
					}
					logs = append(logs, fmt.Sprintf("Object's ('%s') content retrieved from repository.", irminObject.Name))
					// Append the content to the previous stage results
					previousStageResults[irminObject.Name] = content
				}
			}

		default:
			logs = append(logs, fmt.Sprintf("Unknown stage type: %s", stage.Type))
		}
	}

	return logs, nil
}
