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
)

// executeActionWorkflowable executes an action workflowable in the compute sandbox.
// It runs the executable file in the compute sandbox and saves the results to the repository if specified.
// It returns the logs generated during the execution and any error encountered.
func ExecuteActionWorkflowable(ctx context.Context, workflow *db.Workflow, workflowable *db.ActionWorkflowable, run *db.WorkflowRun) ([]string, error) {
	var logs []string

	// Run the executable file in the compute sandbox
	computeResult, err := sandbox.ExecuteEditorItem(ctx, workflow.Owner, workflowable.Executable, workflow.Workspace.Slug)
	if err != nil {
		log.Println("Failed to execute workflowable:", err)
		logs = append(logs, "Failed to execute workflowable in compute sandbox.")
		return logs, err
	}

	// Append the logs from the compute result to the workflow run logs
	logs = append(logs, computeResult.Logs)

	// Check if the results need to be saved
	if workflowable.Repository != nil {
		// Initialize Data Engine client
		dataEngine := engine.NewClient("en")

		// Loop thorugh the results and save them to the repository
		for fileName, fileContent := range computeResult.ResultFiles {
			// Create multipart file from the byte array
			file := bytes.NewReader(fileContent)
			// Construct the path to save the file
			uploadObjectToPath := strings.Trim(*workflowable.Path, "/") + "/" + fileName
			// Upload the object to the path in the repository at ref
			_, err := dataEngine.UploadObject(workflow.Workspace.Slug, workflowable.Repository.Slug, uploadObjectToPath, *workflowable.Branch, file)
			if err != nil {
				log.Printf("Error uploading object to Data Engine: %v", err)
				logs = append(logs, fmt.Sprintf("Error saving result object ('%s') to %s@%s/%s.", fileName, workflowable.Repository.Slug, *workflowable.Branch, uploadObjectToPath))
				continue
			}
			logs = append(logs, fmt.Sprintf("Result object ('%s') saved to repository.", fileName))
		}
	}

	return logs, nil
}
