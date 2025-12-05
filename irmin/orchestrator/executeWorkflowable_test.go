package orchestrator_test

import (
	"irmin-api/db"
	"irmin-api/utils"
	"testing"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/zeebo/assert"
)

// TestImportWorkflowableExecution tests the execution of import workflows with the new field structure.
func TestImportWorkflowableExecution(t *testing.T) {
	_, database, env := setupTestOrchestrator(t)

	// Find the test user
	user, err := database.GetUserByEmail(env.TestUserEmail)
	if err != nil {
		t.Skipf("Skipping integration test - test user not found: %v", err)
		return
	}

	// Find the test workspace
	workspace, err := database.GetWorkspaceBySlug(env.TestWorkspace)
	if err != nil {
		t.Skipf("Skipping integration test - test workspace not found: %v", err)
		return
	}

	// Create a test repository
	repo := &db.Repository{
		Name:         "import-test-repo",
		Slug:         "import-test-repo",
		WorkspaceID:  workspace.ID,
		LakeFSRepoID: "import-test-repo-lakefs",
		OwnerID:      user.ID,
	}
	err = database.Create(repo).Error
	if err != nil {
		t.Fatalf("Failed to create test repository: %v", err)
	}
	defer database.Delete(repo)

	// Create a test connection (this would normally be a real connector)
	connector := &db.Connector{
		Name:        "Test Connector",
		Description: "Test connector for import workflow",
		APIBaseURL:  "http://localhost:8080",
		SystemToken: "test-token",
	}
	err = database.Create(connector).Error
	if err != nil {
		t.Fatalf("Failed to create test connector: %v", err)
	}
	defer database.Delete(connector)

	connection := &db.Connection{
		Name:        "Test Connection",
		ConnectorID: connector.ID,
		WorkspaceID: workspace.ID,
		OwnerID:     user.ID,
		Details:     db.CustomFieldValues{"host": "localhost", "port": "5432"},
		Settings:    db.CustomFieldValues{"timeout": "30"},
	}
	err = database.Create(connection).Error
	if err != nil {
		t.Fatalf("Failed to create test connection: %v", err)
	}
	defer database.Delete(connection)

	// Create an import workflowable with the new field structure
	importWorkflowable := &db.ImportWorkflowable{
		ConnectionID:              connection.ID,
		ImportFromConnectionPaths: []string{"/source/data1.csv", "/source/data2.csv"}, // Multiple source paths
		ImportToRepositoryPath:    "/destination/imported_data.csv",                   // Single destination path
		RepositoryID:              repo.ID,
		RepositoryBranch:          "main",
		FieldMappings:             []irminmodels.FieldMapping{},
	}
	err = database.Create(importWorkflowable).Error
	if err != nil {
		t.Fatalf("Failed to create test import workflowable: %v", err)
	}
	defer database.Delete(importWorkflowable)

	// Create a test workflow
	workflow := &db.Workflow{
		Name:        "Import Test Workflow",
		Type:        irminmodels.WorkflowableTypeImport,
		WorkspaceID: workspace.ID,
		ImportID:    &importWorkflowable.ID,
		OwnerID:     user.ID,
	}
	err = database.Create(workflow).Error
	if err != nil {
		t.Fatalf("Failed to create test workflow: %v", err)
	}
	defer database.Delete(workflow)

	// We can't actually execute because we don't have a real connector,
	// but we can test that the workflow structure is correct
	retrievedWorkflow, err := database.GetWorkflowByID(workflow.ID)
	assert.NoError(t, err)
	assert.Equal(t, irminmodels.WorkflowableTypeImport, retrievedWorkflow.Type)
	assert.NotNil(t, retrievedWorkflow.ImportID)

	// Verify the import workflowable has the correct new field structure
	retrievedImport, err := database.GetImportWorkflowableByID(*retrievedWorkflow.ImportID)
	assert.NoError(t, err)
	assert.Equal(t, 2, len(retrievedImport.ImportFromConnectionPaths))
	assert.Equal(t, "/source/data1.csv", retrievedImport.ImportFromConnectionPaths[0])
	assert.Equal(t, "/source/data2.csv", retrievedImport.ImportFromConnectionPaths[1])
	assert.Equal(t, "/destination/imported_data.csv", retrievedImport.ImportToRepositoryPath)

	t.Logf(
		"Successfully verified import workflow structure with multiple source paths: %v",
		retrievedImport.ImportFromConnectionPaths,
	)
}

