package lib_test

import (
	"irmin-api/lib"
	"testing"

	"github.com/zeebo/assert"
)

func TestSeedRoles(t *testing.T) {
	ts := lib.GetTestSuite()

	// Seed the roles
	err := lib.SeedRoles(ts.DB)
	if err != nil {
		t.Fatalf("Failed to seed roles: %v", err)
	}

	// Make sure the roles are seeded
	roles, err := ts.DB.GetRoles()
	if err != nil {
		t.Fatalf("Failed to get all roles: %v", err)
	}

	assert.Equal(t, len(roles), 6)

	// Make sure we have one default role
	defaultRole, err := ts.DB.GetDefaultRole()
	if err != nil {
		t.Fatalf("Failed to get default role: %v", err)
	}

	assert.Equal(t, defaultRole.Role, "viewer")

	// Make sure we have one owner role
	ownerRole, err := ts.DB.GetOwnerRole()
	if err != nil {
		t.Fatalf("Failed to get owner role: %v", err)
	}

	assert.Equal(t, ownerRole.Role, "owner")
}
