package scenarios

import (
	"context"
	"fmt"

	irmincore "github.com/IrminData/irmin-platform/sdks/go/api"
	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"

	"github.com/IrminData/irmin-e2e-tests/config"
	"github.com/IrminData/irmin-e2e-tests/runner"
)

// WorkflowScenarios returns test cases for workflow operations.
func WorkflowScenarios() []runner.TestCase {
	return []runner.TestCase{
		{
			Name:        "Workflow_Action_Lifecycle",
			Description: "Create, list, get, update, and delete an action workflow",
			Run:         testActionWorkflowLifecycle,
		},
		{
			Name:        "Workflow_Import_Lifecycle",
			Description: "Create and manage an import workflow (requires connection)",
			Run:         testImportWorkflowLifecycle,
		},
		{
			Name:        "Workflow_Export_Lifecycle",
			Description: "Create and manage an export workflow (requires connection)",
			Run:         testExportWorkflowLifecycle,
		},
		{
			Name:        "Workflow_Pipeline_Lifecycle",
			Description: "Create and manage a pipeline workflow with multiple stages",
			Run:         testPipelineWorkflowLifecycle,
		},
		{
			Name:        "Workflow_Pause_Start",
			Description: "Create a workflow, pause it, then start it",
			Run:         testWorkflowPauseStart,
		},
		{
			Name:        "Workflow_List_By_Type",
			Description: "List workflows filtered by type",
			Run:         testWorkflowListByType,
		},
		{
			Name:        "Workflow_Update_Schedule",
			Description: "Create workflow and update its schedule",
			Run:         testWorkflowUpdateSchedule,
		},
		{
			Name:        "Workflow_Update_Workflowable",
			Description: "Create workflow and update its workflowable configuration",
			Run:         testWorkflowUpdateWorkflowable,
		},
	}
}

func testActionWorkflowLifecycle(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	// First create a repository and script for the action workflow
	repoName := fmt.Sprintf("e2e-workflow-repo-%d", randomSuffix())
	repo, _, err := client.CreateRepository(ctx, cfg.Workspace, irmincore.CreateRepositoryRequest{
		Name:          repoName,
		Description:   "Repository for workflow E2E test",
		DefaultBranch: "main",
	})
	if err != nil {
		return fmt.Errorf("failed to create repository: %w", err)
	}

	defer func() {
		if cfg.CleanupAfterTests {
			_, _ = client.DeleteRepository(ctx, cfg.Workspace, repo.Slug)
		}
	}()

	// Create a script for the action workflow
	scriptName := fmt.Sprintf("e2e-workflow-script-%d.py", randomSuffix())
	description := "Script for workflow test"
	content := `print("Hello from workflow action")`
	language := "py"

	script, _, err := client.CreateStoredScript(ctx, cfg.Workspace, irmincore.CreateScriptRequest{
		Name:        scriptName,
		Description: &description,
		Content:     &content,
		Language:    &language,
	})
	if err != nil {
		return fmt.Errorf("failed to create script: %w", err)
	}

	defer func() {
		if cfg.CleanupAfterTests {
			_, _ = client.DeleteStoredScript(ctx, cfg.Workspace, script.ID)
		}
	}()

	// Create an action workflow
	workflowName := fmt.Sprintf("e2e-action-workflow-%d", randomSuffix())
	scriptID := script.ID
	resultsPath := defaultResultsPath
	resultsBranch := defaultResultsBranch

	workflow, _, err := client.CreateWorkflow(ctx, cfg.Workspace, irmincore.WorkflowRequest{
		Type:        irminmodels.WorkflowableTypeAction,
		Name:        workflowName,
		Description: "E2E test action workflow",
		Workflowable: irminmodels.Workflowable{
			Type:                    irminmodels.WorkflowableTypeAction,
			ExecutableType:          irminmodels.ActionExecutableTypeScript,
			ScriptID:                &scriptID,
			Repository:              repo.Slug,
			RepositoryBranch:        defaultResultsBranch,
			ResultsRepositoryPath:   &resultsPath,
			ResultsRepositoryBranch: &resultsBranch,
		},
		Schedule: irminmodels.Schedule{
			Triggers: []irminmodels.ScheduleTrigger{}, // Empty triggers = manual
		},
	})
	if err != nil {
		return fmt.Errorf("failed to create workflow: %w", err)
	}

	defer func() {
		if cfg.CleanupAfterTests {
			_, _ = client.DeleteWorkflow(ctx, cfg.Workspace, workflow.ID)
		}
	}()

	// Verify workflow was created
	if workflow.ID == "" {
		return fmt.Errorf("workflow ID is empty")
	}

	// List workflows and verify
	workflows, _, err := client.ListWorkflows(ctx, cfg.Workspace)
	if err != nil {
		return fmt.Errorf("failed to list workflows: %w", err)
	}

	found := false
	for _, w := range workflows {
		if w.ID == workflow.ID {
			found = true
			break
		}
	}
	if !found {
		return fmt.Errorf("created workflow not found in list")
	}

	// Get workflow details
	fetchedWorkflow, _, err := client.GetWorkflow(ctx, cfg.Workspace, workflow.ID)
	if err != nil {
		return fmt.Errorf("failed to get workflow: %w", err)
	}

	if fetchedWorkflow.Name != workflowName {
		return fmt.Errorf("workflow name mismatch: expected %q, got %q", workflowName, fetchedWorkflow.Name)
	}

	// Update workflow
	updatedName := fmt.Sprintf("e2e-updated-workflow-%d", randomSuffix())
	_, _, err = client.UpdateWorkflow(ctx, cfg.Workspace, workflow.ID, irmincore.UpdateWorkflowRequest{
		Name: &updatedName,
	})
	if err != nil {
		return fmt.Errorf("failed to update workflow: %w", err)
	}

	// Verify update
	updatedWorkflow, _, err := client.GetWorkflow(ctx, cfg.Workspace, workflow.ID)
	if err != nil {
		return fmt.Errorf("failed to get updated workflow: %w", err)
	}

	if updatedWorkflow.Name != updatedName {
		return fmt.Errorf("workflow name not updated: expected %q, got %q", updatedName, updatedWorkflow.Name)
	}

	return nil
}

