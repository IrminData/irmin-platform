package scenarios

import (
	"context"
	"fmt"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"

	"github.com/IrminData/irmin-e2e-tests/config"
	"github.com/IrminData/irmin-e2e-tests/runner"
)

// AIApplicationScenarios returns test cases for AI application operations.
func AIApplicationScenarios() []runner.TestCase {
	return []runner.TestCase{
		{
			Name:        "AIApp_Create_List_Delete",
			Description: "Create an AI application, list apps, and delete it",
			Run:         testAIAppLifecycle,
		},
		{
			Name:        "AIApp_Update",
			Description: "Create an AI application and update it",
			Run:         testAIAppUpdate,
		},
	}
}

func testAIAppLifecycle(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	// Create a repository for the AI application
	repoName := fmt.Sprintf("e2e-aiapp-repo-%d", randomSuffix())
	repo, _, err := client.CreateRepository(ctx, cfg.Workspace, irmincore.CreateRepositoryRequest{
		Name:          repoName,
		Description:   "Repository for AI app test",
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

	// Create an AI application
	appName := fmt.Sprintf("e2e-aiapp-%d", randomSuffix())

	aiApp, _, err := client.CreateAIApplication(ctx, cfg.Workspace, irmincore.CreateAIApplicationRequest{
		Name:           appName,
		Description:    "E2E test AI application",
		AllowedOrigins: []string{"http://localhost:3000"},
		DataSources:    []irminmodels.AIApplicationDataSource{},
	})
	if err != nil {
		return fmt.Errorf("failed to create AI application: %w", err)
	}

	if aiApp.ID == "" {
		return fmt.Errorf("AI application ID is empty")
	}

	// List AI applications
	aiApps, _, err := client.ListAIApplications(ctx, cfg.Workspace)
	if err != nil {
		return fmt.Errorf("failed to list AI applications: %w", err)
	}

	found := false
	for _, app := range aiApps {
		if app.ID == aiApp.ID {
			found = true
			break
		}
	}
	if !found {
		return fmt.Errorf("created AI application not found in list")
	}

	// Get AI application details
	fetchedApp, _, err := client.GetAIApplication(ctx, cfg.Workspace, aiApp.ID)
	if err != nil {
		return fmt.Errorf("failed to get AI application: %w", err)
	}

	if fetchedApp.ID != aiApp.ID {
		return fmt.Errorf("AI application ID mismatch")
	}

	// Delete the AI application
	if cfg.CleanupAfterTests {
		_, err = client.DeleteAIApplication(ctx, cfg.Workspace, aiApp.ID)
		if err != nil {
			return fmt.Errorf("failed to delete AI application: %w", err)
		}
	}

	return nil
}

func testAIAppUpdate(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	// Create an AI application
	appName := fmt.Sprintf("e2e-aiapp-update-%d", randomSuffix())

	aiApp, _, err := client.CreateAIApplication(ctx, cfg.Workspace, irmincore.CreateAIApplicationRequest{
		Name:           appName,
		Description:    "E2E test AI application for update",
		AllowedOrigins: []string{"http://localhost:3000"},
		DataSources:    []irminmodels.AIApplicationDataSource{},
	})
	if err != nil {
		return fmt.Errorf("failed to create AI application: %w", err)
	}

	defer func() {
		if cfg.CleanupAfterTests {
			_, _ = client.DeleteAIApplication(ctx, cfg.Workspace, aiApp.ID)
		}
	}()

	// Update the AI application
	updatedName := fmt.Sprintf("e2e-aiapp-updated-%d", randomSuffix())
	updatedDesc := "Updated E2E test AI application"

	_, _, err = client.UpdateAIApplication(ctx, cfg.Workspace, aiApp.ID, irmincore.UpdateAIApplicationRequest{
		Name:        &updatedName,
		Description: &updatedDesc,
	})
	if err != nil {
		return fmt.Errorf("failed to update AI application: %w", err)
	}

	// Verify update
	updatedApp, _, err := client.GetAIApplication(ctx, cfg.Workspace, aiApp.ID)
	if err != nil {
		return fmt.Errorf("failed to get updated AI application: %w", err)
	}

	if updatedApp.Name != updatedName {
		return fmt.Errorf("AI app name not updated: expected %q, got %q", updatedName, updatedApp.Name)
	}

	return nil
}
