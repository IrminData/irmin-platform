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

func TestCacheManagerIntegration(t *testing.T) {
	ts := lib.GetTestSuite()
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	ctx := t.Context()

	workspace, err := ts.DB.GetWorkspaceBySlug(ts.Env.TestWorkspace)
	if err != nil {
		t.Fatalf("Failed to get test workspace: %v", err)
	}

	repository, err := ts.DB.GetRepositoryBySlugAndWorkspaceID(ts.Env.TestRepository, workspace.ID)
	if err != nil {
		t.Fatalf("Failed to get test repository: %v", err)
	}

	initialObjectIDs := getObjectIDsFromCache(t, ts.DB, repository.ID, ts.Env.TestBranch)
	defer cleanupCache(t, ts.DB, repository.ID, ts.Env.TestBranch, initialObjectIDs)

	t.Run("SaveObjectIntegration", func(t *testing.T) {
		// Test SaveObject function with the new cache manager
		testObject := &irminmodels.Object{
			Name:        "integration-save-test.json",
			Path:        "integration/save/integration-save-test.json",
			Type:        irminmodels.ObjectTypeStructured,
			ContentType: "application/json",
			SizeBytes:   1024,
		}

		savedObject, saveErr := lib.SaveObject(
			ts.DB,
			logger,
			ts.Env,
			testObject,
			ts.Env.TestBranch,
			repository.ID,
		)

		assert.NoError(t, saveErr)
		assert.NotNil(t, savedObject)
		assert.Equal(t, savedObject.Name, "integration-save-test.json")
		assert.Equal(t, savedObject.Path, "integration/save/integration-save-test.json")
		assert.Equal(t, savedObject.RepositoryID, repository.ID)
		assert.Equal(t, savedObject.RepositoryRef, ts.Env.TestBranch)
		assert.NotNil(t, savedObject.Repository)

		// Verify parent objects were created
		parentPath := "integration/save"
		parentObject, findErr := ts.DB.FindObject(&parentPath, &repository.ID, &ts.Env.TestBranch)
		assert.NoError(t, findErr)
		assert.NotNil(t, parentObject)
		assert.Equal(t, parentObject.Type, irminmodels.ObjectTypeGroup)
	})

	t.Run("GetObjectIntegrationWithRefresh", func(t *testing.T) {
		// This test requires an object that exists in the data engine
		if ts.Env.TestObjectName == "" {
			t.Skip("TestObjectName not configured in environment")
		}

		// Test GetObject function with cache refresh
		retrievedObject, getErr := lib.GetObject(
			ctx,
			"en",
			ts.DB,
			logger,
			ts.Env,
			workspace,
			repository,
			ts.Env.TestObjectName,
			ts.Env.TestBranch,
			true, // Ignore cache to force refresh
		)

		assert.NoError(t, getErr)
		assert.NotNil(t, retrievedObject)
		assert.Equal(t, retrievedObject.Name, ts.Env.TestObjectName)
		assert.Equal(t, retrievedObject.RepositoryID, repository.ID)
		assert.Equal(t, retrievedObject.RepositoryRef, ts.Env.TestBranch)
		assert.NotNil(t, retrievedObject.Repository)

		// Test getting the same object from cache
		cachedObject, cacheErr := lib.GetObject(
			ctx,
			"en",
			ts.DB,
			logger,
			ts.Env,
			workspace,
			repository,
			ts.Env.TestObjectName,
			ts.Env.TestBranch,
			false, // Use cache
		)

		assert.NoError(t, cacheErr)
		assert.NotNil(t, cachedObject)
		assert.Equal(t, cachedObject.ID, retrievedObject.ID) // Should be the same object
	})

	t.Run("CacheConsistencyTest", func(t *testing.T) {
		manager := repositoryObjectCache.NewManager(ts.DB, logger, ts.Env)

		// Create a complex object structure
		complexObject := &irminmodels.Object{
			Name: "consistency-test-dir",
			Path: "consistency/test/consistency-test-dir",
			Type: irminmodels.ObjectTypeGroup,
			Children: []irminmodels.Object{
				{
					Name:        "file1.json",
					Path:        "consistency/test/consistency-test-dir/file1.json",
					Type:        irminmodels.ObjectTypeStructured,
					ContentType: "application/json",
					SizeBytes:   100,
				},
				{
					Name: "subdir",
					Path: "consistency/test/consistency-test-dir/subdir",
					Type: irminmodels.ObjectTypeGroup,
					Children: []irminmodels.Object{
						{
							Name:        "nested-file.csv",
							Path:        "consistency/test/consistency-test-dir/subdir/nested-file.csv",
							Type:        irminmodels.ObjectTypeStructured,
							ContentType: "text/csv",
							SizeBytes:   200,
						},
					},
				},
			},
		}

		flatObjects, getFlatObjectsErr := ts.DB.GetFlatDBObjects(repository.ID, ts.Env.TestBranch)
		assert.NoError(t, getFlatObjectsErr)

		parentPath := "consistency/test"
		processedComplex, processErr := manager.ProcessEngineObject(
			complexObject,
			flatObjects,
			ts.Env.TestBranch,
			repository.ID,
			&parentPath,
			nil,
		)

		assert.NoError(t, processErr)
		assert.NotNil(t, processedComplex)
		assert.Equal(t, len(processedComplex.Children), 2)

		// Verify all objects were created with correct relationships
		directChild := processedComplex.Children[0]
		subdirectory := processedComplex.Children[1]

		assert.Equal(t, *directChild.ParentID, processedComplex.ID)
		assert.Equal(t, *subdirectory.ParentID, processedComplex.ID)

		// For the subdirectory, verify its children
		if subdirectory.Type == irminmodels.ObjectTypeGroup {
			assert.Equal(t, len(subdirectory.Children), 1)
			nestedFile := subdirectory.Children[0]
			assert.Equal(t, *nestedFile.ParentID, subdirectory.ID)
		}

		// Verify cache consistency by retrieving objects individually
		directChildPath := "consistency/test/consistency-test-dir/file1.json"
		retrievedDirectChild, findErr := ts.DB.FindObject(&directChildPath, &repository.ID, &ts.Env.TestBranch)
		assert.NoError(t, findErr)
		assert.NotNil(t, retrievedDirectChild)
		assert.Equal(t, retrievedDirectChild.ID, directChild.ID)

		subDirPath := "consistency/test/consistency-test-dir/subdir"
		retrievedSubDir, findErr := ts.DB.FindObject(&subDirPath, &repository.ID, &ts.Env.TestBranch)
		assert.NoError(t, findErr)
		assert.NotNil(t, retrievedSubDir)
		assert.Equal(t, retrievedSubDir.ID, subdirectory.ID)
	})

	t.Run("CacheRefreshThresholdTest", func(t *testing.T) {
		manager := repositoryObjectCache.NewManager(ts.DB, logger, ts.Env)

		// Test cache refresh threshold behavior
		freshObject := &db.RepositoryObject{
			Model: gorm.Model{
				UpdatedAt: time.Now().Add(-30 * time.Minute), // 30 minutes old
			},
		}

		// Should not need refresh (< 1 hour)
		needsRefresh := manager.ShouldRefreshCache(freshObject, false)
		assert.False(t, needsRefresh)

		staleObject := &db.RepositoryObject{
			Model: gorm.Model{
				UpdatedAt: time.Now().Add(-90 * time.Minute), // 90 minutes old
			},
		}

		// Should need refresh (> 1 hour)
		needsRefresh = manager.ShouldRefreshCache(staleObject, false)
		assert.True(t, needsRefresh)

		// Force refresh should always return true
		needsRefresh = manager.ShouldRefreshCache(freshObject, true)
		assert.True(t, needsRefresh)
	})

	t.Run("PerformanceConsistencyTest", func(t *testing.T) {
		manager := repositoryObjectCache.NewManager(ts.DB, logger, ts.Env)

		// Create multiple objects to test performance consistency
		objects := make([]*irminmodels.Object, 10)
		for i := range 10 {
			objects[i] = &irminmodels.Object{
				Name:        "perf-test-" + string(rune(i+'0')) + ".json",
				Path:        "performance/perf-test-" + string(rune(i+'0')) + ".json",
				Type:        irminmodels.ObjectTypeStructured,
				ContentType: "application/json",
				SizeBytes:   int64(100 * (i + 1)),
			}
		}

		flatObjects, getFlatObjectsErr := ts.DB.GetFlatDBObjects(repository.ID, ts.Env.TestBranch)
		assert.NoError(t, getFlatObjectsErr)

		parentPath := "performance"

		// Process all objects and measure basic performance
		start := time.Now()
		for _, obj := range objects {
			processedObj, processErr := manager.ProcessEngineObject(
				obj,
				flatObjects,
				ts.Env.TestBranch,
				repository.ID,
				&parentPath,
				nil,
			)
			assert.NoError(t, processErr)
			assert.NotNil(t, processedObj)
			assert.Equal(t, processedObj.Name, obj.Name)
		}
		duration := time.Since(start)

		t.Logf("Processed %d objects in %v", len(objects), duration)

		// Basic performance check - should complete within reasonable time
		if duration >= 30*time.Second {
			t.Fatalf("Processing took too long: %v", duration)
		}
	})
}