func testImportWorkflowLifecycle(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	if cfg.TestConnection == "" {
		// No test connection configured, skip
		return nil
	}

	suffix := randomSuffix()

	// Create an import workflow
	workflowName := fmt.Sprintf("e2e-import-workflow-%d", suffix)

	workflow, _, err := client.CreateWorkflow(ctx, cfg.Workspace, irmincore.WorkflowRequest{
		Type:        irminmodels.WorkflowableTypeImport,
		Name:        workflowName,
		Description: "E2E test import workflow",
		Workflowable: irminmodels.Workflowable{
			Type:                      irminmodels.WorkflowableTypeImport,
			ConnectionID:              cfg.TestConnection,
			Repository:                cfg.TestRepository,
			RepositoryBranch:          "main",
			ImportFromConnectionPaths: []string{"/"},
			ImportToRepositoryPath:    fmt.Sprintf("imports/import-test-%d", suffix),
			FieldMappings:             []irminmodels.FieldMapping{},
		},
		Schedule: irminmodels.Schedule{
			Triggers: []irminmodels.ScheduleTrigger{},
		},
	})
	if err != nil {
		return fmt.Errorf("failed to create import workflow: %w", err)
	}

	defer func() {
		if cfg.CleanupAfterTests {
			_, _ = client.DeleteWorkflow(ctx, cfg.Workspace, workflow.ID)
		}
	}()

	// Verify workflow was created
	if workflow.ID == "" {
		return fmt.Errorf("import workflow ID is empty")
	}

	if workflow.Type != irminmodels.WorkflowableTypeImport {
		return fmt.Errorf("workflow type mismatch: expected %q, got %q",
			irminmodels.WorkflowableTypeImport, workflow.Type)
	}

	// Get workflow details
	fetchedWorkflow, _, err := client.GetWorkflow(ctx, cfg.Workspace, workflow.ID)
	if err != nil {
		return fmt.Errorf("failed to get import workflow: %w", err)
	}

	if fetchedWorkflow.Name != workflowName {
		return fmt.Errorf("import workflow name mismatch: expected %q, got %q",
			workflowName, fetchedWorkflow.Name)
	}

	return nil
}

