package lib_test

import (
	"irmin-api/lib"
	"irmin-api/utils"
	"testing"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	"github.com/zeebo/assert"
)

func TestSaveObject(t *testing.T) {
	ts := lib.GetTestSuite()

	// Find the test workspace
	workspace, err := ts.DB.GetWorkspaceBySlug(ts.Env.TestWorkspace)
	if err != nil {
		t.Skipf("Skipping integration test - test workspace not found: %v", err)
	}

	// Find the test repository
	repository, err := ts.DB.GetRepositoryBySlugAndWorkspaceID(ts.Env.TestRepository, workspace.ID)
	if err != nil {
		t.Skipf("Skipping integration test - test repository not found: %v", err)
	}

	// Record initial cache state for cleanup
	initialObjectIDs := getObjectIDsFromCache(t, ts.DB, repository.ID, ts.Env.TestBranch)

	t.Run("SaveSimpleObject", func(t *testing.T) {
		// Create a test object to save
		testObject := &irminmodels.Object{
			Name:        "test-save-file.json",
			Path:        "test-save-file.json",
			Type:        irminmodels.ObjectTypeStructured,
			ContentType: "application/json",
			SizeBytes:   1024,
		}

		// Save the object
		savedObject, saveErr1 := lib.SaveObject(
			ts.DB,
			ts.Logger,
			ts.Env,
			testObject,
			ts.Env.TestBranch,
			repository.ID,
		)

		assert.NoError(t, saveErr1)
		assert.NotNil(t, savedObject)
		assert.Equal(t, savedObject.Name, testObject.Name)
		assert.Equal(t, savedObject.Path, testObject.Path)
		assert.Equal(t, savedObject.Type, testObject.Type)
		assert.Equal(t, savedObject.ContentType, testObject.ContentType)
		assert.Equal(t, savedObject.RepositoryID, repository.ID)
		assert.Equal(t, savedObject.RepositoryRef, ts.Env.TestBranch)
		assert.NotNil(t, savedObject.Repository)
		assert.Equal(t, savedObject.Repository.ID, repository.ID)

		// Verify object was saved to database
		foundObject, findErr := ts.DB.FindObject(&testObject.Path, &repository.ID, &ts.Env.TestBranch)
		assert.NoError(t, findErr)
		assert.NotNil(t, foundObject)
		assert.Equal(t, foundObject.ID, savedObject.ID)
	})

	t.Run("SaveNestedObjectWithParent", func(t *testing.T) {
		// Create a test object with nested path
		testObject := &irminmodels.Object{
			Name:        "nested-file.csv",
			Path:        "data/analytics/nested-file.csv",
			Type:        irminmodels.ObjectTypeStructured,
			ContentType: "text/csv",
			SizeBytes:   2048,
		}

		// Save the object
		savedObject, saveErr2 := lib.SaveObject(
			ts.DB,
			ts.Logger,
			ts.Env,
			testObject,
			ts.Env.TestBranch,
			repository.ID,
		)

		assert.NoError(t, saveErr2)
		assert.NotNil(t, savedObject)
		assert.Equal(t, savedObject.Name, "nested-file.csv")
		assert.Equal(t, savedObject.Path, "data/analytics/nested-file.csv")
		assert.Equal(t, savedObject.Type, irminmodels.ObjectTypeStructured)
		assert.NotNil(t, savedObject.ParentID)

		// Verify parent objects were created
		// Remove trailing slash for DB lookup
		dbParentPath := "data/analytics"
		parentObject, findErr := ts.DB.FindObject(&dbParentPath, &repository.ID, &ts.Env.TestBranch)
		if findErr == nil {
			assert.NotNil(t, parentObject)
			assert.Equal(t, parentObject.Type, irminmodels.ObjectTypeGroup)
			assert.Equal(t, parentObject.RepositoryID, repository.ID)
			assert.NotNil(t, parentObject.Repository)

			// Verify parent-child relationship
			assert.Equal(t, *savedObject.ParentID, parentObject.ID)
		}

		// Verify grandparent if it exists
		grandParentPath := "data"
		grandParentObject, findErr := ts.DB.FindObject(&grandParentPath, &repository.ID, &ts.Env.TestBranch)
		if findErr == nil {
			assert.NotNil(t, grandParentObject)
			assert.Equal(t, grandParentObject.Type, irminmodels.ObjectTypeGroup)
			assert.Equal(t, grandParentObject.RepositoryID, repository.ID)
		}
	})

	t.Run("SaveObjectWithPathNormalization", func(t *testing.T) {
		// Create object with leading slash (should be normalized)
		testObject := &irminmodels.Object{
			Name:        "normalized.json",
			Path:        "/test/path/normalized.json",
			Type:        irminmodels.ObjectTypeStructured,
			ContentType: "application/json",
			SizeBytes:   512,
		}

		// Save the object
		savedObject, saveErr3 := lib.SaveObject(
			ts.DB,
			ts.Logger,
			ts.Env,
			testObject,
			ts.Env.TestBranch,
			repository.ID,
		)

		assert.NoError(t, saveErr3)
		assert.NotNil(t, savedObject)

		// Verify path was normalized (no leading slash)
		assert.Equal(t, savedObject.Path, "test/path/normalized.json")
		assert.Equal(t, savedObject.Name, "normalized.json")

		// Verify object details were parsed correctly
		assert.Equal(t, savedObject.Type, irminmodels.ObjectTypeStructured)
		assert.Equal(t, savedObject.ContentType, "application/json")
	})

	t.Run("SaveHiddenDirectoryObject", func(t *testing.T) {
		// Create a hidden directory object
		testObject := &irminmodels.Object{
			Name: ".config",
			Path: ".config",
			Type: irminmodels.ObjectTypeGroup,
		}

		// Save the object
		savedObject, saveErr4 := lib.SaveObject(
			ts.DB,
			ts.Logger,
			ts.Env,
			testObject,
			ts.Env.TestBranch,
			repository.ID,
		)

		assert.NoError(t, saveErr4)
		assert.NotNil(t, savedObject)
		assert.Equal(t, savedObject.Name, ".config")
		assert.Equal(t, savedObject.Path, ".config/") // Should have trailing slash for groups
		assert.Equal(t, savedObject.Type, irminmodels.ObjectTypeGroup)
		assert.Equal(t, savedObject.ContentType, "") // Groups should have empty content type
	})

	t.Run("SaveObjectWithChildren", func(t *testing.T) {
		// Create a parent object with children
		parentObject := &irminmodels.Object{
			Name: "parent-folder",
			Path: "parent-folder",
			Type: irminmodels.ObjectTypeGroup,
			Children: []irminmodels.Object{
				{
					Name:        "child1.json",
					Path:        "parent-folder/child1.json",
					Type:        irminmodels.ObjectTypeStructured,
					ContentType: "application/json",
					SizeBytes:   256,
				},
				{
					Name:        "child2.csv",
					Path:        "parent-folder/child2.csv",
					Type:        irminmodels.ObjectTypeStructured,
					ContentType: "text/csv",
					SizeBytes:   512,
				},
			},
		}

		// Save the parent object (should also save children)
		savedParent, saveErr5 := lib.SaveObject(
			ts.DB,
			ts.Logger,
			ts.Env,
			parentObject,
			ts.Env.TestBranch,
			repository.ID,
		)

		assert.NoError(t, saveErr5)
		assert.NotNil(t, savedParent)
		assert.Equal(t, savedParent.Type, irminmodels.ObjectTypeGroup)
		assert.Equal(t, savedParent.Path, "parent-folder/") // Groups should have trailing slash

		// Verify children were saved
		assert.Equal(t, len(savedParent.Children), 2)
		for _, child := range savedParent.Children {
			assert.Equal(t, child.RepositoryID, repository.ID)
			assert.Equal(t, child.RepositoryRef, ts.Env.TestBranch)
			assert.NotNil(t, child.ParentID)
			assert.Equal(t, *child.ParentID, savedParent.ID)
			assert.NotNil(t, child.Repository)
		}
	})

	t.Run("UpdateExistingObject", func(t *testing.T) {
		// Create initial object
		testObject := &irminmodels.Object{
			Name:        "update-test.json",
			Path:        "update-test.json",
			Type:        irminmodels.ObjectTypeStructured,
			ContentType: "application/json",
			SizeBytes:   1000,
		}

		// Save initial object
		initialObject, saveErr6 := lib.SaveObject(
			ts.DB,
			ts.Logger,
			ts.Env,
			testObject,
			ts.Env.TestBranch,
			repository.ID,
		)
		assert.NoError(t, saveErr6)
		initialID := initialObject.ID

		// Update the object with new data
		updatedObject := &irminmodels.Object{
			Name:        "update-test.json",
			Path:        "update-test.json",
			Type:        irminmodels.ObjectTypeStructured,
			ContentType: "application/json",
			SizeBytes:   2000, // Changed size
		}

		// Save updated object
		savedUpdated, saveErr7 := lib.SaveObject(
			ts.DB,
			ts.Logger,
			ts.Env,
			updatedObject,
			ts.Env.TestBranch,
			repository.ID,
		)

		assert.NoError(t, saveErr7)
		assert.NotNil(t, savedUpdated)

		// Should have same ID (updated, not created new)
		assert.Equal(t, savedUpdated.ID, initialID)
		assert.Equal(t, savedUpdated.SizeBytes, int64(2000))
	})

	t.Run("SaveRootObjectWithParentID", func(t *testing.T) {
		// Create a root-level test object
		rootObject := &irminmodels.Object{
			Name:        "root-level-test.json",
			Path:        "root-level-test.json",
			Type:        irminmodels.ObjectTypeStructured,
			ContentType: "application/json",
			SizeBytes:   512,
		}

		// Save the root-level object
		savedObject, saveErr := lib.SaveObject(
			ts.DB,
			ts.Logger,
			ts.Env,
			rootObject,
			ts.Env.TestBranch,
			repository.ID,
		)

		assert.NoError(t, saveErr)
		assert.NotNil(t, savedObject)
		assert.Equal(t, savedObject.Name, rootObject.Name)
		assert.Equal(t, savedObject.Path, rootObject.Path)

		// CRITICAL: Verify that root-level objects get a ParentID (pointing to root object)
		assert.NotNil(t, savedObject.ParentID)

		// Verify that the root object exists and is the parent
		rootDBObject, findRootErr := ts.DB.FindObject(utils.StringPtr(""), &repository.ID, &ts.Env.TestBranch)
		assert.NoError(t, findRootErr)
		assert.NotNil(t, rootDBObject)
		assert.Equal(t, *savedObject.ParentID, rootDBObject.ID)

		// Verify root object properties
		assert.Equal(t, "", rootDBObject.Path)
		assert.Equal(t, "", rootDBObject.Name)
		assert.Equal(t, irminmodels.ObjectTypeGroup, rootDBObject.Type)
		assert.Nil(t, rootDBObject.ParentID)
	})

	// Cleanup: Remove any objects that weren't there initially
	cleanupCache(t, ts.DB, repository.ID, ts.Env.TestBranch, initialObjectIDs)
}

