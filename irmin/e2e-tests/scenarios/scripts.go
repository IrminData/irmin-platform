package scenarios

import (
	"context"
	"fmt"

	irmincore "github.com/IrminData/irmin-platform/sdks/go/api"

	"github.com/IrminData/irmin-e2e-tests/config"
	"github.com/IrminData/irmin-e2e-tests/runner"
)

// ScriptScenarios returns test cases for stored script operations.
func ScriptScenarios() []runner.TestCase {
	return []runner.TestCase{
		{
			Name:        "Script_Create_List_Delete",
			Description: "Create a stored script, verify in list, delete it",
			Run:         testScriptLifecycle,
		},
		{
			Name:        "Script_Update",
			Description: "Create a script, update it, verify changes",
			Run:         testScriptUpdate,
		},
		{
			Name:        "Script_Execute_Python",
			Description: "Create and execute a Python script",
			Run:         testScriptExecutePython,
		},
		{
			Name:        "Script_Get_Details",
			Description: "Create a script and get its details",
			Run:         testScriptDetails,
		},
		{
			Name:        "Script_List_Templates",
			Description: "List available script templates",
			Run:         testScriptTemplates,
		},
	}
}

func testScriptLifecycle(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	scriptName := fmt.Sprintf("e2e-script-%d.py", randomSuffix())
	description := "E2E test script"
	content := `print("Hello from E2E test")`
	language := "py"

	// Create script
	script, _, err := client.CreateStoredScript(ctx, cfg.Workspace, irmincore.CreateScriptRequest{
		Name:        scriptName,
		Description: &description,
		Content:     &content,
		Language:    &language,
	})
	if err != nil {
		return fmt.Errorf("failed to create script: %w", err)
	}

	// List scripts and verify
	scripts, _, err := client.ListStoredScripts(ctx, cfg.Workspace)
	if err != nil {
		return fmt.Errorf("failed to list scripts: %w", err)
	}

	found := false
	for _, s := range scripts {
		if s.ID == script.ID {
			found = true
			break
		}
	}
	if !found {
		return fmt.Errorf("created script not found in list")
	}

	// Delete script
	if cfg.CleanupAfterTests {
		_, err = client.DeleteStoredScript(ctx, cfg.Workspace, script.ID)
		if err != nil {
			return fmt.Errorf("failed to delete script: %w", err)
		}
	}

	return nil
}

func testScriptUpdate(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	scriptName := fmt.Sprintf("e2e-script-%d.py", randomSuffix())
	description := "Original description"
	content := `print("Original content")`
	language := "py"

	// Create script
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

	// Update script
	updatedName := fmt.Sprintf("e2e-script-updated-%d.py", randomSuffix())
	updatedDescription := "Updated description"
	updatedContent := `print("Updated content")`

	_, _, err = client.UpdateStoredScript(ctx, cfg.Workspace, script.ID, irmincore.UpdateScriptRequest{
		Name:        &updatedName,
		Description: &updatedDescription,
		Content:     &updatedContent,
	})
	if err != nil {
		return fmt.Errorf("failed to update script: %w", err)
	}

	// Verify update
	fetchedScript, _, err := client.GetStoredScript(ctx, cfg.Workspace, script.ID)
	if err != nil {
		return fmt.Errorf("failed to get script: %w", err)
	}

	if fetchedScript.Name != updatedName {
		return fmt.Errorf("script name not updated: expected %q, got %q", updatedName, fetchedScript.Name)
	}

	return nil
}

func testScriptExecutePython(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	scriptName := fmt.Sprintf("e2e-exec-script-%d.py", randomSuffix())
	description := "Script for execution test"
	content := `
import json

result = {"status": "success", "message": "Hello from E2E test"}
print(json.dumps(result))
`
	language := "py"

	// Create script
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

	// Execute script
	result, _, err := client.ExecuteStoredScript(ctx, cfg.Workspace, script.ID, false, irmincore.ExecuteScriptRequest{})
	if err != nil {
		return fmt.Errorf("failed to execute script: %w", err)
	}

	// Verify execution completed
	if result.HasErrors {
		return fmt.Errorf("script execution had errors: %v", result.Logs)
	}

	return nil
}

func testScriptDetails(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	scriptName := fmt.Sprintf("e2e-details-script-%d.py", randomSuffix())
	description := "Script for details test"
	content := `print("Details test")`
	language := "py"

	// Create script
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

	// Get script details
	fetchedScript, _, err := client.GetStoredScript(ctx, cfg.Workspace, script.ID)
	if err != nil {
		return fmt.Errorf("failed to get script: %w", err)
	}

	if fetchedScript.Name != scriptName {
		return fmt.Errorf("script name mismatch: expected %q, got %q", scriptName, fetchedScript.Name)
	}

	if fetchedScript.ID == "" {
		return fmt.Errorf("script ID is empty")
	}

	return nil
}

func testScriptTemplates(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	// List script templates
	templates, _, err := client.ListScriptTemplates(ctx, cfg.Workspace)
	if err != nil {
		return fmt.Errorf("failed to list script templates: %w", err)
	}

	// Templates may or may not exist depending on the environment
	// Just verify the API call succeeded
	_ = templates

	return nil
}
