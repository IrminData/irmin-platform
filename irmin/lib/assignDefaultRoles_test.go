package lib_test

import (
	"irmin-api/db"
	"irmin-api/lib"
	"irmin-api/tests"
	"testing"

	"github.com/zeebo/assert"
)

func TestAssignDefaultRolesToUsers(t *testing.T) {
	_, d, err := tests.InitTestEnv()
	if err != nil {
		t.Fatalf("Failed to initialise test environment: %v", err)
	}

	// Assign the default roles to users without roles
	err = lib.AssignDefaultRolesToUsersWithoutRoles(d)
	if err != nil {
		t.Fatalf("Failed to assign default roles to user: %v", err)
	}

	// Get list of all workspace users and verify they have roles
	var workspaceUsers []db.WorkspaceUser
	if err = d.Preload("Roles").Find(&workspaceUsers).Error; err != nil {
		t.Fatalf("Failed to get workspace users: %v", err)
	}

	// Verify that each user has at least one role
	for _, user := range workspaceUsers {
		assert.True(t, len(user.Roles) > 0)
	}
}
