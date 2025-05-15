package lib

import (
	"bytes"
	"context"
	"fmt"
	sandbox "irmin-api/compute-sandbox"
	"irmin-api/db"
	"irmin-api/engine"
	"log"
	"slices"
	"strings"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

func ExecutePipelineWorkflowable(
	ctx context.Context,
	d *db.Database,
	workflow *db.Workflow,
	workflowable *db.PipelineWorkflowable,
) ([]string, error) {
	var logs []string

	// Check for context cancellation before starting
	if ctx.Err() != nil {
		logs = append(logs, fmt.Sprintf("Workflow execution cancelled before starting: %v", ctx.Err()))
		return logs, ctx.Err()
	}

	// Initialize Data Engine client
	dataEngine := engine.NewClient("en")

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

		switch stage.Type {
		case db.PipelineStageTypeAction:
			// If required, pass the previous stage results to the action workflowable on execution when the sandbox supports it
			var computeInputFiles map[string][]byte
			if stage.Write {
				computeInputFiles = previousStageResults
			}

			// Trim leading slashes from the executable
			executable := strings.TrimLeft(*stage.Executable, "/")

			// Run the executable file in the compute sandbox
			computeResult, err := sandbox.ExecuteEditorItem(
				ctx,
				d,
				computeInputFiles,
				workflow.Owner,
				executable,
				workflow.Workspace.Slug,
			)
			if err != nil {
				if ctx.Err() != nil {
					// If cancelled, append cancellation message but keep all logs
					logs = append(logs, computeResult.Logs)
					logs = append(
						logs,
						fmt.Sprintf(
							"Workflow execution cancelled during stage %d compute execution: %v",
							key,
							ctx.Err(),
						),
					)
					return logs, ctx.Err()
				}
				logs = append(logs, "Failed to execute workflowable in compute sandbox.")
			}

			// Append the logs from the compute result to the workflow run logs
			logs = append(logs, computeResult.Logs)

			if stage.Read {
				// Set the results of the previous stage to the compute result
				previousStageResults = computeResult.ResultFiles
			}

		case db.PipelineStageTypeConnection:
			// Check for context cancellation before connection operations
			if ctx.Err() != nil {
				logs = append(
					logs,
					fmt.Sprintf(
						"Workflow execution cancelled before stage %d connection operations: %v",
						key,
						ctx.Err(),
					),
				)
				return logs, ctx.Err()
			}

			// Fetch the connection and it's connector information
			connection, err := d.GetConnectionByID(*stage.ConnectionID)
			if err != nil {
				log.Printf("Error getting connection: %v", err)
				logs = append(logs, fmt.Sprintf("Error getting connection: %v", err))
				continue
			}

			if stage.Write {
				// Upload the previous stage results to the connection
				connectionPath := strings.TrimLeft(*stage.ConnectionWritePath, "/")
				pushedPaths, pushErr := dataEngine.PushFilesToConnector(
					connection,
					connectionPath,
					nil,
					previousStageResults,
				)
				if pushErr != nil {
					if ctx.Err() != nil {
						// If cancelled, collect any logs from the push operation
						for _, pushedPath := range pushedPaths {
							logs = append(logs, fmt.Sprintf("Object ('%s') pushed to connector.", pushedPath))
						}
						logs = append(
							logs,
							fmt.Sprintf(
								"Workflow execution cancelled during stage %d connection write: %v",
								key,
								ctx.Err(),
							),
						)
						return logs, ctx.Err()
					}
					log.Printf("Error pushing files to connector: %v", pushErr)
					logs = append(logs, fmt.Sprintf("Error pushing files to connector: %v", pushErr))
					continue
				}
				for _, pushedPath := range pushedPaths {
					logs = append(logs, fmt.Sprintf("Object ('%s') pushed to connector.", pushedPath))
				}
			}

			if stage.Read {
				// Check for context cancellation before reading from connection
				if ctx.Err() != nil {
					logs = append(
						logs,
						fmt.Sprintf("Workflow execution cancelled before stage %d connection read: %v", key, ctx.Err()),
					)
					return logs, ctx.Err()
				}

				// Pull the files from the connector
				connectionPath := strings.TrimLeft(*stage.ConnectionReadPath, "/")
				pulledPaths, pullErr := dataEngine.PullFilesFromConnector(connection, connectionPath)
				if pullErr != nil {
					if ctx.Err() != nil {
						// If cancelled, collect any logs from the pull operation
						for fileName := range pulledPaths {
							logs = append(logs, fmt.Sprintf("Object ('%s') retrieved from connection.", fileName))
						}
						logs = append(
							logs,
							fmt.Sprintf(
								"Workflow execution cancelled during stage %d connection read: %v",
								key,
								ctx.Err(),
							),
						)
						return logs, ctx.Err()
					}
					log.Printf("Error pulling files from connector: %v", pullErr)
					logs = append(logs, fmt.Sprintf("Error pulling files from connector: %v", pullErr))
					continue
				}

				// Loop through the files and set them to the previous stage results
				for fileName, fileContent := range pulledPaths {
					// Append the content to the previous stage results
					previousStageResults[fileName] = fileContent
					logs = append(logs, fmt.Sprintf("Object ('%s') retrieved from connection.", fileName))
				}
			}

		case db.PipelineStageTypeRepository:
			// Check for context cancellation before repository operations
			if ctx.Err() != nil {
				logs = append(
					logs,
					fmt.Sprintf(
						"Workflow execution cancelled before stage %d repository operations: %v",
						key,
						ctx.Err(),
					),
				)
				return logs, ctx.Err()
			}

			if stage.Write {
				// Upload the previous stage results to the repository
				for fileName, fileContent := range previousStageResults {
					// Check for context cancellation during each file upload
					if ctx.Err() != nil {
						logs = append(
							logs,
							fmt.Sprintf(
								"Workflow execution cancelled during stage %d repository write: %v",
								key,
								ctx.Err(),
							),
						)
						return logs, ctx.Err()
					}

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
				// Check for context cancellation before reading from repository
				if ctx.Err() != nil {
					logs = append(
						logs,
						fmt.Sprintf("Workflow execution cancelled before stage %d repository read: %v", key, ctx.Err()),
					)
					return logs, ctx.Err()
				}

				// Read the files from the repository and set them to the previous stage results
				irminObject, err := dataEngine.GetPath(
					workflow.Workspace.Slug,
					stage.Repository.Slug,
					*stage.RepositoryPath,
					*stage.RepositoryBranch,
				)
				if err != nil {
					if ctx.Err() != nil {
						logs = append(
							logs,
							fmt.Sprintf(
								"Workflow execution cancelled during stage %d repository read: %v",
								key,
								ctx.Err(),
							),
						)
						return logs, ctx.Err()
					}
					log.Printf("Error getting object from Data Engine: %v", err)
					logs = append(logs, fmt.Sprintf("Error getting object from Data Engine: %v", err))
					continue
				}
				logs = append(logs, fmt.Sprintf("Object ('%s') retrieved from repository.", irminObject.Name))

				if irminObject.Type == irminmodels.ObjectTypeGroup {
					// Read the content of every child object
					for _, child := range irminObject.Children {
						// Check for context cancellation during each child object read
						if ctx.Err() != nil {
							logs = append(
								logs,
								fmt.Sprintf(
									"Workflow execution cancelled during stage %d repository child read: %v",
									key,
									ctx.Err(),
								),
							)
							return logs, ctx.Err()
						}

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
					content, err := dataEngine.GetObjectContent(
						workflow.Workspace.Slug,
						stage.Repository.Slug,
						*stage.RepositoryPath,
						*stage.RepositoryBranch,
					)
					if err != nil {
						if ctx.Err() != nil {
							logs = append(logs, fmt.Sprintf("Workflow execution cancelled during stage %d repository object read: %v", key, ctx.Err()))
							return logs, ctx.Err()
						}
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
