package repositoryobjectcache_test

import (
	"irmin-api/db"
	"irmin-api/lib"
	repositoryObjectCache "irmin-api/lib/repository-object-cache"
	"log/slog"
	"os"
	"strings"
	"testing"
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/zeebo/assert"
	"gorm.io/gorm"
)

func TestEnsureParentObjectThroughProcessing(t *testing.T) {
	ts := lib.GetTestSuite()
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	manager := repositoryObjectCache.NewManager(ts.DB, logger, ts.Env)

	workspace, err := ts.DB.GetWorkspaceBySlug(ts.Env.TestWorkspace)
	if err != nil {
		t.Skipf("Skipping integration test - test workspace not found: %v", err)
	}

	repository, err := ts.DB.GetRepositoryBySlugAndWorkspaceID(ts.Env.TestRepository, workspace.ID)
	if err != nil {
		t.Skipf("Skipping integration test - test repository not found: %v", err)
	}

	initialObjectIDs := getObjectIDsFromCache(t, ts.DB, repository.ID, ts.Env.TestBranch)
	defer cleanupCache(t, ts.DB, repository.ID, ts.Env.TestBranch, initialObjectIDs)

	t.Run("CreateParentObjectsForNestedPath", func(t *testing.T) {
		// Create a deeply nested object that will require parent creation
		testObject := &irminmodels.Object{
			Name:        "deep-nested.json",
			Path:        "level1/level2/level3/deep-nested.json",
			Type:        irminmodels.ObjectTypeStructured,
			ContentType: "application/json",
			SizeBytes:   1000,
		}

		flatObjects, getFlatObjectsErr := ts.DB.GetFlatDBObjects(repository.ID, ts.Env.TestBranch)
		assert.NoError(t, getFlatObjectsErr)

		parentPath := "level1/level2/level3"
		processedObject, processErr := manager.ProcessEngineObject(
			testObject,
			flatObjects,
			ts.Env.TestBranch,
			repository.ID,
			&parentPath,
			nil,
		)

		assert.NoError(t, processErr)
		assert.NotNil(t, processedObject)
		assert.NotNil(t, processedObject.ParentID)

		// Verify parent objects were created
		parentObject, findErr := ts.DB.FindObject(&parentPath, &repository.ID, &ts.Env.TestBranch)
		assert.NoError(t, findErr)
		assert.NotNil(t, parentObject)
		assert.Equal(t, parentObject.Type, irminmodels.ObjectTypeGroup)
		assert.Equal(t, parentObject.RepositoryID, repository.ID)

		// Verify grandparent
		grandParentPath := "level1/level2"
		grandParentObject, findErr := ts.DB.FindObject(&grandParentPath, &repository.ID, &ts.Env.TestBranch)
		assert.NoError(t, findErr)
		assert.NotNil(t, grandParentObject)
		assert.Equal(t, grandParentObject.Type, irminmodels.ObjectTypeGroup)

		// Verify great-grandparent
		greatGrandParentPath := "level1"
		greatGrandParentObject, findErr := ts.DB.FindObject(&greatGrandParentPath, &repository.ID, &ts.Env.TestBranch)
		assert.NoError(t, findErr)
		assert.NotNil(t, greatGrandParentObject)
		assert.Equal(t, greatGrandParentObject.Type, irminmodels.ObjectTypeGroup)

		// Verify parent-child relationships
		assert.Equal(t, *processedObject.ParentID, parentObject.ID)
		if parentObject.ParentID != nil {
			assert.Equal(t, *parentObject.ParentID, grandParentObject.ID)
		}
		if grandParentObject.ParentID != nil {
			assert.Equal(t, *grandParentObject.ParentID, greatGrandParentObject.ID)
		}
	})

	t.Run("ReuseExistingParentObject", func(t *testing.T) {
		// First create a parent object
		parentObject := &irminmodels.Object{
			Name: "existing-parent",
			Path: "existing-parent",
			Type: irminmodels.ObjectTypeGroup,
		}

		flatObjects, getFlatObjectsErr := ts.DB.GetFlatDBObjects(repository.ID, ts.Env.TestBranch)
		assert.NoError(t, getFlatObjectsErr)

		processedParent, processErr := manager.ProcessEngineObject(
			parentObject,
			flatObjects,
			ts.Env.TestBranch,
			repository.ID,
			nil,
			nil,
		)
		assert.NoError(t, processErr)

		// Now create a child that should use the existing parent
		childObject := &irminmodels.Object{
			Name:        "child-of-existing.json",
			Path:        "existing-parent/child-of-existing.json",
			Type:        irminmodels.ObjectTypeStructured,
			ContentType: "application/json",
			SizeBytes:   500,
		}

		// Refresh flat objects to include the newly created parent
		flatObjects, getFlatObjectsErr = ts.DB.GetFlatDBObjects(repository.ID, ts.Env.TestBranch)
		assert.NoError(t, getFlatObjectsErr)

		parentPath := "existing-parent"
		processedChild, processErr := manager.ProcessEngineObject(
			childObject,
			flatObjects,
			ts.Env.TestBranch,
			repository.ID,
			&parentPath,
			nil,
		)

		assert.NoError(t, processErr)
		assert.NotNil(t, processedChild)
		assert.NotNil(t, processedChild.ParentID)
		assert.Equal(t, *processedChild.ParentID, processedParent.ID) // Should reuse existing parent
	})
}

