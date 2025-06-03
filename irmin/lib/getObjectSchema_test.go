package lib_test

import (
	"irmin-api/lib"
	"log/slog"
	"os"
	"testing"

	"github.com/zeebo/assert"
)

func TestGetObjectSchema(t *testing.T) {
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

	// Create a schema cache manager
	schemaCacheManager := lib.NewSchemaCacheManager(ts.Env, logger, ts.DB)

	// Find the test object
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
		t.Fatalf("Failed to get test object: %v", err)
	}

	// Get the object schema ignoring the cache
	objectSchema, err := schemaCacheManager.GetObjectSchema(
		ctx,
		workspace,
		repository,
		object,
		ts.Env.TestBranch,
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
		ts.Env.TestBranch,
		"en",
		false,
	)
	if err != nil {
		t.Fatalf("Failed to get object using cache: %v", err)
	}

	// Compare schemas by value instead of by pointer
	assert.Equal(t, objectSchema.Name, objectCachedSchema.Name)
	assert.Equal(t, objectSchema.Path, objectCachedSchema.Path)
	assert.Equal(t, objectSchema.Type, objectCachedSchema.Type)
	if objectSchema.LastModified != nil {
		assert.Equal(t, *objectSchema.LastModified, *objectCachedSchema.LastModified)
	}
	if objectSchema.Description != nil {
		assert.Equal(t, *objectSchema.Description, *objectCachedSchema.Description)
	}
	if objectSchema.Schema != nil {
		// Compare schema fields individually to handle nil vs empty slices
		assert.Equal(t, objectSchema.Schema.Type, objectCachedSchema.Schema.Type)
		assert.Equal(t, objectSchema.Schema.Properties, objectCachedSchema.Schema.Properties)
		assert.Equal(t, len(objectSchema.Schema.Required), len(objectCachedSchema.Schema.Required))
		if len(objectSchema.Schema.Required) > 0 {
			assert.Equal(t, objectSchema.Schema.Required, objectCachedSchema.Schema.Required)
		}
		assert.Equal(t, objectSchema.Schema.Items, objectCachedSchema.Schema.Items)
		assert.Equal(t, objectSchema.Schema.Description, objectCachedSchema.Schema.Description)
		assert.Equal(t, objectSchema.Schema.Default, objectCachedSchema.Schema.Default)
		assert.Equal(t, objectSchema.Schema.Enum, objectCachedSchema.Schema.Enum)
		assert.Equal(t, objectSchema.Schema.AdditionalProperties, objectCachedSchema.Schema.AdditionalProperties)
		assert.Equal(t, objectSchema.Schema.Format, objectCachedSchema.Schema.Format)
		assert.Equal(t, objectSchema.Schema.Minimum, objectCachedSchema.Schema.Minimum)
		assert.Equal(t, objectSchema.Schema.Maximum, objectCachedSchema.Schema.Maximum)
		assert.Equal(t, objectSchema.Schema.MinLength, objectCachedSchema.Schema.MinLength)
		assert.Equal(t, objectSchema.Schema.MaxLength, objectCachedSchema.Schema.MaxLength)
		assert.Equal(t, objectSchema.Schema.Pattern, objectCachedSchema.Schema.Pattern)
	}
	if objectSchema.Size != nil {
		assert.Equal(t, *objectSchema.Size, *objectCachedSchema.Size)
	}
	if objectSchema.ContentType != nil {
		assert.Equal(t, *objectSchema.ContentType, *objectCachedSchema.ContentType)
	}
	assert.Equal(t, objectSchema.Children, objectCachedSchema.Children)
	if objectSchema.Restrictions != nil {
		assert.Equal(t, *objectSchema.Restrictions, *objectCachedSchema.Restrictions)
	}
}
