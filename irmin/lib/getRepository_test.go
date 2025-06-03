package lib_test

import (
	"irmin-api/lib"
	"log/slog"
	"os"
	"testing"

	"github.com/zeebo/assert"
)

func TestGetRepository(t *testing.T) {
	lib.WithTestSuite(t, func(ts *lib.TestSuite) {
		// Create slog logger for testing
		logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

		// Create a context
		ctx := t.Context()

		// Find the test workspace
		workspace, err := ts.DB.GetWorkspaceBySlug(ts.Env.TestWorkspace)
		if err != nil {
			t.Fatalf("Failed to get test workspace: %v", err)
		}

		// Get the repository ignoring the cache
		repository, err := lib.GetRepository(
			ctx,
			"en",
			ts.DB,
			logger,
			ts.Env,
			workspace,
			ts.Env.TestRepository,
			true,
		)
		if err != nil {
			t.Fatalf("Failed to get repository ignoring cache: %v", err)
		}
		assert.NotNil(t, repository)
		assert.Equal(t, repository.Slug, ts.Env.TestRepository)
		assert.Equal(t, repository.WorkspaceID, workspace.ID)

		// Get the repository using the cache
		repositoryCached, err := lib.GetRepository(
			ctx,
			"en",
			ts.DB,
			logger,
			ts.Env,
			workspace,
			ts.Env.TestRepository,
			false,
		)
		if err != nil {
			t.Fatalf("Failed to get repository using cache: %v", err)
		}
		assert.DeepEqual(t, repository, repositoryCached)
	})
}
