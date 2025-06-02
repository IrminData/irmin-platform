package lib_test

import (
	"irmin-api/lib"
	"irmin-api/tests"
	"log/slog"
	"os"
	"testing"

	"github.com/zeebo/assert"
)

func TestGetObjectSchema(t *testing.T) {
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

	// Find the test repository
	repository, err := d.GetRepositoryBySlugAndWorkspaceID(env.TestRepository, workspace.ID)
	if err != nil {
		t.Fatalf("Failed to get test repository: %v", err)
	}

	// Create a schema cache manager
	schemaCacheManager := lib.NewSchemaCacheManager(env, logger, d)

	// Find the test object
	object, err := lib.GetObject(
		ctx,
		"en",
		d,
		logger,
		env,
		workspace,
		repository,
		env.TestObjectName,
		env.TestBranch,
		true,
	)
	if err != nil {
		t.Fatalf("Failed to get test object: %v", err)
	}

	// Get the object schema ignoring the cache
	objectSchema, err := schemaCacheManager.GetObjectSchema(
		ctx,
		workspace,
		repository,
		object,
		env.TestBranch,
		"en",
		true,
	)
	if err != nil {
		t.Fatalf("Failed to get object ignoring cache: %v", err)
	}
	assert.NotNil(t, objectSchema)
	assert.Equal(t, objectSchema.Path, object.Path)
	assert.Equal(t, objectSchema.Type, object.Type)
	assert.Equal(t, objectSchema.ContentType, &object.ContentType)

	// Get the object using the cache
	objectCachedSchema, err := schemaCacheManager.GetObjectSchema(
		ctx,
		workspace,
		repository,
		object,
		env.TestBranch,
		"en",
		false,
	)
	if err != nil {
		t.Fatalf("Failed to get object using cache: %v", err)
	}
	assert.DeepEqual(t, objectSchema, objectCachedSchema)
}
