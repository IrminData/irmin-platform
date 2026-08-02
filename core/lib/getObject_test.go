package lib_test

import (
	"irmin-api/db"
	"irmin-api/lib"
	"log/slog"
	"os"
	"testing"

	"github.com/zeebo/assert"
)

func TestGetObject(t *testing.T) {
	ts := lib.GetTestSuite()
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	ctx := t.Context()

	// Skip if test data is not available
	_, workspace := lib.SkipIfNoTestData(t, ts.DB, ts.Env.TestUserEmail, ts.Env.TestWorkspace)

	// Skip if test repository is not available
	repository := lib.SkipIfNoTestRepository(t, ts.DB, workspace.ID, ts.Env.TestRepository)

	// Record initial cache state for cleanup
	initialObjectIDs := getObjectIDsFromCache(t, ts.DB, repository.ID, ts.Env.TestBranch)

	t.Run("GetObjectIgnoreCache", func(t *testing.T) {
		// Get the object ignoring the cache
		object, getErr := lib.GetObject(
			ctx,
			"en",
			ts.DB,
			logger,
			ts.Env,
			workspace,
			repository,
			ts.Env.TestObjectName,
			ts.Env.TestBranch,
			true,
		)
		if getErr != nil {
			t.Fatalf("Failed to get object ignoring cache: %v", getErr)
		}

		// Verify object properties
		assert.NotNil(t, object)
		assert.Equal(t, object.Name, ts.Env.TestObjectName)
		assert.Equal(t, object.RepositoryRef, ts.Env.TestBranch)
		assert.Equal(t, object.RepositoryID, repository.ID)
		assert.NotNil(t, object.Repository)
		assert.Equal(t, object.Repository.ID, repository.ID)

		// Verify object was cached
		cachedObject, findErr := ts.DB.FindObject(&object.Path, &repository.ID, &ts.Env.TestBranch)
		assert.NoError(t, findErr)
		assert.NotNil(t, cachedObject)
		assert.Equal(t, cachedObject.ID, object.ID)
	})

	t.Run("GetObjectFromCache", func(t *testing.T) {
		// Get the object using the cache
		objectCached, cacheErr := lib.GetObject(
			ctx,
			"en",
			ts.DB,
			logger,
			ts.Env,
			workspace,
			repository,
			ts.Env.TestObjectName,
			ts.Env.TestBranch,
			false,
		)
		if cacheErr != nil {
			t.Fatalf("Failed to get object using cache: %v", cacheErr)
		}

		// Verify cached object matches original
		assert.NotNil(t, objectCached)
		assert.Equal(t, objectCached.Name, ts.Env.TestObjectName)
		assert.Equal(t, objectCached.RepositoryRef, ts.Env.TestBranch)
		assert.Equal(t, objectCached.RepositoryID, repository.ID)
		assert.NotNil(t, objectCached.Repository)
		assert.Equal(t, objectCached.Repository.ID, repository.ID)
	})

	t.Run("GetNonExistentObject", func(t *testing.T) {
		// Try to get an object that doesn't exist
		_, nonExistErr := lib.GetObject(
			ctx,
			"en",
			ts.DB,
			logger,
			ts.Env,
			workspace,
			repository,
			"non/existent/file.json",
			ts.Env.TestBranch,
			true,
		)
		// Should get an error since the object doesn't exist
		assert.Error(t, nonExistErr)
	})

	t.Run("VerifyParentChildRelationships", func(t *testing.T) {
		// Test object with nested path to verify parent-child relationships
		nestedPath := "test-data/nested/example.json"

		// Try to get nested object (may not exist, which is fine)
		nestedObject, nestedErr := lib.GetObject(
			ctx,
			"en",
			ts.DB,
			logger,
			ts.Env,
			workspace,
			repository,
			nestedPath,
			ts.Env.TestBranch,
			true,
		)

		if nestedErr != nil {
			// Object doesn't exist in data engine, which is expected
			t.Logf("Nested object doesn't exist (expected): %v", nestedErr)
			return
		}

		// If object exists, verify parent relationships
		if nestedObject.ParentID != nil {
			assert.NotNil(t, nestedObject.ParentID)

			// Verify parent object exists and has proper relationships
			parentPath := "test-data/nested/"
			parentObject, parentErr := ts.DB.FindObject(&parentPath, &repository.ID, &ts.Env.TestBranch)
			if parentErr == nil {
				assert.NotNil(t, parentObject)
				assert.Equal(t, parentObject.RepositoryID, repository.ID)
				assert.NotNil(t, parentObject.Repository)
			}
		}
	})

	// Cleanup: Remove any objects that weren't there initially
	cleanupCache(t, ts.DB, repository.ID, ts.Env.TestBranch, initialObjectIDs)
}

// getObjectIDsFromCache returns a set of object IDs currently in the cache
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

// cleanupCache removes objects that weren't present initially
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
