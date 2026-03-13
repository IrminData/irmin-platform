package repositoryobjectcache_test

import (
	"irmin-api/db"
	"irmin-api/lib"
	repositoryObjectCache "irmin-api/lib/repository-object-cache"
	"irmin-api/utils"
	"log/slog"
	"os"
	"testing"
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/zeebo/assert"
	"gorm.io/gorm"
)

func TestNewManager(t *testing.T) {
	ts := lib.GetTestSuite()
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	t.Run("CreateManager", func(t *testing.T) {
		manager := repositoryObjectCache.NewManager(ts.DB, logger, ts.Env)

		assert.NotNil(t, manager)
		// We can't directly test the private fields, but we can verify the manager works
		// by calling a method that uses these fields
		result := manager.ShouldRefreshCache(nil, false)
		assert.True(t, result) // Should return true for nil object
	})
}

func TestShouldRefreshCache(t *testing.T) {
	ts := lib.GetTestSuite()
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	manager := repositoryObjectCache.NewManager(ts.DB, logger, ts.Env)

	t.Run("IgnoreCache", func(t *testing.T) {
		result := manager.ShouldRefreshCache(nil, true)
		assert.True(t, result)

		// Even with a fresh object, should return true when ignoreCache is true
		freshObject := &db.RepositoryObject{
			Model: gorm.Model{
				UpdatedAt: time.Now(),
			},
		}
		result = manager.ShouldRefreshCache(freshObject, true)
		assert.True(t, result)
	})

	t.Run("NilObject", func(t *testing.T) {
		result := manager.ShouldRefreshCache(nil, false)
		assert.True(t, result)
	})

	t.Run("FreshObject", func(t *testing.T) {
		freshObject := &db.RepositoryObject{
			Model: gorm.Model{
				UpdatedAt: time.Now(),
			},
		}
		result := manager.ShouldRefreshCache(freshObject, false)
		assert.False(t, result)
	})

	t.Run("StaleObject", func(t *testing.T) {
		staleObject := &db.RepositoryObject{
			Model: gorm.Model{
				UpdatedAt: time.Now().Add(-2 * time.Hour), // Older than cache max age
			},
		}
		result := manager.ShouldRefreshCache(staleObject, false)
		assert.True(t, result)
	})
}