func testExportWorkflowLifecycle(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	if cfg.TestConnection == "" {
		// No test connection configured, skip
		return nil
	}

	suffix := randomSuffix()
	basePath := fmt.Sprintf("export-test-%d", suffix)

	// First upload a file to export
	files := map[string][]byte{
		"data.csv": []byte("id,name,value\n1,test,100\n"),
	}
	_, _, err := client.UploadObject(
		ctx, cfg.Workspace, cfg.TestRepository, "main",
		fmt.Sprintf("%s/data.csv", basePath), files,
	)
	if err != nil {
		return fmt.Errorf("failed to upload file for export: %w", err)
	}

	_, _, err = client.CreateCommit(ctx, cfg.Workspace, cfg.TestRepository, irmincore.CreateCommitRequest{
		Branch:  "main",
		Message: fmt.Sprintf("Add data for export test %d", suffix),
	})
	if err != nil {
		return fmt.Errorf("failed to commit file for export: %w", err)
	}

	// Create an export workflow
	workflowName := fmt.Sprintf("e2e-export-workflow-%d", suffix)

	workflow, _, err := client.CreateWorkflow(ctx, cfg.Workspace, irmincore.WorkflowRequest{
		Type:        irminmodels.WorkflowableTypeExport,
		Name:        workflowName,
		Description: "E2E test export workflow",
		Workflowable: irminmodels.Workflowable{
			Type:                      irminmodels.WorkflowableTypeExport,
			ConnectionID:              cfg.TestConnection,
			Repository:                cfg.TestRepository,
			RepositoryBranch:          "main",
			ExportFromRepositoryPaths: []string{fmt.Sprintf("%s/data.csv", basePath)},
			ExportToConnectionPath:    "/exports",
			FieldMappings:             []irminmodels.FieldMapping{},
		},
		Schedule: irminmodels.Schedule{
			Triggers: []irminmodels.ScheduleTrigger{},
		},
	})
	if err != nil {
		return fmt.Errorf("failed to create export workflow: %w", err)
	}

	defer func() {
		if cfg.CleanupAfterTests {
			_, _ = client.DeleteWorkflow(ctx, cfg.Workspace, workflow.ID)
		}
	}()

	// Verify workflow was created
	if workflow.ID == "" {
		return fmt.Errorf("export workflow ID is empty")
	}

	if workflow.Type != irminmodels.WorkflowableTypeExport {
		return fmt.Errorf("workflow type mismatch: expected %q, got %q",
			irminmodels.WorkflowableTypeExport, workflow.Type)
	}

	// Get workflow details
	fetchedWorkflow, _, err := client.GetWorkflow(ctx, cfg.Workspace, workflow.ID)
	if err != nil {
		return fmt.Errorf("failed to get export workflow: %w", err)
	}

	if fetchedWorkflow.Name != workflowName {
		return fmt.Errorf("export workflow name mismatch: expected %q, got %q",
			workflowName, fetchedWorkflow.Name)
	}

	return nil
}