func TestErrorHandlingIntegration(t *testing.T) {
	ts := lib.GetTestSuite()
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	ctx := t.Context()

	workspace, err := ts.DB.GetWorkspaceBySlug(ts.Env.TestWorkspace)
	if err != nil {
		t.Fatalf("Failed to get test workspace: %v", err)
	}

	repository, err := ts.DB.GetRepositoryBySlugAndWorkspaceID(ts.Env.TestRepository, workspace.ID)
	if err != nil {
		t.Fatalf("Failed to get test repository: %v", err)
	}

	t.Run("GetNonExistentObjectIntegration", func(t *testing.T) {
		// Test getting a non-existent object through the full integration
		_, getErr := lib.GetObject(
			ctx,
			"en",
			ts.DB,
			logger,
			ts.Env,
			workspace,
			repository,
			"definitely/does/not/exist.json",
			ts.Env.TestBranch,
			true, // Force refresh
		)

		// Should get an error
		assert.Error(t, getErr)
		assert.True(t, strings.Contains(getErr.Error(), "error getting object from data engine"))
	})

	t.Run("InvalidLocaleHandling", func(t *testing.T) {
		manager := repositoryObjectCache.NewManager(ts.DB, logger, ts.Env)

		// Test with invalid locale
		_, refreshErr := manager.RefreshObjectFromDataEngine(
			ctx,
			"invalid-locale-xyz",
			workspace,
			repository,
			"some/path.json",
			ts.Env.TestBranch,
			nil,
		)

		// Should get an error (might be from data engine initialization or request)
		assert.Error(t, refreshErr)
	})
}