func TestProcessEngineObject(t *testing.T) {
	ts := lib.GetTestSuite()
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	manager := repositoryObjectCache.NewManager(ts.DB, logger, ts.Env)

	// Find the test workspace and repository
	workspace, err := ts.DB.GetWorkspaceBySlug(ts.Env.TestWorkspace)
	if err != nil {
		t.Skipf("Skipping integration test - test workspace not found: %v", err)
	}

	repository, err := ts.DB.GetRepositoryBySlugAndWorkspaceID(ts.Env.TestRepository, workspace.ID)
	if err != nil {
		t.Skipf("Skipping integration test - test repository not found: %v", err)
	}

	// Record initial cache state for cleanup
	initialObjectIDs := getObjectIDsFromCache(t, ts.DB, repository.ID, ts.Env.TestBranch)
	defer cleanupCache(t, ts.DB, repository.ID, ts.Env.TestBranch, initialObjectIDs)

	t.Run("ProcessSimpleObject", func(t *testing.T) {
		testObject := &irminmodels.Object{
			Name:        "test-cache-simple.json",
			Path:        "/test-cache-simple.json", // With leading slash to test trimming
			Type:        irminmodels.ObjectTypeStructured,
			ContentType: "application/json",
			SizeBytes:   1024,
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
		assert.Equal(t, processedObject.Name, "test-cache-simple.json")
		assert.Equal(t, processedObject.Path, "test-cache-simple.json") // Should be trimmed
		assert.Equal(t, processedObject.Type, irminmodels.ObjectTypeStructured)
		assert.Equal(t, processedObject.RepositoryID, repository.ID)
		assert.Equal(t, processedObject.RepositoryRef, ts.Env.TestBranch)
		assert.NotNil(t, processedObject.Repository)
		assert.True(t, processedObject.ID > 0) // Should have been assigned an ID
	})

	t.Run("ProcessNestedObject", func(t *testing.T) {
		testObject := &irminmodels.Object{
			Name:        "nested-cache-test.csv",
			Path:        "cache-test/nested/nested-cache-test.csv",
			Type:        irminmodels.ObjectTypeStructured,
			ContentType: "text/csv",
			SizeBytes:   2048,
		}

		flatObjects, getFlatObjectsErr := ts.DB.GetFlatDBObjects(repository.ID, ts.Env.TestBranch)
		assert.NoError(t, getFlatObjectsErr)

		parentPath := "cache-test/nested"
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
		assert.Equal(t, processedObject.Name, "nested-cache-test.csv")
		assert.Equal(t, processedObject.Path, "cache-test/nested/nested-cache-test.csv")
		assert.NotNil(t, processedObject.ParentID) // Should have a parent
	})

	t.Run("ProcessObjectWithChildren", func(t *testing.T) {
		parentObject := &irminmodels.Object{
			Name: "cache-parent",
			Path: "cache-parent",
			Type: irminmodels.ObjectTypeGroup,
			Children: []irminmodels.Object{
				{
					Name:        "child1.json",
					Path:        "cache-parent/child1.json",
					Type:        irminmodels.ObjectTypeStructured,
					ContentType: "application/json",
					SizeBytes:   256,
				},
				{
					Name:        "child2.csv",
					Path:        "cache-parent/child2.csv",
					Type:        irminmodels.ObjectTypeStructured,
					ContentType: "text/csv",
					SizeBytes:   512,
				},
			},
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
		assert.NotNil(t, processedParent)
		assert.Equal(t, processedParent.Type, irminmodels.ObjectTypeGroup)
		assert.Equal(t, len(processedParent.Children), 2)

		// Verify children were processed correctly
		for _, child := range processedParent.Children {
			assert.Equal(t, child.RepositoryID, repository.ID)
			assert.Equal(t, child.RepositoryRef, ts.Env.TestBranch)
			assert.NotNil(t, child.ParentID)
			assert.Equal(t, *child.ParentID, processedParent.ID)
			assert.NotNil(t, child.Repository)
		}
	})

	t.Run("UpdateExistingObject", func(t *testing.T) {
		// First create an object
		testObject := &irminmodels.Object{
			Name:        "update-cache-test.json",
			Path:        "update-cache-test.json",
			Type:        irminmodels.ObjectTypeStructured,
			ContentType: "application/json",
			SizeBytes:   1000,
		}

		flatObjects, getFlatObjectsErr := ts.DB.GetFlatDBObjects(repository.ID, ts.Env.TestBranch)
		assert.NoError(t, getFlatObjectsErr)

		initialObject, processErr := manager.ProcessEngineObject(
			testObject,
			flatObjects,
			ts.Env.TestBranch,
			repository.ID,
			nil,
			nil,
		)
		assert.NoError(t, processErr)
		initialID := initialObject.ID

		// Now update it with new data
		updatedObject := &irminmodels.Object{
			Name:        "update-cache-test.json",
			Path:        "update-cache-test.json",
			Type:        irminmodels.ObjectTypeStructured,
			ContentType: "application/json",
			SizeBytes:   2000, // Changed size
		}

		// Add the existing object to flat objects to simulate finding it in cache
		flatObjects = append(flatObjects, db.RepositoryObject{
			Model: gorm.Model{ID: initialID},
			Path:  "update-cache-test.json",
		})

		processedUpdated, updateErr := manager.ProcessEngineObject(
			updatedObject,
			flatObjects,
			ts.Env.TestBranch,
			repository.ID,
			nil,
			nil,
		)

		assert.NoError(t, updateErr)
		assert.NotNil(t, processedUpdated)
		assert.Equal(t, processedUpdated.ID, initialID)          // Should have same ID
		assert.Equal(t, processedUpdated.SizeBytes, int64(2000)) // Should be updated
	})
}

func TestProcessEngineObjectEdgeCases(t *testing.T) {
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

	t.Run("RootPathHandling", func(t *testing.T) {
		testObject := &irminmodels.Object{
			Name: "root-test.json",
			Path: "root-test.json",
			Type: irminmodels.ObjectTypeStructured,
		}

		flatObjects, getFlatObjectsErr := ts.DB.GetFlatDBObjects(repository.ID, ts.Env.TestBranch)
		assert.NoError(t, getFlatObjectsErr)

		// Test with empty parent path (root)
		emptyParentPath := ""
		processedObject, processErr := manager.ProcessEngineObject(
			testObject,
			flatObjects,
			ts.Env.TestBranch,
			repository.ID,
			&emptyParentPath,
			nil,
		)

		assert.NoError(t, processErr)
		assert.NotNil(t, processedObject)
		assert.NotNil(t, processedObject.ParentID) // Should have root object as parent

		// Verify root object was created
		rootObject, findErr := ts.DB.FindObject(utils.StringPtr(""), &repository.ID, &ts.Env.TestBranch)
		assert.NoError(t, findErr)
		assert.NotNil(t, rootObject)
		assert.Equal(t, *processedObject.ParentID, rootObject.ID)
	})

	t.Run("SlashOnlyParentPath", func(t *testing.T) {
		testObject := &irminmodels.Object{
			Name: "slash-test.json",
			Path: "slash-test.json",
			Type: irminmodels.ObjectTypeStructured,
		}

		flatObjects, getFlatObjectsErr := ts.DB.GetFlatDBObjects(repository.ID, ts.Env.TestBranch)
		assert.NoError(t, getFlatObjectsErr)

		// Test with "/" parent path (also root)
		slashParentPath := "/"
		processedObject, processErr := manager.ProcessEngineObject(
			testObject,
			flatObjects,
			ts.Env.TestBranch,
			repository.ID,
			&slashParentPath,
			nil,
		)

		assert.NoError(t, processErr)
		assert.NotNil(t, processedObject)
		assert.NotNil(t, processedObject.ParentID) // Should have root object as parent

		// Verify root object was created
		rootObject, findErr := ts.DB.FindObject(utils.StringPtr(""), &repository.ID, &ts.Env.TestBranch)
		assert.NoError(t, findErr)
		assert.NotNil(t, rootObject)
		assert.Equal(t, rootObject.Path, "")
		assert.Equal(t, rootObject.Name, "")
		assert.Equal(t, rootObject.Type, irminmodels.ObjectTypeGroup)
		assert.Equal(t, *processedObject.ParentID, rootObject.ID)
	})

	t.Run("RootObjectCreation", func(t *testing.T) {
		// Test that root objects are created for root-level files
		testObject := &irminmodels.Object{
			Name: "root-level-file.json",
			Path: "root-level-file.json",
			Type: irminmodels.ObjectTypeStructured,
		}

		flatObjects, getFlatObjectsErr := ts.DB.GetFlatDBObjects(repository.ID, ts.Env.TestBranch)
		assert.NoError(t, getFlatObjectsErr)

		// Test with empty parent path (indicating root level)
		emptyParentPath := ""
		processedObject, processErr := manager.ProcessEngineObject(
			testObject,
			flatObjects,
			ts.Env.TestBranch,
			repository.ID,
			&emptyParentPath,
			nil,
		)

		assert.NoError(t, processErr)
		assert.NotNil(t, processedObject)
		assert.NotNil(t, processedObject.ParentID) // Should have root object as parent

		// Verify root object exists
		rootObject, findErr := ts.DB.FindObject(utils.StringPtr(""), &repository.ID, &ts.Env.TestBranch)
		assert.NoError(t, findErr)
		assert.NotNil(t, rootObject)
		assert.Equal(t, *processedObject.ParentID, rootObject.ID)
	})
}

// Helper function to get object IDs from cache (copied from existing tests)
func getObjectIDsFromCache(t *testing.T, database *db.Database, repositoryID uint, ref string) map[uint]bool {
	flatObjects, err := database.GetFlatDBObjects(repositoryID, ref)
	if err != nil {
		t.Logf("Warning: could not get initial cache state: %v", err)
		return make(map[uint]bool)
	}

	objectIDs := make(map[uint]bool)
	for _, obj := range flatObjects {
		objectIDs[obj.ID] = true
	}
	return objectIDs
}

// Helper function to cleanup cache (copied from existing tests)
func cleanupCache(t *testing.T, database *db.Database, repositoryID uint, ref string, initialIDs map[uint]bool) {
	currentObjects, err := database.GetFlatDBObjects(repositoryID, ref)
	if err != nil {
		t.Logf("Warning: could not get current cache state for cleanup: %v", err)
		return
	}

	// Find objects that were added during the test
	for _, obj := range currentObjects {
		if !initialIDs[obj.ID] {
			// This object was added during the test, remove it using a transaction
			tx := database.Begin()
			deleteErr := database.DeleteObjects(tx, &obj.Path, &repositoryID, &ref)
			if deleteErr != nil {
				tx.Rollback()
				t.Logf("Warning: failed to cleanup object %s: %v", obj.Path, deleteErr)
			} else {
				tx.Commit()
			}
		}
	}
}