func testPipelineWorkflowLifecycle(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	suffix := randomSuffix()

	// Create a script for the pipeline action stage
	scriptName := fmt.Sprintf("e2e-pipeline-script-%d.py", suffix)
	description := "Script for pipeline test"
	content := `print("Pipeline stage executed")`
	language := "py"

	script, _, err := client.CreateStoredScript(ctx, cfg.Workspace, irmincore.CreateScriptRequest{
		Name:        scriptName,
		Description: &description,
		Content:     &content,
		Language:    &language,
	})
	if err != nil {
		return fmt.Errorf("failed to create script for pipeline: %w", err)
	}

	defer func() {
		if cfg.CleanupAfterTests {
			_, _ = client.DeleteStoredScript(ctx, cfg.Workspace, script.ID)
		}
	}()

	// Create a pipeline workflow with multiple stages
	workflowName := fmt.Sprintf("e2e-pipeline-workflow-%d", suffix)
	scriptID := script.ID
	repoReadPath := "/"

	workflow, _, err := client.CreateWorkflow(ctx, cfg.Workspace, irmincore.WorkflowRequest{
		Type:        irminmodels.WorkflowableTypePipeline,
		Name:        workflowName,
		Description: "E2E test pipeline workflow",
		Workflowable: irminmodels.Workflowable{
			Type: irminmodels.WorkflowableTypePipeline,
			Stages: []irminmodels.PipelineStage{
				{
					Description:         "Read data from repository",
					Type:                irminmodels.PipelineStageTypeRepository,
					OrderSequence:       1,
					Read:                true,
					Write:               false,
					Repository:          &cfg.TestRepository,
					RepositoryBranch:    strPtr("main"),
					RepositoryReadPaths: &[]string{repoReadPath},
				},
				{
					Description:    "Execute script",
					Type:           irminmodels.PipelineStageTypeAction,
					OrderSequence:  2,
					Read:           false, // Last stage cannot be readable
					Write:          true,
					ExecutableType: irminmodels.ActionExecutableTypeScript,
					ScriptID:       &scriptID,
				},
			},
		},
		Schedule: irminmodels.Schedule{
			Triggers: []irminmodels.ScheduleTrigger{},
		},
	})
	if err != nil {
		return fmt.Errorf("failed to create pipeline workflow: %w", err)
	}

	defer func() {
		if cfg.CleanupAfterTests {
			_, _ = client.DeleteWorkflow(ctx, cfg.Workspace, workflow.ID)
		}
	}()

	// Verify workflow was created
	if workflow.ID == "" {
		return fmt.Errorf("pipeline workflow ID is empty")
	}

	if workflow.Type != irminmodels.WorkflowableTypePipeline {
		return fmt.Errorf("workflow type mismatch: expected %q, got %q",
			irminmodels.WorkflowableTypePipeline, workflow.Type)
	}

	// Get workflow details
	fetchedWorkflow, _, err := client.GetWorkflow(ctx, cfg.Workspace, workflow.ID)
	if err != nil {
		return fmt.Errorf("failed to get pipeline workflow: %w", err)
	}

	if fetchedWorkflow.Name != workflowName {
		return fmt.Errorf("pipeline workflow name mismatch: expected %q, got %q",
			workflowName, fetchedWorkflow.Name)
	}

	// Verify stages were created
	if fetchedWorkflow.Workflowable == nil || len(fetchedWorkflow.Workflowable.Stages) != 2 {
		return fmt.Errorf("expected 2 pipeline stages, got %d",
			len(fetchedWorkflow.Workflowable.Stages))
	}

	return nil
}

// strPtr returns a pointer to the given string.
func strPtr(s string) *string {
	return &s
}

func testWorkflowPauseStart(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	// Create repository and script
	repoName := fmt.Sprintf("e2e-pause-repo-%d", randomSuffix())
	repo, _, err := client.CreateRepository(ctx, cfg.Workspace, irmincore.CreateRepositoryRequest{
		Name:          repoName,
		Description:   "Repository for pause/start test",
		DefaultBranch: "main",
	})
	if err != nil {
		return fmt.Errorf("failed to create repository: %w", err)
	}

	defer func() {
		if cfg.CleanupAfterTests {
			_, _ = client.DeleteRepository(ctx, cfg.Workspace, repo.Slug)
		}
	}()

	scriptName := fmt.Sprintf("e2e-pause-script-%d.py", randomSuffix())
	description := "Script for pause/start test"
	content := `print("Test")`
	language := "py"

	script, _, err := client.CreateStoredScript(ctx, cfg.Workspace, irmincore.CreateScriptRequest{
		Name:        scriptName,
		Description: &description,
		Content:     &content,
		Language:    &language,
	})
	if err != nil {
		return fmt.Errorf("failed to create script: %w", err)
	}

	defer func() {
		if cfg.CleanupAfterTests {
			_, _ = client.DeleteStoredScript(ctx, cfg.Workspace, script.ID)
		}
	}()

	// Create workflow
	scriptID := script.ID
	resultsPath := defaultResultsPath
	resultsBranch := defaultResultsBranch
	workflow, _, err := client.CreateWorkflow(ctx, cfg.Workspace, irmincore.WorkflowRequest{
		Type:        irminmodels.WorkflowableTypeAction,
		Name:        fmt.Sprintf("e2e-pause-workflow-%d", randomSuffix()),
		Description: "Workflow for pause/start test",
		Workflowable: irminmodels.Workflowable{
			Type:                    irminmodels.WorkflowableTypeAction,
			ExecutableType:          irminmodels.ActionExecutableTypeScript,
			ScriptID:                &scriptID,
			Repository:              repo.Slug,
			RepositoryBranch:        defaultResultsBranch,
			ResultsRepositoryPath:   &resultsPath,
			ResultsRepositoryBranch: &resultsBranch,
		},
		Schedule: irminmodels.Schedule{
			Triggers: []irminmodels.ScheduleTrigger{},
		},
	})
	if err != nil {
		return fmt.Errorf("failed to create workflow: %w", err)
	}

	defer func() {
		if cfg.CleanupAfterTests {
			_, _ = client.DeleteWorkflow(ctx, cfg.Workspace, workflow.ID)
		}
	}()

	// Pause the workflow
	_, _, err = client.PauseWorkflow(ctx, cfg.Workspace, workflow.ID)
	if err != nil {
		return fmt.Errorf("failed to pause workflow: %w", err)
	}

	// Start the workflow
	_, _, err = client.StartWorkflow(ctx, cfg.Workspace, workflow.ID)
	if err != nil {
		return fmt.Errorf("failed to start workflow: %w", err)
	}

	return nil
}

