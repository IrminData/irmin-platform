package lib

import (
	"errors"
	"irmin-api/db"
	"testing"

	"gorm.io/gorm"
)

// SkipIfNoTestData skips the test if required test data is not available.
// This allows tests to run in CI/CD without requiring a fully seeded database.
func SkipIfNoTestData(
	t *testing.T,
	database *db.Database,
	testUserEmail, testWorkspace string,
) (*db.User, *db.Workspace) {
	t.Helper()

	// Try to find the test user
	user, userErr := database.GetUserByEmail(testUserEmail)
	if userErr != nil {
		if errors.Is(userErr, gorm.ErrRecordNotFound) {
			t.Skipf(
				"Skipping test: test user '%s' not found in database. "+
					"This is expected in environments without seeded test data.",
				testUserEmail,
			)
		}
		t.Fatalf("Error checking for test user: %v", userErr)
	}

	// Try to find the test workspace
	workspace, workspaceErr := database.GetWorkspaceBySlug(testWorkspace)
	if workspaceErr != nil {
		if errors.Is(workspaceErr, gorm.ErrRecordNotFound) {
			t.Skipf(
				"Skipping test: test workspace '%s' not found in database. "+
					"This is expected in environments without seeded test data.",
				testWorkspace,
			)
		}
		t.Fatalf("Error checking for test workspace: %v", workspaceErr)
	}

	return user, workspace
}

// SkipIfNoTestRepository skips the test if the test repository is not available.
func SkipIfNoTestRepository(
	t *testing.T,
	database *db.Database,
	workspaceID uint,
	testRepository string,
) *db.Repository {
	t.Helper()

	// Try to find the test repository
	repository, repoErr := database.GetRepositoryBySlugAndWorkspaceID(testRepository, workspaceID)
	if repoErr != nil {
		if errors.Is(repoErr, gorm.ErrRecordNotFound) {
			t.Skipf(
				"Skipping test: test repository '%s' not found in workspace. "+
					"This is expected in environments without seeded test data.",
				testRepository,
			)
		}
		t.Fatalf("Error checking for test repository: %v", repoErr)
	}

	return repository
}
