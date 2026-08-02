package lib_test

import (
	"irmin-api/db"
	"irmin-api/lib"
	"testing"

	"github.com/zeebo/assert"
)

const (
	expectedAmountOfPolicies = 225
)

func TestSetDefaultPolicies(t *testing.T) {
	ts := lib.GetTestSuite()

	// Find the test workspace
	workspace, err := ts.DB.GetWorkspaceBySlug(ts.Env.TestWorkspace)
	if err != nil {
		t.Skipf("Skipping integration test - test workspace not found: %v", err)
	}

	// Delete all existing policies for the workspace
	if err = ts.DB.Where("workspace_id = ?", workspace.ID).Delete(&db.Policy{}).Error; err != nil {
		t.Fatalf("Failed to delete existing policies: %v", err)
	}

	// Set the default policies
	err = lib.SetDefaultPolicies(ts.DB.DB, workspace.ID, true)
	if err != nil {
		t.Fatalf("Failed to set default policies: %v", err)
	}

	// Get all policies for the workspace
	var policies []db.Policy
	if err = ts.DB.Where("workspace_id = ?", workspace.ID).Find(&policies).Error; err != nil {
		t.Fatalf("Failed to get policies: %v", err)
	}

	// Make sure we have the correct number of policies
	assert.Equal(t, len(policies), expectedAmountOfPolicies)
}
