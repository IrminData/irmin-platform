package examples

import (
	"fmt"

	"github.com/IrminData/irmin-sdk-go/client"
	"github.com/IrminData/irmin-sdk-go/models"
	"github.com/IrminData/irmin-sdk-go/services"
)

func TestWorkflows(exampleConnectionID, baseURL, apiToken, locale string) {
	// Initialise the client and service
	apiClient := client.NewClient(baseURL, apiToken, locale)
	workflowService := services.NewWorkflowService(apiClient)

	// Create example of a workflow schedule
	maxRetries := 3
	maxRuntime := 300
	minInterval := 60
	schedule := models.WorkflowSchedule{
		Triggers:    []models.WorkflowTrigger{},
		MaxRetries:  &maxRetries,
		MaxRuntime:  &maxRuntime,
		MinInterval: &minInterval,
	}

	// Create action workflow
	actionWorkflow, res, err := workflowService.CreateActionWorkflow(
		"/test.js",
		"test-repository",
		"main",
		"/",
		"Test action",
		"Example action workflow for testing",
		"",
		&schedule,
	)
	if err != nil {
		fmt.Println("Error creating action workflow:", err)
		return
	}
	fmt.Println(res.Message)

	// Create import workflow
	importWorkflow, res, err := workflowService.CreateImportWorkflow(
		exampleConnectionID,
		"test-repository",
		"main",
		"/",
		"Test import",
		"Example import workflow for testing",
		"",
		&schedule,
	)
	if err != nil {
		fmt.Println("Error creating import workflow:", err)
		return
	}
	fmt.Println(res.Message)

	// Create export workflow
	exportWorkflow, res, err := workflowService.CreateExportWorkflow(
		exampleConnectionID,
		"test-repository",
		"/",
		"main",
		false,
		"Test export",
		"Example export workflow for testing",
		"",
		&schedule,
	)
	if err != nil {
		fmt.Println("Error creating export workflow:", err)
		return
	}
	fmt.Println(res.Message)

	// Create pipeline workflow
	pipelineWorkflow, res, err := workflowService.CreatePipelineWorkflow(
		[]models.PipelineStage{
			&models.PipelineStageAction{
				Type:       "action",
				Executable: "/test.js",
				CommonProperties: models.CommonProperties{
					Description: "First stage in the pipeline",
					Write:       true,
					Read:        true,
				},
			},
			&models.PipelineStageRepository{
				Type: "repository",
				Repository: models.Repository{
					Slug: "test-repository",
				},
				Branch: "main",
				Path:   "/",
				CommonProperties: models.CommonProperties{
					Description: "Second stage in the pipeline",
					Write:       true,
					Read:        true,
				},
			},
		},
		false,
		"Test pipeline",
		"Example pipeline workflow for testing",
		"",
		&schedule,
	)
	if err != nil {
		fmt.Println("Error creating pipeline workflow:", err)
		return
	}
	fmt.Println(res.Message)

	// Fetch workflows
	workflows, _, err := workflowService.FetchWorkflows()
	if err != nil {
		fmt.Println("Error fetching workflows:", err)
		return
	}
	for _, workflow := range workflows {
		fmt.Printf("Workflow: %s (%s)\n", workflow.Name, workflow.Type)
	}

	// Update the description of the action workflow
	actionWorkflow, res, err = workflowService.UpdateWorkflow(actionWorkflow.ID, actionWorkflow.Name, "Updated action workflow description", "", &schedule)
	if err != nil {
		fmt.Println("Error updating action workflow:", err)
		return
	}
	fmt.Println(res.Message)

	// Trigger execution of the action workflow
	res, err = workflowService.TriggerWorkflowRun(actionWorkflow.ID)
	if err != nil {
		fmt.Println("Error triggering action workflow run:", err)
		return
	}
	fmt.Println(res.Message)

	// Delete the created workflows
	res, err = workflowService.DeleteWorkflow(actionWorkflow.ID)
	if err != nil {
		fmt.Println("Error deleting action workflow:", err)
		return
	}
	fmt.Println(res.Message)

	res, err = workflowService.DeleteWorkflow(importWorkflow.ID)
	if err != nil {
		fmt.Println("Error deleting import workflow:", err)
		return
	}
	fmt.Println(res.Message)

	res, err = workflowService.DeleteWorkflow(exportWorkflow.ID)
	if err != nil {
		fmt.Println("Error deleting export workflow:", err)
		return
	}
	fmt.Println(res.Message)

	res, err = workflowService.DeleteWorkflow(pipelineWorkflow.ID)
	if err != nil {
		fmt.Println("Error deleting pipeline workflow:", err)
		return
	}
	fmt.Println(res.Message)
}