func TestNoDuplicateObjects(t *testing.T) {
	ts := lib.GetTestSuite()

	// Find the test workspace
	workspace, err := ts.DB.GetWorkspaceBySlug(ts.Env.TestWorkspace)
	if err != nil {
		t.Skipf("Skipping integration test - test workspace not found: %v", err)
	}

	// Find the test repository
	repository, err := ts.DB.GetRepositoryBySlugAndWorkspaceID(ts.Env.TestRepository, workspace.ID)
	if err != nil {
		t.Skipf("Skipping integration test - test repository not found: %v", err)
	}

	// Count all objects before
	var beforeCount int64
	err = ts.DB.Table("repository_objects").Where("repository_id = ? AND repository_ref = ?",
		repository.ID, ts.Env.TestBranch).Count(&beforeCount).Error
	assert.NoError(t, err)

	// Count root objects before
	var beforeRootCount int64
	err = ts.DB.Table("repository_objects").Where("path = ? AND repository_id = ? AND repository_ref = ?",
		"", repository.ID, ts.Env.TestBranch).Count(&beforeRootCount).Error
	assert.NoError(t, err)

	t.Logf("Before: Total objects: %d, Root objects: %d", beforeCount, beforeRootCount)

	// Create a nested object that might trigger parent creation
	nestedObject := &irminmodels.Object{
		Name:        "deep-file.json",
		Path:        "level1/level2/level3/deep-file.json",
		Type:        irminmodels.ObjectTypeStructured,
		ContentType: "application/json",
		SizeBytes:   1000,
	}

	// Save the nested object
	savedObject, saveErr8 := lib.SaveObject(ts.DB, ts.Logger, ts.Env, nestedObject, ts.Env.TestBranch, repository.ID)
	assert.NoError(t, saveErr8)
	assert.NotNil(t, savedObject)

	// Count all objects after
	var afterCount int64
	err = ts.DB.Table("repository_objects").Where("repository_id = ? AND repository_ref = ?",
		repository.ID, ts.Env.TestBranch).Count(&afterCount).Error
	assert.NoError(t, err)

	// Count root objects after
	var afterRootCount int64
	err = ts.DB.Table("repository_objects").Where("path = ? AND repository_id = ? AND repository_ref = ?",
		"", repository.ID, ts.Env.TestBranch).Count(&afterRootCount).Error
	assert.NoError(t, err)

	t.Logf("After: Total objects: %d, Root objects: %d", afterCount, afterRootCount)

	// Root count should not have increased
	assert.Equal(t, afterRootCount, beforeRootCount)

	// Cleanup
	cleanupPaths := []string{
		"level1/level2/level3/deep-file.json",
		"level1/level2/level3",
		"level1/level2",
		"level1",
	}

	for _, path := range cleanupPaths {
		tx := ts.DB.Begin()
		deleteObjectsErr := ts.DB.DeleteObjects(tx, &path, &repository.ID, &ts.Env.TestBranch)
		if deleteObjectsErr != nil {
			tx.Rollback()
		} else {
			tx.Commit()
		}
	}
}
