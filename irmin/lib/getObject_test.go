package lib_test

import (
	"irmin-api/lib"
	"log/slog"
	"os"
	"testing"

	"github.com/zeebo/assert"
)

func TestGetObject(t *testing.T) {
	ts := lib.GetTestSuite()
	// Create slog logger for testing
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	// Create a context
	ctx := t.Context()

	// Find the test workspace
	workspace, err := ts.DB.GetWorkspaceBySlug(ts.Env.TestWorkspace)
	if err != nil {
		t.Fatalf("Failed to get test workspace: %v", err)
	}

	// Find the test repository
	repository, err := ts.DB.GetRepositoryBySlugAndWorkspaceID(ts.Env.TestRepository, workspace.ID)
	if err != nil {
		t.Fatalf("Failed to get test repository: %v", err)
	}

	// Get the object ignoring the cache
	object, err := lib.GetObject(
		ctx,
		"en",
		ts.DB,
		logger,
		ts.Env,
		workspace,
		repository,
		ts.Env.TestObjectName,
		ts.Env.TestBranch,
		true,
	)
	if err != nil {
		t.Fatalf("Failed to get object ignoring cache: %v", err)
	}
	assert.NotNil(t, object)
	assert.Equal(t, object.Name, ts.Env.TestObjectName)
	assert.Equal(t, object.RepositoryRef, ts.Env.TestBranch)
	assert.Equal(t, object.RepositoryID, repository.ID)

	// Get the object using the cache
	objectCached, err := lib.GetObject(
		ctx,
		"en",
		ts.DB,
		logger,
		ts.Env,
		workspace,
		repository,
		ts.Env.TestObjectName,
		ts.Env.TestBranch,
		false,
	)
	if err != nil {
		t.Fatalf("Failed to get object using cache: %v", err)
	}
	assert.Equal(t, objectCached.ID, object.ID)
	assert.Equal(t, objectCached.PhysicalAddress, object.PhysicalAddress)
	assert.Equal(t, objectCached.Type, object.Type)
	assert.Equal(t, objectCached.ContentType, object.ContentType)
}
