package scenarios

import (
	"context"
	"fmt"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"

	"github.com/IrminData/irmin-e2e-tests/config"
	"github.com/IrminData/irmin-e2e-tests/runner"
)

// WorkspaceTagScenarios returns test cases for workspace tag operations.
func WorkspaceTagScenarios() []runner.TestCase {
	return []runner.TestCase{
		{
			Name:        "WorkspaceTag_Create_List_Delete",
			Description: "Create a workspace tag, verify it in list, delete it",
			Run:         testWorkspaceTagLifecycle,
		},
		{
			Name:        "WorkspaceTag_Update",
			Description: "Create a workspace tag, update it, verify changes",
			Run:         testWorkspaceTagUpdate,
		},
		{
			Name:        "WorkspaceTag_Assign_To_Repository",
			Description: "Create a tag and assign it to a repository",
			Run:         testWorkspaceTagAssignToRepository,
		},
		{
			Name:        "WorkspaceTag_Assign_To_Connection",
			Description: "Create a tag and assign it to a connection",
			Run:         testWorkspaceTagAssignToConnection,
		},
		{
			Name:        "WorkspaceTag_Assign_To_Workflow",
			Description: "Create a tag and assign it to a workflow",
			Run:         testWorkspaceTagAssignToWorkflow,
		},
		{
			Name:        "WorkspaceTag_Assign_To_Script",
			Description: "Create a tag and assign it to a script",
			Run:         testWorkspaceTagAssignToScript,
		},
		{
			Name:        "WorkspaceTag_Assign_To_Query",
			Description: "Create a tag and assign it to a stored query",
			Run:         testWorkspaceTagAssignToQuery,
		},
	}
}

func testWorkspaceTagLifecycle(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	tagName := fmt.Sprintf("e2e-tag-%d", randomSuffix())

	// Create workspace tag
	tag, _, err := client.CreateWorkspaceTag(ctx, cfg.Workspace, irmincore.CreateTagRequest{
		Name:        tagName,
		Color:       "#FF5733",
		Description: "E2E test tag",
	})
	if err != nil {
		return fmt.Errorf("failed to create workspace tag: %w", err)
	}

	// List workspace tags and verify
	tags, _, err := client.ListWorkspaceTags(ctx, cfg.Workspace)
	if err != nil {
		return fmt.Errorf("failed to list workspace tags: %w", err)
	}

	found := false
	for _, t := range tags {
		if t.ID == tag.ID {
			found = true
			break
		}
	}
	if !found {
		return fmt.Errorf("created tag not found in list")
	}

	// Get specific tag
	fetchedTag, _, err := client.GetWorkspaceTag(ctx, cfg.Workspace, tag.ID)
	if err != nil {
		return fmt.Errorf("failed to get workspace tag: %w", err)
	}
	if fetchedTag.Tag.Name != tagName {
		return fmt.Errorf("tag name mismatch: expected %q, got %q", tagName, fetchedTag.Tag.Name)
	}

	// Delete tag
	if cfg.CleanupAfterTests {
		_, err = client.DeleteWorkspaceTag(ctx, cfg.Workspace, tag.ID)
		if err != nil {
			return fmt.Errorf("failed to delete workspace tag: %w", err)
		}
	}

	return nil
}

func testWorkspaceTagUpdate(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	tagName := fmt.Sprintf("e2e-tag-%d", randomSuffix())
	updatedName := fmt.Sprintf("e2e-tag-updated-%d", randomSuffix())
	updatedColor := "#00FF00"
	updatedDescription := "Updated E2E test tag"

	// Create workspace tag
	tag, _, err := client.CreateWorkspaceTag(ctx, cfg.Workspace, irmincore.CreateTagRequest{
		Name:        tagName,
		Color:       "#FF5733",
		Description: "Original description",
	})
	if err != nil {
		return fmt.Errorf("failed to create workspace tag: %w", err)
	}

	defer func() {
		if cfg.CleanupAfterTests {
			_, _ = client.DeleteWorkspaceTag(ctx, cfg.Workspace, tag.ID)
		}
	}()

	// Update tag
	_, _, err = client.UpdateWorkspaceTag(ctx, cfg.Workspace, tag.ID, irmincore.UpdateTagRequest{
		Name:        &updatedName,
		Color:       &updatedColor,
		Description: &updatedDescription,
	})
	if err != nil {
		return fmt.Errorf("failed to update workspace tag: %w", err)
	}

	// Verify update
	fetchedTag, _, err := client.GetWorkspaceTag(ctx, cfg.Workspace, tag.ID)
	if err != nil {
		return fmt.Errorf("failed to get workspace tag: %w", err)
	}

	if fetchedTag.Tag.Name != updatedName {
		return fmt.Errorf("tag name not updated: expected %q, got %q", updatedName, fetchedTag.Tag.Name)
	}
	if fetchedTag.Tag.Color != updatedColor {
		return fmt.Errorf("tag color not updated: expected %q, got %q", updatedColor, fetchedTag.Tag.Color)
	}

	return nil
}

