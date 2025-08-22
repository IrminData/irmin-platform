package lib_test

import (
	"errors"
	"irmin-api/db"
	"irmin-api/lib"
	"testing"

	"gorm.io/gorm"
)

func TestSeedDefaultTags(t *testing.T) {
	ts := lib.GetTestSuite()

	// Find the test workspace.
	workspace, err := ts.DB.GetWorkspaceBySlug(ts.Env.TestWorkspace)
	if err != nil {
		t.Fatalf("Failed to get test workspace: %v", err)
	}

	// Test seeding default tags
	err = lib.SeedDefaultTags(ts.DB.DB, workspace.ID)
	if err != nil {
		t.Errorf("SeedDefaultTags failed: %v", err)
	}

	// Verify that tags were created
	var tags []db.Tag
	if findTagsErr := ts.DB.Where(&db.Tag{WorkspaceID: workspace.ID}).Find(&tags).Error; findTagsErr != nil &&
		!errors.Is(findTagsErr, gorm.ErrRecordNotFound) {
		t.Errorf("Failed to query tags: %v", findTagsErr)
	}

	// Check that we have at least the expected number of default tags
	expectedDefaultTagCount := 12 // Important, Archive, Draft, Final, Review, Data, Workflow, Template, Reference, Backup, Experimental, Production
	if len(tags) < expectedDefaultTagCount {
		t.Errorf("Expected at least %d tags, got %d", expectedDefaultTagCount, len(tags))
	}

	// Verify that all expected default tags exist
	expectedTagNames := []string{
		"Important",
		"Archive",
		"Draft",
		"Final",
		"Review",
		"Data",
		"Workflow",
		"Template",
		"Reference",
		"Backup",
		"Experimental",
		"Production",
	}
	tagNames := make(map[string]bool)
	for _, tag := range tags {
		tagNames[tag.Name] = true
	}

	for _, expectedName := range expectedTagNames {
		if !tagNames[expectedName] {
			t.Errorf("Expected tag '%s' not found", expectedName)
		}
	}

	// Test that calling SeedDefaultTags again doesn't create duplicates
	err = lib.SeedDefaultTags(ts.DB.DB, workspace.ID)
	if err != nil {
		t.Errorf("Second call to SeedDefaultTags failed: %v", err)
	}

	// Verify that the count remains the same
	if findTagsErr := ts.DB.Where(&db.Tag{WorkspaceID: workspace.ID}).Find(&tags).Error; findTagsErr != nil &&
		!errors.Is(findTagsErr, gorm.ErrRecordNotFound) {
		t.Errorf("Failed to query tags after second seeding: %v", findTagsErr)
	}

	if len(tags) < expectedDefaultTagCount {
		t.Errorf("Expected at least %d tags after second seeding, got %d", expectedDefaultTagCount, len(tags))
	}

	// Verify that all expected default tags still exist after second seeding
	tagNames = make(map[string]bool)
	for _, tag := range tags {
		tagNames[tag.Name] = true
	}

	for _, expectedName := range expectedTagNames {
		if !tagNames[expectedName] {
			t.Errorf("Expected tag '%s' not found after second seeding", expectedName)
		}
	}
}