func TestSyncCacheWithDataEngineThroughProcessing(t *testing.T) {
	ts := lib.GetTestSuite()
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	manager := repositoryObjectCache.NewManager(ts.DB, logger, ts.Env)

	workspace, err := ts.DB.GetWorkspaceBySlug(ts.Env.TestWorkspace)
	if err != nil {
		t.Skipf("Skipping integration test - test workspace not found: %v", err)
	}

	repository, err := ts.DB.GetRepositoryBySlugAndWorkspaceID(ts.Env.TestRepository, workspace.ID)
	if err != nil {
		t.Skipf("Skipping integration test - test repository not found: %v", err)
	}

	initialObjectIDs := getObjectIDsFromCache(t, ts.DB, repository.ID, ts.Env.TestBranch)

	t.Run("ProcessDirectoryWithChildren", func(t *testing.T) {
		// Create a directory with children to trigger sync logic
		directoryObject := &irminmodels.Object{
			Name: "sync-test-dir",
			Path: "sync-test-dir",
			Type: irminmodels.ObjectTypeGroup,
			Children: []irminmodels.Object{
				{
					Name:        "file1.json",
					Path:        "sync-test-dir/file1.json",
					Type:        irminmodels.ObjectTypeStructured,
					ContentType: "application/json",
					SizeBytes:   100,
				},
				{
					Name:        "file2.csv",
					Path:        "sync-test-dir/file2.csv",
					Type:        irminmodels.ObjectTypeStructured,
					ContentType: "text/csv",
					SizeBytes:   200,
				},
			},
		}

		flatObjects, getFlatObjectsErr := ts.DB.GetFlatDBObjects(repository.ID, ts.Env.TestBranch)
		assert.NoError(t, getFlatObjectsErr)

		processedDir, processErr := manager.ProcessEngineObject(
			directoryObject,
			flatObjects,
			ts.Env.TestBranch,
			repository.ID,
			nil,
			nil,
		)

		assert.NoError(t, processErr)
		assert.NotNil(t, processedDir)
		assert.Equal(t, len(processedDir.Children), 2)

		// Verify children were processed and have correct parent relationships
		for _, child := range processedDir.Children {
			assert.Equal(t, child.RepositoryID, repository.ID)
			assert.NotNil(t, child.ParentID)
			assert.Equal(t, *child.ParentID, processedDir.ID)
		}
	})

	cleanupCache(t, ts.DB, repository.ID, ts.Env.TestBranch, initialObjectIDs)
}