// TestExportWorkflowableExecution tests the execution of export workflows with the new field structure.
func TestExportWorkflowableExecution(t *testing.T) {
	_, database, env := setupTestOrchestrator(t)

	// Find the test user
	user, err := database.GetUserByEmail(env.TestUserEmail)
	if err != nil {
		t.Skipf("Skipping integration test - test user not found: %v", err)
		return
	}

	// Find the test workspace
	workspace, err := database.GetWorkspaceBySlug(env.TestWorkspace)
	if err != nil {
		t.Skipf("Skipping integration test - test workspace not found: %v", err)
		return
	}

	// Create a test repository
	repo := &db.Repository{
		Name:         "export-test-repo",
		Slug:         "export-test-repo",
		WorkspaceID:  workspace.ID,
		LakeFSRepoID: "export-test-repo-lakefs",
		OwnerID:      user.ID,
	}
	err = database.Create(repo).Error
	if err != nil {
		t.Fatalf("Failed to create test repository: %v", err)
	}
	defer database.Delete(repo)

	// Create a test connection (reuse connector setup from import test)
	connector := &db.Connector{
		Name:        "Test Export Connector",
		Description: "Test connector for export workflow",
		APIBaseURL:  "http://localhost:8080",
		SystemToken: "test-token",
	}
	err = database.Create(connector).Error
	if err != nil {
		t.Fatalf("Failed to create test connector: %v", err)
	}
	defer database.Delete(connector)

	connection := &db.Connection{
		Name:        "Test Export Connection",
		ConnectorID: connector.ID,
		WorkspaceID: workspace.ID,
		OwnerID:     user.ID,
		Details:     db.CustomFieldValues{"host": "localhost", "port": "5432"},
		Settings:    db.CustomFieldValues{"timeout": "30"},
	}
	err = database.Create(connection).Error
	if err != nil {
		t.Fatalf("Failed to create test connection: %v", err)
	}
	defer database.Delete(connection)

	// Create an export workflowable with the new field structure
	exportWorkflowable := &db.ExportWorkflowable{
		ConnectionID: connection.ID,
		ExportFromRepositoryPaths: []string{
			"/data/file1.csv",
			"/data/file2.csv",
			"/data/file3.json",
		}, // Multiple source paths
		ExportToConnectionPath: "/destination/exported_data", // Single destination path
		RepositoryID:           repo.ID,
		RepositoryBranch:       "main",
		FieldMappings:          []irminmodels.FieldMapping{},
	}
	err = database.Create(exportWorkflowable).Error
	if err != nil {
		t.Fatalf("Failed to create test export workflowable: %v", err)
	}
	defer database.Delete(exportWorkflowable)

	// Create a test workflow
	workflow := &db.Workflow{
		Name:        "Export Test Workflow",
		Type:        irminmodels.WorkflowableTypeExport,
		WorkspaceID: workspace.ID,
		ExportID:    &exportWorkflowable.ID,
		OwnerID:     user.ID,
	}
	err = database.Create(workflow).Error
	if err != nil {
		t.Fatalf("Failed to create test workflow: %v", err)
	}
	defer database.Delete(workflow)

	// Verify the export workflow structure
	retrievedWorkflow, err := database.GetWorkflowByID(workflow.ID)
	assert.NoError(t, err)
	assert.Equal(t, irminmodels.WorkflowableTypeExport, retrievedWorkflow.Type)
	assert.NotNil(t, retrievedWorkflow.ExportID)

	// Verify the export workflowable has the correct new field structure
	retrievedExport, err := database.GetExportWorkflowableByID(*retrievedWorkflow.ExportID)
	assert.NoError(t, err)
	assert.Equal(t, 3, len(retrievedExport.ExportFromRepositoryPaths))
	assert.Equal(t, "/data/file1.csv", retrievedExport.ExportFromRepositoryPaths[0])
	assert.Equal(t, "/data/file2.csv", retrievedExport.ExportFromRepositoryPaths[1])
	assert.Equal(t, "/data/file3.json", retrievedExport.ExportFromRepositoryPaths[2])
	assert.Equal(t, "/destination/exported_data", retrievedExport.ExportToConnectionPath)

	t.Logf(
		"Successfully verified export workflow structure with multiple source paths: %v",
		retrievedExport.ExportFromRepositoryPaths,
	)
}

