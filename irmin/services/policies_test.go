package services_test

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"testing"

	"irmin-api/db"
	"irmin-api/lib"
	"irmin-api/permissions"
	"irmin-api/services"

	"github.com/zeebo/assert"
	"gorm.io/gorm"
)

// TestPolicyConflictHandling tests the policy conflict detection and replacement logic
// at the database level using the "everyone" principal (which doesn't require role or user IDs).
func TestPolicyConflictHandling(t *testing.T) {
	ts := lib.GetTestSuite()
	if ts == nil {
		t.Skip("Test suite not initialized, skipping policy conflict tests")
	}

	// Find the test workspace
	workspace, err := ts.DB.GetWorkspaceBySlug(ts.Env.TestWorkspace)
	if err != nil {
		t.Fatalf("Failed to get test workspace: %v", err)
	}

	// Find the workspace owner user (who has permission to manage policies)
	owner, err := ts.DB.GetUser(workspace.OwnerID)
	if err != nil {
		t.Fatalf("Failed to get workspace owner: %v", err)
	}

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	ps := permissions.NewService(ts.DB, logger)

	// Create a minimal APIServices for testing
	api := &services.APIServices{
		DB:                ts.DB,
		Logger:            logger,
		Env:               ts.Env,
		PermissionService: ps,
	}

	// Cleanup function to remove test policies
	cleanup := func() {
		_ = ts.DB.Model(&db.Policy{}).
			Where("workspace_id = ? AND resource = ? AND principal = ?",
				workspace.ID,
				db.PolicyResourceRepository,
				db.PolicyPrincipalEveryone).
			Delete(&db.Policy{}).Error
	}
	defer cleanup()

	ctx := context.Background()

	t.Run("create new policy succeeds", func(t *testing.T) {
		cleanup()

		newPolicy := &db.Policy{
			WorkspaceID: workspace.ID,
			Effect:      db.PolicyEffectAllow,
			Action:      db.PolicyActionRead,
			Resource:    db.PolicyResourceRepository,
			Principal:   db.PolicyPrincipalEveryone,
		}

		replaced, createErr := services.ExportCreatePolicyInTransaction(api, ctx, workspace, newPolicy)
		assert.NoError(t, createErr)
		assert.False(t, replaced)
		assert.True(t, newPolicy.ID > 0)
	})

	t.Run("creating same policy returns error", func(t *testing.T) {
		cleanup()

		// Create the policy first time
		policy1 := &db.Policy{
			WorkspaceID: workspace.ID,
			Effect:      db.PolicyEffectAllow,
			Action:      db.PolicyActionCreate,
			Resource:    db.PolicyResourceRepository,
			Principal:   db.PolicyPrincipalEveryone,
		}
		_, createErr := services.ExportCreatePolicyInTransaction(api, ctx, workspace, policy1)
		assert.NoError(t, createErr)

		// Try to create the same policy again
		policy2 := &db.Policy{
			WorkspaceID: workspace.ID,
			Effect:      db.PolicyEffectAllow, // Same effect
			Action:      db.PolicyActionCreate,
			Resource:    db.PolicyResourceRepository,
			Principal:   db.PolicyPrincipalEveryone,
		}
		_, dupErr := services.ExportCreatePolicyInTransaction(api, ctx, workspace, policy2)
		assert.Error(t, dupErr)
		assert.True(t, services.IsPolicyAlreadyExistsError(dupErr))
	})

	t.Run("conflicting policy replaces existing one", func(t *testing.T) {
		cleanup()

		// Create an allow policy
		allowPolicy := &db.Policy{
			WorkspaceID: workspace.ID,
			Effect:      db.PolicyEffectAllow,
			Action:      db.PolicyActionUpdate,
			Resource:    db.PolicyResourceRepository,
			Principal:   db.PolicyPrincipalEveryone,
		}
		replaced, createErr := services.ExportCreatePolicyInTransaction(api, ctx, workspace, allowPolicy)
		assert.NoError(t, createErr)
		assert.False(t, replaced)
		originalPolicyID := allowPolicy.ID

		// Create a deny policy for the same combination - should replace the allow policy
		denyPolicy := &db.Policy{
			WorkspaceID: workspace.ID,
			Effect:      db.PolicyEffectDeny, // Different effect
			Action:      db.PolicyActionUpdate,
			Resource:    db.PolicyResourceRepository,
			Principal:   db.PolicyPrincipalEveryone,
		}
		replaced, replaceErr := services.ExportCreatePolicyInTransaction(api, ctx, workspace, denyPolicy)
		assert.NoError(t, replaceErr)
		assert.True(t, replaced)

		// The policy ID should remain the same (replacement, not creation)
		assert.Equal(t, originalPolicyID, denyPolicy.ID)

		// Verify there's only one policy for this combination
		var policies []db.Policy
		findErr := ts.DB.Where(
			"workspace_id = ? AND action = ? AND resource = ? AND principal = ?",
			workspace.ID,
			db.PolicyActionUpdate,
			db.PolicyResourceRepository,
			db.PolicyPrincipalEveryone,
		).Find(&policies).Error
		assert.NoError(t, findErr)
		assert.Equal(t, 1, len(policies))
		assert.Equal(t, db.PolicyEffectDeny, policies[0].Effect)
	})

	t.Run("resource-specific policy conflict replacement", func(t *testing.T) {
		cleanup()

		// Get a repository for testing resource-specific policies
		var repo db.Repository
		repoErr := ts.DB.Where("workspace_id = ?", workspace.ID).First(&repo).Error
		if repoErr != nil {
			t.Skip("No repositories found, skipping resource-specific test")
		}

		// Create an allow policy for a specific repository
		allowPolicy := &db.Policy{
			WorkspaceID: workspace.ID,
			Effect:      db.PolicyEffectAllow,
			Action:      db.PolicyActionDelete,
			Resource:    db.PolicyResourceRepository,
			Principal:   db.PolicyPrincipalEveryone,
			ResourceID:  &repo.ID,
		}
		replaced, createErr := services.ExportCreatePolicyInTransaction(api, ctx, workspace, allowPolicy)
		assert.NoError(t, createErr)
		assert.False(t, replaced)
		originalID := allowPolicy.ID

		// Create a deny policy for the same resource-specific combination
		denyPolicy := &db.Policy{
			WorkspaceID: workspace.ID,
			Effect:      db.PolicyEffectDeny,
			Action:      db.PolicyActionDelete,
			Resource:    db.PolicyResourceRepository,
			Principal:   db.PolicyPrincipalEveryone,
			ResourceID:  &repo.ID,
		}
		replaced, replaceErr := services.ExportCreatePolicyInTransaction(api, ctx, workspace, denyPolicy)
		assert.NoError(t, replaceErr)
		assert.True(t, replaced)
		assert.Equal(t, originalID, denyPolicy.ID)
	})

	t.Run("different resource IDs are not conflicts", func(t *testing.T) {
		cleanup()

		// Create a policy for all repositories (nil ResourceID)
		globalPolicy := &db.Policy{
			WorkspaceID: workspace.ID,
			Effect:      db.PolicyEffectAllow,
			Action:      db.PolicyActionRead,
			Resource:    db.PolicyResourceRepository,
			Principal:   db.PolicyPrincipalEveryone,
			ResourceID:  nil,
		}
		replaced, createErr := services.ExportCreatePolicyInTransaction(api, ctx, workspace, globalPolicy)
		assert.NoError(t, createErr)
		assert.False(t, replaced)
		globalPolicyID := globalPolicy.ID

		// Get a repository for testing resource-specific policies
		var repo db.Repository
		repoErr := ts.DB.Where("workspace_id = ?", workspace.ID).First(&repo).Error
		if repoErr != nil {
			t.Skip("No repositories found, skipping test")
		}

		// Create a policy for a specific repository - should NOT conflict with global
		specificPolicy := &db.Policy{
			WorkspaceID: workspace.ID,
			Effect:      db.PolicyEffectDeny, // Different effect, but different scope
			Action:      db.PolicyActionRead,
			Resource:    db.PolicyResourceRepository,
			Principal:   db.PolicyPrincipalEveryone,
			ResourceID:  &repo.ID,
		}
		replaced, specificErr := services.ExportCreatePolicyInTransaction(api, ctx, workspace, specificPolicy)
		assert.NoError(t, specificErr)
		assert.False(t, replaced) // Should be a new policy, not a replacement

		// Both policies should exist
		assert.NotEqual(t, globalPolicyID, specificPolicy.ID)

		var policies []db.Policy
		findErr := ts.DB.Where(
			"workspace_id = ? AND action = ? AND resource = ? AND principal = ?",
			workspace.ID,
			db.PolicyActionRead,
			db.PolicyResourceRepository,
			db.PolicyPrincipalEveryone,
		).Find(&policies).Error
		assert.NoError(t, findErr)
		assert.Equal(t, 2, len(policies))
	})

	// Verify owner still exists (used in setup)
	assert.NotNil(t, owner)
}

// TestIsPolicyAlreadyExistsError tests the error helper function.
func TestIsPolicyAlreadyExistsError(t *testing.T) {
	t.Run("returns true for ErrPolicyAlreadyExists", func(t *testing.T) {
		err := services.ErrPolicyAlreadyExists
		assert.True(t, services.IsPolicyAlreadyExistsError(err))
	})

	t.Run("returns true for wrapped ErrPolicyAlreadyExists", func(t *testing.T) {
		wrappedErr := errors.New("outer error")
		// Use errors.Join to wrap
		joinedErr := errors.Join(wrappedErr, services.ErrPolicyAlreadyExists)
		assert.True(t, services.IsPolicyAlreadyExistsError(joinedErr))
	})

	t.Run("returns false for different errors", func(t *testing.T) {
		err := errors.New("some other error")
		assert.False(t, services.IsPolicyAlreadyExistsError(err))
	})

	t.Run("returns false for nil", func(t *testing.T) {
		assert.False(t, services.IsPolicyAlreadyExistsError(nil))
	})

	t.Run("returns false for gorm.ErrRecordNotFound", func(t *testing.T) {
		assert.False(t, services.IsPolicyAlreadyExistsError(gorm.ErrRecordNotFound))
	})
}