func TestRefreshObjectFromDataEngine(t *testing.T) {
	ts := lib.GetTestSuite()
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	manager := repositoryObjectCache.NewManager(ts.DB, logger, ts.Env)
	ctx := t.Context()

	workspace, err := ts.DB.GetWorkspaceBySlug(ts.Env.TestWorkspace)
	if err != nil {
		t.Skipf("Skipping integration test - test workspace not found: %v", err)
	}

	repository, err := ts.DB.GetRepositoryBySlugAndWorkspaceID(ts.Env.TestRepository, workspace.ID)
	if err != nil {
		t.Skipf("Skipping integration test - test repository not found: %v", err)
	}

	initialObjectIDs := getObjectIDsFromCache(t, ts.DB, repository.ID, ts.Env.TestBranch)

	t.Run("RefreshExistingObject", func(t *testing.T) {
		// This test requires an object that exists in the data engine
		// We'll use the test object from the environment
		if ts.Env.TestObjectName == "" {
			t.Skip("TestObjectName not configured in environment")
		}

		refreshedObject, refreshErr := manager.RefreshObjectFromDataEngine(
			ctx,
			"en",
			workspace,
			repository,
			ts.Env.TestObjectName,
			ts.Env.TestBranch,
			nil,
		)

		// Skip if the object doesn't exist in the data engine
		if refreshErr != nil && strings.Contains(refreshErr.Error(), "not found") {
			t.Skipf(
				"Test object '%s' not found in data engine. "+
					"This is expected in environments without seeded test data.",
				ts.Env.TestObjectName,
			)
		}

		assert.NoError(t, refreshErr)
		assert.NotNil(t, refreshedObject)
		assert.Equal(t, refreshedObject.Name, ts.Env.TestObjectName)
		assert.Equal(t, refreshedObject.RepositoryID, repository.ID)
		assert.Equal(t, refreshedObject.RepositoryRef, ts.Env.TestBranch)
		assert.NotNil(t, refreshedObject.Repository)
	})

	t.Run("RefreshNonExistentObject", func(t *testing.T) {
		// Try to refresh an object that doesn't exist
		_, refreshErr := manager.RefreshObjectFromDataEngine(
			ctx,
			"en",
			workspace,
			repository,
			"non/existent/file.json",
			ts.Env.TestBranch,
			nil,
		)

		// Should get an error since the object doesn't exist
		assert.Error(t, refreshErr)
	})

	t.Run("RefreshWithExistingCachedObject", func(t *testing.T) {
		if ts.Env.TestObjectName == "" {
			t.Skip("TestObjectName not configured in environment")
		}

		// Create a mock existing object
		existingObject := &db.RepositoryObject{
			Model: gorm.Model{
				ID:        999999, // Use a large ID that shouldn't exist
				UpdatedAt: time.Now().Add(-2 * time.Hour),
			},
			Path:          ts.Env.TestObjectName,
			RepositoryID:  repository.ID,
			RepositoryRef: ts.Env.TestBranch,
		}

		refreshedObject, refreshErr := manager.RefreshObjectFromDataEngine(
			ctx,
			"en",
			workspace,
			repository,
			ts.Env.TestObjectName,
			ts.Env.TestBranch,
			existingObject,
		)

		// Skip if the object doesn't exist in the data engine
		if refreshErr != nil && strings.Contains(refreshErr.Error(), "not found") {
			t.Skipf(
				"Test object '%s' not found in data engine. "+
					"This is expected in environments without seeded test data.",
				ts.Env.TestObjectName,
			)
		}

		assert.NoError(t, refreshErr)
		assert.NotNil(t, refreshedObject)
		assert.Equal(t, refreshedObject.Name, ts.Env.TestObjectName)
	})

	cleanupCache(t, ts.DB, repository.ID, ts.Env.TestBranch, initialObjectIDs)
}

func TestCacheCleanupLogic(t *testing.T) {
	ts := lib.GetTestSuite()
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	manager := repositoryObjectCache.NewManager(ts.DB, logger, ts.Env)
	ctx := t.Context()

	workspace, err := ts.DB.GetWorkspaceBySlug(ts.Env.TestWorkspace)
	if err != nil {
		t.Skipf("Skipping integration test - test workspace not found: %v", err)
	}

	repository, err := ts.DB.GetRepositoryBySlugAndWorkspaceID(ts.Env.TestRepository, workspace.ID)
	if err != nil {
		t.Skipf("Skipping integration test - test repository not found: %v", err)
	}

	initialObjectIDs := getObjectIDsFromCache(t, ts.DB, repository.ID, ts.Env.TestBranch)

	t.Run("HandleObjectNotFoundScenario", func(t *testing.T) {
		// Try to refresh a non-existent object with an existing cached version
		// This should trigger the cleanup logic
		existingObject := &db.RepositoryObject{
			Model: gorm.Model{
				ID:        999998, // Use a large ID that shouldn't exist
				UpdatedAt: time.Now().Add(-2 * time.Hour),
			},
			Path:          "should/not/exist.json",
			RepositoryID:  repository.ID,
			RepositoryRef: ts.Env.TestBranch,
		}

		_, refreshErr := manager.RefreshObjectFromDataEngine(
			ctx,
			"en",
			workspace,
			repository,
			"should/not/exist.json",
			ts.Env.TestBranch,
			existingObject,
		)

		// Should get an error since the object doesn't exist
		assert.Error(t, refreshErr)
		// The error should indicate it tried to handle the not found case
		assert.True(t, strings.Contains(refreshErr.Error(), "error getting object from data engine"))
	})

	cleanupCache(t, ts.DB, repository.ID, ts.Env.TestBranch, initialObjectIDs)
}