// TestPipelineWorkflowableExecution tests the execution of pipeline workflows with the new stage structure.
func TestPipelineWorkflowableExecution(t *testing.T) {
	_, database, env := setupTestOrchestrator(t)

	// Find the test user
	user, err := database.GetUserByEmail(env.TestUserEmail)
	if err != nil {
		t.Skipf("Skipping integration test - test user not found: %v", err)
		return
	}

	// Find the test workspace
	workspace, err := database.GetWorkspaceBySlug(env.TestWorkspace)
	if err != nil {
		t.Skipf("Skipping integration test - test workspace not found: %v", err)
		return
	}

	// Create test repositories
	sourceRepo := &db.Repository{
		Name:         "pipeline-source-repo",
		Slug:         "pipeline-source-repo",
		WorkspaceID:  workspace.ID,
		LakeFSRepoID: "pipeline-source-repo-lakefs",
		OwnerID:      user.ID,
	}
	err = database.Create(sourceRepo).Error
	if err != nil {
		t.Fatalf("Failed to create source repository: %v", err)
	}
	defer database.Delete(sourceRepo)

	targetRepo := &db.Repository{
		Name:         "pipeline-target-repo",
		Slug:         "pipeline-target-repo",
		WorkspaceID:  workspace.ID,
		LakeFSRepoID: "pipeline-target-repo-lakefs",
		OwnerID:      user.ID,
	}
	err = database.Create(targetRepo).Error
	if err != nil {
		t.Fatalf("Failed to create target repository: %v", err)
	}
	defer database.Delete(targetRepo)

	// Create a test connection
	connector := &db.Connector{
		Name:        "Test Pipeline Connector",
		Description: "Test connector for pipeline workflow",
		APIBaseURL:  "http://localhost:8080",
		SystemToken: "test-token",
	}
	err = database.Create(connector).Error
	if err != nil {
		t.Fatalf("Failed to create test connector: %v", err)
	}
	defer database.Delete(connector)

	connection := &db.Connection{
		Name:        "Test Pipeline Connection",
		ConnectorID: connector.ID,
		WorkspaceID: workspace.ID,
		OwnerID:     user.ID,
		Details:     db.CustomFieldValues{"host": "localhost", "port": "5432"},
		Settings:    db.CustomFieldValues{"timeout": "30"},
	}
	err = database.Create(connection).Error
	if err != nil {
		t.Fatalf("Failed to create test connection: %v", err)
	}
	defer database.Delete(connection)

	// Create a pipeline workflowable
	pipelineWorkflowable := &db.PipelineWorkflowable{
		Live: false,
	}
	err = database.Create(pipelineWorkflowable).Error
	if err != nil {
		t.Fatalf("Failed to create test pipeline workflowable: %v", err)
	}
	defer database.Delete(pipelineWorkflowable)

	// Create pipeline stages with the new field structure
	script := &db.StoredScript{
		Name:        "test-script.go",
		Description: "Test script for pipeline workflow",
		OwnerID:     user.ID,
		WorkspaceID: workspace.ID,
		Language:    "go",
		Content:     "package main\n\nfunc main() {\n\tprintln(\"Hello, World!\")\n}",
	}
	err = database.Create(script).Error
	if err != nil {
		t.Fatalf("Failed to create test script: %v", err)
	}
	defer database.Delete(script)

	sourceBranch := "main"
	targetBranch := "processed"
	writeRepositoryPath := "/output/processed_data.csv"

	stages := []db.PipelineStage{
		{
			OrderSequence:       1,
			Description:         "Read from repository",
			Type:                db.PipelineStageTypeRepository,
			Read:                true,
			Write:               false,
			PipelineID:          &pipelineWorkflowable.ID,
			RepositoryID:        &sourceRepo.ID,
			RepositoryBranch:    &sourceBranch,
			RepositoryReadPaths: []string{"/data/input1.csv", "/data/input2.csv"}, // Multiple read paths
		},
		{
			OrderSequence: 2,
			Description:   "Process data with action",
			Type:          db.PipelineStageTypeAction,
			Read:          true,
			Write:         true,
			PipelineID:    &pipelineWorkflowable.ID,
			ScriptID:      &script.ID,
		},
		{
			OrderSequence:       3,
			Description:         "Write to connection",
			Type:                db.PipelineStageTypeConnection,
			Read:                false,
			Write:               true,
			PipelineID:          &pipelineWorkflowable.ID,
			ConnectionID:        &connection.ID,
			ConnectionWritePath: utils.StringPtr("/external/output_data"),
		},
		{
			OrderSequence:       4,
			Description:         "Save results to repository",
			Type:                db.PipelineStageTypeRepository,
			Read:                false,
			Write:               true,
			PipelineID:          &pipelineWorkflowable.ID,
			RepositoryID:        &targetRepo.ID,
			RepositoryBranch:    &targetBranch,
			RepositoryWritePath: &writeRepositoryPath, // Single write path
		},
	}

	for i := range stages {
		err = database.Create(&stages[i]).Error
		if err != nil {
			t.Fatalf("Failed to create pipeline stage %d: %v", i+1, err)
		}
		defer database.Delete(&stages[i])
	}

	// Create a test workflow
	workflow := &db.Workflow{
		Name:        "Pipeline Test Workflow",
		Type:        irminmodels.WorkflowableTypePipeline,
		WorkspaceID: workspace.ID,
		PipelineID:  &pipelineWorkflowable.ID,
		OwnerID:     user.ID,
	}
	err = database.Create(workflow).Error
	if err != nil {
		t.Fatalf("Failed to create test workflow: %v", err)
	}
	defer database.Delete(workflow)

	// Verify the pipeline workflow structure
	retrievedWorkflow, err := database.GetWorkflowByID(workflow.ID)
	assert.NoError(t, err)
	assert.Equal(t, irminmodels.WorkflowableTypePipeline, retrievedWorkflow.Type)
	assert.NotNil(t, retrievedWorkflow.PipelineID)

	// Verify the pipeline workflowable has the correct new stage structure
	retrievedPipeline, err := database.GetPipelineWorkflowableByID(*retrievedWorkflow.PipelineID)
	assert.NoError(t, err)
	assert.Equal(t, 4, len(retrievedPipeline.Stages))

	// Check first stage (repository read with multiple paths)
	stage1 := retrievedPipeline.Stages[0]
	assert.Equal(t, db.PipelineStageTypeRepository, stage1.Type)
	assert.True(t, stage1.Read)
	assert.False(t, stage1.Write)
	assert.Equal(t, 2, len(stage1.RepositoryReadPaths))
	assert.Equal(t, "/data/input1.csv", stage1.RepositoryReadPaths[0])
	assert.Equal(t, "/data/input2.csv", stage1.RepositoryReadPaths[1])

	// Check last stage (repository write with single path)
	stage4 := retrievedPipeline.Stages[3]
	assert.Equal(t, db.PipelineStageTypeRepository, stage4.Type)
	assert.False(t, stage4.Read)
	assert.True(t, stage4.Write)
	assert.NotNil(t, stage4.RepositoryWritePath)
	assert.Equal(t, "/output/processed_data.csv", *stage4.RepositoryWritePath)

	t.Logf("Successfully verified pipeline workflow structure with %d stages", len(retrievedPipeline.Stages))
}
