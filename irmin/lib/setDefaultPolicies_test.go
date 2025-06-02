package lib_test

import (
	"irmin-api/db"
	"irmin-api/lib"
	"irmin-api/tests"
	"testing"

	"github.com/zeebo/assert"
)

const (
	expectedAmountOfPolicies = 203
)

func TestSetDefaultPolicies(t *testing.T) {
	env, d, err := tests.InitTestEnv()
	if err != nil {
		t.Fatalf("Failed to initialise test environment: %v", err)
	}

	// Find the test workspace
	workspace, err := d.GetWorkspaceBySlug(env.TestWorkspace)
	if err != nil {
		t.Fatalf("Failed to get test workspace: %v", err)
	}

	// Delete all existing policies for the workspace
	if err = d.Where("workspace_id = ?", workspace.ID).Delete(&db.Policy{}).Error; err != nil {
		t.Fatalf("Failed to delete existing policies: %v", err)
	}

	// Set the default policies
	err = lib.SetDefaultPolicies(d, workspace.ID, true)
	if err != nil {
		t.Fatalf("Failed to set default policies: %v", err)
	}

	// Get all policies for the workspace
	var policies []db.Policy
	if err = d.Where("workspace_id = ?", workspace.ID).Find(&policies).Error; err != nil {
		t.Fatalf("Failed to get policies: %v", err)
	}

	// Make sure we have the correct number of policies
	assert.Equal(t, len(policies), expectedAmountOfPolicies)
}
