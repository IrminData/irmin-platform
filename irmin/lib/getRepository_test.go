package lib_test

import (
	"irmin-api/lib"
	"irmin-api/tests"
	"log/slog"
	"os"
	"testing"

	"github.com/zeebo/assert"
)

func TestGetRepository(t *testing.T) {
	env, d, err := tests.InitTestEnv()
	if err != nil {
		t.Fatalf("Failed to initialise test environment: %v", err)
	}

	// Create slog logger for testing
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	// Create a context
	ctx := t.Context()

	// Find the test workspace
	workspace, err := d.GetWorkspaceBySlug(env.TestWorkspace)
	if err != nil {
		t.Fatalf("Failed to get test workspace: %v", err)
	}

	// Get the repository ignoring the cache
	repository, err := lib.GetRepository(
		ctx,
		"en",
		d,
		logger,
		env,
		workspace,
		env.TestRepository,
		true,
	)
	if err != nil {
		t.Fatalf("Failed to get repository ignoring cache: %v", err)
	}
	assert.NotNil(t, repository)
	assert.Equal(t, repository.Slug, env.TestRepository)
	assert.Equal(t, repository.WorkspaceID, workspace.ID)

	// Get the repository using the cache
	repositoryCached, err := lib.GetRepository(
		ctx,
		"en",
		d,
		logger,
		env,
		workspace,
		env.TestRepository,
		false,
	)
	if err != nil {
		t.Fatalf("Failed to get repository using cache: %v", err)
	}
	assert.DeepEqual(t, repository, repositoryCached)
}