func TestEdgeCasesAndErrorHandling(t *testing.T) {
	ts := lib.GetTestSuite()
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	manager := repositoryObjectCache.NewManager(ts.DB, logger, ts.Env)

	workspace, err := ts.DB.GetWorkspaceBySlug(ts.Env.TestWorkspace)
	if err != nil {
		t.Skipf("Skipping integration test - test workspace not found: %v", err)
	}

	repository, err := ts.DB.GetRepositoryBySlugAndWorkspaceID(ts.Env.TestRepository, workspace.ID)
	if err != nil {
		t.Skipf("Skipping integration test - test repository not found: %v", err)
	}

	initialObjectIDs := getObjectIDsFromCache(t, ts.DB, repository.ID, ts.Env.TestBranch)

	t.Run("ProcessObjectWithEmptyPath", func(t *testing.T) {
		testObject := &irminmodels.Object{
			Name: "",
			Path: "",
			Type: irminmodels.ObjectTypeGroup,
		}

		flatObjects, getFlatObjectsErr := ts.DB.GetFlatDBObjects(repository.ID, ts.Env.TestBranch)
		assert.NoError(t, getFlatObjectsErr)

		processedObject, processErr := manager.ProcessEngineObject(
			testObject,
			flatObjects,
			ts.Env.TestBranch,
			repository.ID,
			nil,
			nil,
		)

		assert.NoError(t, processErr)
		assert.NotNil(t, processedObject)
		assert.Equal(t, processedObject.Path, "") // Should remain empty
	})

	t.Run("ProcessObjectWithSpecialCharacters", func(t *testing.T) {
		testObject := &irminmodels.Object{
			Name:        "special-chars-file!@#.json",
			Path:        "special/path with spaces/special-chars-file!@#.json",
			Type:        irminmodels.ObjectTypeStructured,
			ContentType: "application/json",
			SizeBytes:   100,
		}

		flatObjects, getFlatObjectsErr := ts.DB.GetFlatDBObjects(repository.ID, ts.Env.TestBranch)
		assert.NoError(t, getFlatObjectsErr)

		parentPath := "special/path with spaces"
		processedObject, processErr := manager.ProcessEngineObject(
			testObject,
			flatObjects,
			ts.Env.TestBranch,
			repository.ID,
			&parentPath,
			nil,
		)

		assert.NoError(t, processErr)
		assert.NotNil(t, processedObject)
		assert.Equal(t, processedObject.Name, "special-chars-file!@#.json")
		assert.Equal(t, processedObject.Path, "special/path with spaces/special-chars-file!@#.json")
	})

	t.Run("ProcessHiddenFiles", func(t *testing.T) {
		hiddenFile := &irminmodels.Object{
			Name:        ".hidden-file",
			Path:        ".hidden-dir/.hidden-file",
			Type:        irminmodels.ObjectTypeStructured,
			ContentType: "text/plain",
			SizeBytes:   50,
		}

		flatObjects, getFlatObjectsErr := ts.DB.GetFlatDBObjects(repository.ID, ts.Env.TestBranch)
		assert.NoError(t, getFlatObjectsErr)

		parentPath := ".hidden-dir"
		processedObject, processErr := manager.ProcessEngineObject(
			hiddenFile,
			flatObjects,
			ts.Env.TestBranch,
			repository.ID,
			&parentPath,
			nil,
		)

		assert.NoError(t, processErr)
		assert.NotNil(t, processedObject)
		assert.Equal(t, processedObject.Name, ".hidden-file")
		assert.Equal(t, processedObject.Path, ".hidden-dir/.hidden-file")
	})

	cleanupCache(t, ts.DB, repository.ID, ts.Env.TestBranch, initialObjectIDs)
}
