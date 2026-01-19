package scenarios

import (
	"context"
	"fmt"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"

	"github.com/IrminData/irmin-e2e-tests/config"
	"github.com/IrminData/irmin-e2e-tests/runner"
)

// WorkflowRunScenarios returns test cases for workflow run operations.
func WorkflowRunScenarios() []runner.TestCase {
	return []runner.TestCase{
		{
			Name:        "WorkflowRun_Trigger_List",
			Description: "Trigger a workflow run and list runs",
			Run:         testWorkflowRunTriggerList,
		},
		{
			Name:        "WorkflowRun_List_All",
			Description: "List all workflow runs in workspace",
			Run:         testWorkflowRunListAll,
		},
	}
}

func testWorkflowRunTriggerList(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	// Create repository and script
	repoName := fmt.Sprintf("e2e-run-repo-%d", randomSuffix())
	repo, _, err := client.CreateRepository(ctx, cfg.Workspace, irmincore.CreateRepositoryRequest{
		Name:          repoName,
		Description:   "Repository for workflow run test",
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

	scriptName := fmt.Sprintf("e2e-run-script-%d.py", randomSuffix())
	description := "Script for workflow run test"
	content := `print("Workflow run test")`
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
		Name:        fmt.Sprintf("e2e-run-workflow-%d", randomSuffix()),
		Description: "Workflow for run test",
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

	// Trigger a workflow run
	run, _, err := client.TriggerWorkflowRun(ctx, cfg.Workspace, workflow.ID)
	if err != nil {
		return fmt.Errorf("failed to trigger workflow run: %w", err)
	}

	if run.ID == "" {
		return fmt.Errorf("workflow run ID is empty")
	}

	// List workflow runs
	runs, _, err := client.ListWorkflowRuns(ctx, cfg.Workspace, workflow.ID, 1, 10)
	if err != nil {
		return fmt.Errorf("failed to list workflow runs: %w", err)
	}

	found := false
	for _, r := range runs {
		if r.ID == run.ID {
			found = true
			break
		}
	}
	if !found {
		return fmt.Errorf("triggered run not found in list")
	}

	// Get workflow run details
	fetchedRun, _, err := client.GetWorkflowRun(ctx, cfg.Workspace, workflow.ID, run.ID)
	if err != nil {
		return fmt.Errorf("failed to get workflow run: %w", err)
	}

	if fetchedRun.ID != run.ID {
		return fmt.Errorf("workflow run ID mismatch")
	}

	return nil
}

func testWorkflowRunListAll(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	// List all workflow runs in workspace
	_, _, err := client.ListAllWorkflowRuns(ctx, cfg.Workspace, 1, 10)
	if err != nil {
		return fmt.Errorf("failed to list all workflow runs: %w", err)
	}

	return nil
}