func testWorkflowListByType(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	// List workflows by type - this should work even if there are no workflows
	_, _, err := client.ListWorkflowsOfType(ctx, cfg.Workspace, "action")
	if err != nil {
		return fmt.Errorf("failed to list action workflows: %w", err)
	}

	_, _, err = client.ListWorkflowsOfType(ctx, cfg.Workspace, "import")
	if err != nil {
		return fmt.Errorf("failed to list import workflows: %w", err)
	}

	_, _, err = client.ListWorkflowsOfType(ctx, cfg.Workspace, "export")
	if err != nil {
		return fmt.Errorf("failed to list export workflows: %w", err)
	}

	return nil
}

func testWorkflowUpdateSchedule(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	// Create repository and script
	repoName := fmt.Sprintf("e2e-schedule-repo-%d", randomSuffix())
	repo, _, err := client.CreateRepository(ctx, cfg.Workspace, irmincore.CreateRepositoryRequest{
		Name:          repoName,
		Description:   "Repository for schedule update test",
		DefaultBranch: "main",
	})
	if err != nil {
		return fmt.Errorf("failed to create repository: %w", err)
	}

	defer func() {
		if cfg.CleanupAfterTests {
			_, _ = client.DeleteRepository(ctx, cfg.Workspace, repo.Slug)
		}
	}()

	scriptName := fmt.Sprintf("e2e-schedule-script-%d.py", randomSuffix())
	description := "Script for schedule update test"
	content := `print("Schedule test")`
	language := "py"

	script, _, err := client.CreateStoredScript(ctx, cfg.Workspace, irmincore.CreateScriptRequest{
		Name:        scriptName,
		Description: &description,
		Content:     &content,
		Language:    &language,
	})
	if err != nil {
		return fmt.Errorf("failed to create script: %w", err)
	}

	defer func() {
		if cfg.CleanupAfterTests {
			_, _ = client.DeleteStoredScript(ctx, cfg.Workspace, script.ID)
		}
	}()

	// Create workflow
	scriptID := script.ID
	resultsPath := defaultResultsPath
	resultsBranch := defaultResultsBranch
	workflow, _, err := client.CreateWorkflow(ctx, cfg.Workspace, irmincore.WorkflowRequest{
		Type:        irminmodels.WorkflowableTypeAction,
		Name:        fmt.Sprintf("e2e-schedule-workflow-%d", randomSuffix()),
		Description: "Workflow for schedule update test",
		Workflowable: irminmodels.Workflowable{
			Type:                    irminmodels.WorkflowableTypeAction,
			ExecutableType:          irminmodels.ActionExecutableTypeScript,
			ScriptID:                &scriptID,
			Repository:              repo.Slug,
			RepositoryBranch:        defaultResultsBranch,
			ResultsRepositoryPath:   &resultsPath,
			ResultsRepositoryBranch: &resultsBranch,
		},
		Schedule: irminmodels.Schedule{
			Triggers: []irminmodels.ScheduleTrigger{},
		},
	})
	if err != nil {
		return fmt.Errorf("failed to create workflow: %w", err)
	}

	defer func() {
		if cfg.CleanupAfterTests {
			_, _ = client.DeleteWorkflow(ctx, cfg.Workspace, workflow.ID)
		}
	}()

	// Update the schedule with a time trigger
	cronExpr := "0 0 * * *" // Daily at midnight
	_, _, err = client.UpdateWorkflowSchedule(ctx, cfg.Workspace, workflow.ID, irminmodels.Schedule{
		Triggers: []irminmodels.ScheduleTrigger{
			{
				Type: irminmodels.TimeTriggerType,
				Cron: &cronExpr,
			},
		},
	})
	if err != nil {
		return fmt.Errorf("failed to update workflow schedule: %w", err)
	}

	// Verify the schedule was updated
	updatedWorkflow, _, err := client.GetWorkflow(ctx, cfg.Workspace, workflow.ID)
	if err != nil {
		return fmt.Errorf("failed to get updated workflow: %w", err)
	}

	if len(updatedWorkflow.Schedule.Triggers) == 0 {
		return fmt.Errorf("schedule triggers were not updated")
	}

	return nil
}