func TestConcurrencySupport(t *testing.T) {
	ts := lib.GetTestSuite()
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	workspace, err := ts.DB.GetWorkspaceBySlug(ts.Env.TestWorkspace)
	if err != nil {
		t.Fatalf("Failed to get test workspace: %v", err)
	}

	repository, err := ts.DB.GetRepositoryBySlugAndWorkspaceID(ts.Env.TestRepository, workspace.ID)
	if err != nil {
		t.Fatalf("Failed to get test repository: %v", err)
	}

	initialObjectIDs := getObjectIDsFromCache(t, ts.DB, repository.ID, ts.Env.TestBranch)
	defer cleanupCache(t, ts.DB, repository.ID, ts.Env.TestBranch, initialObjectIDs)

	t.Run("ConcurrentCacheManagerInstances", func(t *testing.T) {
		// Test that multiple cache manager instances can work simultaneously
		manager1 := repositoryObjectCache.NewManager(ts.DB, logger, ts.Env)
		manager2 := repositoryObjectCache.NewManager(ts.DB, logger, ts.Env)

		// Both managers should work independently
		assert.NotNil(t, manager1)
		assert.NotNil(t, manager2)

		// Test with same input on both managers
		needsRefresh1 := manager1.ShouldRefreshCache(nil, false)
		needsRefresh2 := manager2.ShouldRefreshCache(nil, false)

		assert.True(t, needsRefresh1)
		assert.True(t, needsRefresh2)
		assert.Equal(t, needsRefresh1, needsRefresh2)
	})

	t.Run("ConcurrentObjectProcessing", func(t *testing.T) {
		manager := repositoryObjectCache.NewManager(ts.DB, logger, ts.Env)

		// Create objects that can be processed concurrently
		objects := []*irminmodels.Object{
			{
				Name:        "concurrent-1.json",
				Path:        "concurrent/concurrent-1.json",
				Type:        irminmodels.ObjectTypeStructured,
				ContentType: "application/json",
				SizeBytes:   100,
			},
			{
				Name:        "concurrent-2.csv",
				Path:        "concurrent/concurrent-2.csv",
				Type:        irminmodels.ObjectTypeStructured,
				ContentType: "text/csv",
				SizeBytes:   200,
			},
		}

		flatObjects, getFlatObjectsErr := ts.DB.GetFlatDBObjects(repository.ID, ts.Env.TestBranch)
		assert.NoError(t, getFlatObjectsErr)

		parentPath := "concurrent"
		done := make(chan bool, len(objects))
		errors := make(chan error, len(objects))

		// Process objects concurrently
		for _, obj := range objects {
			go func(object *irminmodels.Object) {
				_, processErr := manager.ProcessEngineObject(
					object,
					flatObjects,
					ts.Env.TestBranch,
					repository.ID,
					&parentPath,
					nil,
				)
				if processErr != nil {
					errors <- processErr
				} else {
					done <- true
				}
			}(obj)
		}

		// Wait for all to complete
		completed := 0
		for completed < len(objects) {
			select {
			case <-done:
				completed++
			case processErr := <-errors:
				t.Fatalf("Concurrent processing failed: %v", processErr)
			case <-time.After(10 * time.Second):
				t.Fatal("Concurrent processing timed out")
			}
		}

		// Verify all objects were created
		for _, obj := range objects {
			retrievedObj, findErr := ts.DB.FindObject(&obj.Path, &repository.ID, &ts.Env.TestBranch)
			assert.NoError(t, findErr)
			assert.NotNil(t, retrievedObj)
			assert.Equal(t, retrievedObj.Name, obj.Name)
		}
	})
}