func testWorkspaceTagAssignToRepository(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	tagName := fmt.Sprintf("e2e-tag-%d", randomSuffix())
	repoName := fmt.Sprintf("e2e-tag-repo-%d", randomSuffix())

	// Create workspace tag
	tag, _, err := client.CreateWorkspaceTag(ctx, cfg.Workspace, irmincore.CreateTagRequest{
		Name:        tagName,
		Color:       "#3498DB",
		Description: "Tag for repository assignment test",
	})
	if err != nil {
		return fmt.Errorf("failed to create workspace tag: %w", err)
	}

	defer func() {
		if cfg.CleanupAfterTests {
			_, _ = client.DeleteWorkspaceTag(ctx, cfg.Workspace, tag.ID)
		}
	}()

	// Create repository
	repo, _, err := client.CreateRepository(ctx, cfg.Workspace, irmincore.CreateRepositoryRequest{
		Name:          repoName,
		Description:   "Repository for tag assignment test",
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

	// Assign tag to repository
	_, err = client.AddTagToEntity(ctx, cfg.Workspace, tag.ID, irminmodels.TagEntityTypeRepository, repo.ID)
	if err != nil {
		return fmt.Errorf("failed to assign tag to repository: %w", err)
	}

	// Verify tag is assigned
	fetchedTag, _, err := client.GetWorkspaceTag(ctx, cfg.Workspace, tag.ID)
	if err != nil {
		return fmt.Errorf("failed to get workspace tag: %w", err)
	}

	foundRepo := false
	for _, r := range fetchedTag.Assets.Repositories {
		if r.ID == repo.ID {
			foundRepo = true
			break
		}
	}
	if !foundRepo {
		return fmt.Errorf("repository not found in tag's assigned entities")
	}

	// Remove tag from repository
	_, err = client.RemoveTagFromEntity(ctx, cfg.Workspace, tag.ID, irminmodels.TagEntityTypeRepository, repo.ID)
	if err != nil {
		return fmt.Errorf("failed to remove tag from repository: %w", err)
	}

	return nil
}

func testWorkspaceTagAssignToConnection(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	if cfg.TestConnection == "" {
		// No test connection configured, skip
		return nil
	}

	tagName := fmt.Sprintf("e2e-tag-%d", randomSuffix())

	// Create workspace tag
	tag, _, err := client.CreateWorkspaceTag(ctx, cfg.Workspace, irmincore.CreateTagRequest{
		Name:        tagName,
		Color:       "#9B59B6",
		Description: "Tag for connection assignment test",
	})
	if err != nil {
		return fmt.Errorf("failed to create workspace tag: %w", err)
	}

	defer func() {
		if cfg.CleanupAfterTests {
			_, _ = client.DeleteWorkspaceTag(ctx, cfg.Workspace, tag.ID)
		}
	}()

	// Get connection to retrieve its ID
	connection, _, err := client.GetConnection(ctx, cfg.Workspace, cfg.TestConnection)
	if err != nil {
		return fmt.Errorf("failed to get connection: %w", err)
	}

	// Assign tag to connection
	_, err = client.AddTagToEntity(ctx, cfg.Workspace, tag.ID, irminmodels.TagEntityTypeConnection, connection.ID)
	if err != nil {
		return fmt.Errorf("failed to assign tag to connection: %w", err)
	}

	// Verify tag is assigned
	fetchedTag, _, err := client.GetWorkspaceTag(ctx, cfg.Workspace, tag.ID)
	if err != nil {
		return fmt.Errorf("failed to get workspace tag: %w", err)
	}

	foundConnection := false
	for _, c := range fetchedTag.Assets.Connections {
		if c.ID == connection.ID {
			foundConnection = true
			break
		}
	}
	if !foundConnection {
		return fmt.Errorf("connection not found in tag's assigned entities")
	}

	// Remove tag from connection
	_, err = client.RemoveTagFromEntity(ctx, cfg.Workspace, tag.ID, irminmodels.TagEntityTypeConnection, connection.ID)
	if err != nil {
		return fmt.Errorf("failed to remove tag from connection: %w", err)
	}

	return nil
}

func testWorkspaceTagAssignToWorkflow(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	tagName := fmt.Sprintf("e2e-tag-%d", randomSuffix())
	workflowName := fmt.Sprintf("e2e-tag-workflow-%d", randomSuffix())

	// Create workspace tag
	tag, _, err := client.CreateWorkspaceTag(ctx, cfg.Workspace, irmincore.CreateTagRequest{
		Name:        tagName,
		Color:       "#E74C3C",
		Description: "Tag for workflow assignment test",
	})
	if err != nil {
		return fmt.Errorf("failed to create workspace tag: %w", err)
	}

	defer func() {
		if cfg.CleanupAfterTests {
			_, _ = client.DeleteWorkspaceTag(ctx, cfg.Workspace, tag.ID)
		}
	}()

	// Create a stored script for the workflow
	workflowScriptName := fmt.Sprintf("e2e-tag-workflow-script-%d.py", randomSuffix())
	scriptDesc := "Script for tag workflow test"
	scriptContent := "print('Hello from tag test')"
	scriptLang := "py"

	script, _, err := client.CreateStoredScript(ctx, cfg.Workspace, irmincore.CreateScriptRequest{
		Name:        workflowScriptName,
		Description: &scriptDesc,
		Content:     &scriptContent,
		Language:    &scriptLang,
	})
	if err != nil {
		return fmt.Errorf("failed to create script for workflow: %w", err)
	}

	defer func() {
		if cfg.CleanupAfterTests {
			_, _ = client.DeleteStoredScript(ctx, cfg.Workspace, script.ID)
		}
	}()

	// Create action workflow
	scriptID := script.ID
	workflow, _, err := client.CreateWorkflow(ctx, cfg.Workspace, irmincore.WorkflowRequest{
		Type:        irminmodels.WorkflowableTypeAction,
		Name:        workflowName,
		Description: "Workflow for tag assignment test",
		Workflowable: irminmodels.Workflowable{
			Type:           irminmodels.WorkflowableTypeAction,
			ExecutableType: irminmodels.ActionExecutableTypeScript,
			ScriptID:       &scriptID,
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

	// Assign tag to workflow
	_, err = client.AddTagToEntity(ctx, cfg.Workspace, tag.ID, irminmodels.TagEntityTypeWorkflow, workflow.ID)
	if err != nil {
		return fmt.Errorf("failed to assign tag to workflow: %w", err)
	}

	// Verify tag is assigned
	fetchedTag, _, err := client.GetWorkspaceTag(ctx, cfg.Workspace, tag.ID)
	if err != nil {
		return fmt.Errorf("failed to get workspace tag: %w", err)
	}

	foundWorkflow := false
	for _, w := range fetchedTag.Assets.Workflows {
		if w.ID == workflow.ID {
			foundWorkflow = true
			break
		}
	}
	if !foundWorkflow {
		return fmt.Errorf("workflow not found in tag's assigned entities")
	}

	// Remove tag from workflow
	_, err = client.RemoveTagFromEntity(ctx, cfg.Workspace, tag.ID, irminmodels.TagEntityTypeWorkflow, workflow.ID)
	if err != nil {
		return fmt.Errorf("failed to remove tag from workflow: %w", err)
	}

	return nil
}

func testWorkspaceTagAssignToScript(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	tagName := fmt.Sprintf("e2e-tag-%d", randomSuffix())
	scriptName := fmt.Sprintf("e2e-tag-script-%d.py", randomSuffix())

	// Create workspace tag
	tag, _, err := client.CreateWorkspaceTag(ctx, cfg.Workspace, irmincore.CreateTagRequest{
		Name:        tagName,
		Color:       "#1ABC9C",
		Description: "Tag for script assignment test",
	})
	if err != nil {
		return fmt.Errorf("failed to create workspace tag: %w", err)
	}

	defer func() {
		if cfg.CleanupAfterTests {
			_, _ = client.DeleteWorkspaceTag(ctx, cfg.Workspace, tag.ID)
		}
	}()

	// Create stored script
	scriptDescription := "Script for tag assignment test"
	scriptContent := "print('Hello from tag test script')"
	scriptLanguage := "py"
	script, _, err := client.CreateStoredScript(ctx, cfg.Workspace, irmincore.CreateScriptRequest{
		Name:        scriptName,
		Description: &scriptDescription,
		Content:     &scriptContent,
		Language:    &scriptLanguage,
	})
	if err != nil {
		return fmt.Errorf("failed to create script: %w", err)
	}

	defer func() {
		if cfg.CleanupAfterTests {
			_, _ = client.DeleteStoredScript(ctx, cfg.Workspace, script.ID)
		}
	}()

	// Assign tag to script
	_, err = client.AddTagToEntity(ctx, cfg.Workspace, tag.ID, irminmodels.TagEntityTypeScript, script.ID)
	if err != nil {
		return fmt.Errorf("failed to assign tag to script: %w", err)
	}

	// Verify tag is assigned
	fetchedTag, _, err := client.GetWorkspaceTag(ctx, cfg.Workspace, tag.ID)
	if err != nil {
		return fmt.Errorf("failed to get workspace tag: %w", err)
	}

	foundScript := false
	for _, s := range fetchedTag.Assets.Scripts {
		if s.ID == script.ID {
			foundScript = true
			break
		}
	}
	if !foundScript {
		return fmt.Errorf("script not found in tag's assigned entities")
	}

	// Remove tag from script
	_, err = client.RemoveTagFromEntity(ctx, cfg.Workspace, tag.ID, irminmodels.TagEntityTypeScript, script.ID)
	if err != nil {
		return fmt.Errorf("failed to remove tag from script: %w", err)
	}

	return nil
}

func testWorkspaceTagAssignToQuery(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	tagName := fmt.Sprintf("e2e-tag-%d", randomSuffix())
	queryName := fmt.Sprintf("e2e-tag-query-%d", randomSuffix())

	// Create workspace tag
	tag, _, err := client.CreateWorkspaceTag(ctx, cfg.Workspace, irmincore.CreateTagRequest{
		Name:        tagName,
		Color:       "#F39C12",
		Description: "Tag for query assignment test",
	})
	if err != nil {
		return fmt.Errorf("failed to create workspace tag: %w", err)
	}

	defer func() {
		if cfg.CleanupAfterTests {
			_, _ = client.DeleteWorkspaceTag(ctx, cfg.Workspace, tag.ID)
		}
	}()

	// Create stored query
	query, _, err := client.CreateStoredQuery(ctx, cfg.Workspace, irmincore.CreateQueryRequest{
		Name:        queryName,
		Description: "Query for tag assignment test",
		SQL:         "SELECT 1 AS test",
	})
	if err != nil {
		return fmt.Errorf("failed to create query: %w", err)
	}

	defer func() {
		if cfg.CleanupAfterTests {
			_, _ = client.DeleteStoredQuery(ctx, cfg.Workspace, query.ID)
		}
	}()

	// Assign tag to query
	_, err = client.AddTagToEntity(ctx, cfg.Workspace, tag.ID, irminmodels.TagEntityTypeQuery, query.ID)
	if err != nil {
		return fmt.Errorf("failed to assign tag to query: %w", err)
	}

	// Verify tag is assigned
	fetchedTag, _, err := client.GetWorkspaceTag(ctx, cfg.Workspace, tag.ID)
	if err != nil {
		return fmt.Errorf("failed to get workspace tag: %w", err)
	}

	foundQuery := false
	for _, q := range fetchedTag.Assets.Queries {
		if q.ID == query.ID {
			foundQuery = true
			break
		}
	}
	if !foundQuery {
		return fmt.Errorf("query not found in tag's assigned entities")
	}

	// Remove tag from query
	_, err = client.RemoveTagFromEntity(ctx, cfg.Workspace, tag.ID, irminmodels.TagEntityTypeQuery, query.ID)
	if err != nil {
		return fmt.Errorf("failed to remove tag from query: %w", err)
	}

	return nil
}