func testWorkflowUpdateWorkflowable(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	// Create repository
	repoName := fmt.Sprintf("e2e-workflowable-repo-%d", randomSuffix())
	repo, _, err := client.CreateRepository(ctx, cfg.Workspace, irmincore.CreateRepositoryRequest{
		Name:          repoName,
		Description:   "Repository for workflowable update test",
		DefaultBranch: "main",
	})
	if err != nil {
		return fmt.Errorf("failed to create repository: %w", err)
	}

	defer func() {
		if cfg.CleanupAfterTests {
			_, _ = client.DeleteRepository(ctx, cfg.Workspace, repo.Slug)
		}
	}()

	// Create two scripts
	scriptName1 := fmt.Sprintf("e2e-workflowable-script1-%d.py", randomSuffix())
	description := "Script 1 for workflowable update test"
	content := `print("Script 1")`
	language := "py"

	script1, _, err := client.CreateStoredScript(ctx, cfg.Workspace, irmincore.CreateScriptRequest{
		Name:        scriptName1,
		Description: &description,
		Content:     &content,
		Language:    &language,
	})
	if err != nil {
		return fmt.Errorf("failed to create script 1: %w", err)
	}

	defer func() {
		if cfg.CleanupAfterTests {
			_, _ = client.DeleteStoredScript(ctx, cfg.Workspace, script1.ID)
		}
	}()

	scriptName2 := fmt.Sprintf("e2e-workflowable-script2-%d.py", randomSuffix())
	description2 := "Script 2 for workflowable update test"
	content2 := `print("Script 2")`

	script2, _, err := client.CreateStoredScript(ctx, cfg.Workspace, irmincore.CreateScriptRequest{
		Name:        scriptName2,
		Description: &description2,
		Content:     &content2,
		Language:    &language,
	})
	if err != nil {
		return fmt.Errorf("failed to create script 2: %w", err)
	}

	defer func() {
		if cfg.CleanupAfterTests {
			_, _ = client.DeleteStoredScript(ctx, cfg.Workspace, script2.ID)
		}
	}()

	// Create workflow with script 1
	scriptID1 := script1.ID
	resultsPath := defaultResultsPath
	resultsBranch := defaultResultsBranch
	workflow, _, err := client.CreateWorkflow(ctx, cfg.Workspace, irmincore.WorkflowRequest{
		Type:        irminmodels.WorkflowableTypeAction,
		Name:        fmt.Sprintf("e2e-workflowable-workflow-%d", randomSuffix()),
		Description: "Workflow for workflowable update test",
		Workflowable: irminmodels.Workflowable{
			Type:                    irminmodels.WorkflowableTypeAction,
			ExecutableType:          irminmodels.ActionExecutableTypeScript,
			ScriptID:                &scriptID1,
			Repository:              repo.Slug,
			RepositoryBranch:        defaultResultsBranch,
			ResultsRepositoryPath:   &resultsPath,
			ResultsRepositoryBranch: &resultsBranch,
		},
		Schedule: irminmodels.Schedule{
			Triggers: []irminmodels.ScheduleTrigger{},
		},
	})
	if err != nil {
		return fmt.Errorf("failed to create workflow: %w", err)
	}

	defer func() {
		if cfg.CleanupAfterTests {
			_, _ = client.DeleteWorkflow(ctx, cfg.Workspace, workflow.ID)
		}
	}()

	// Update the workflowable to use script 2
	scriptID2 := script2.ID
	_, _, err = client.UpdateWorkflowWorkflowable(ctx, cfg.Workspace, workflow.ID, irminmodels.Workflowable{
		Type:                    irminmodels.WorkflowableTypeAction,
		ExecutableType:          irminmodels.ActionExecutableTypeScript,
		ScriptID:                &scriptID2,
		Repository:              repo.Slug,
		RepositoryBranch:        defaultResultsBranch,
		ResultsRepositoryPath:   &resultsPath,
		ResultsRepositoryBranch: &resultsBranch,
	})
	if err != nil {
		return fmt.Errorf("failed to update workflowable: %w", err)
	}

	return nil
}
