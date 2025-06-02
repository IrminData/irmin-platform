package lib_test

import (
	"irmin-api/lib"
	"irmin-api/tests"
	"log/slog"
	"os"
	"testing"

	"github.com/zeebo/assert"
)

func TestGetConnectionSchema(t *testing.T) {
	env, d, err := tests.InitTestEnv()
	if err != nil {
		t.Fatalf("Failed to initialise test environment: %v", err)
	}

	// Find the test workspace
	workspace, err := d.GetWorkspaceBySlug(env.TestWorkspace)
	if err != nil {
		t.Fatalf("Failed to get test workspace: %v", err)
	}

	// Find a list of connections
	connections, err := d.GetConnectionsByWorkspaceID(workspace.ID)
	if err != nil {
		t.Fatalf("Failed to get connections: %v", err)
	}

	// Make sure we have at least one connection
	if len(connections) == 0 {
		t.Fatalf("No connections found")
	}

	// Get the first connection
	connection := connections[0]

	// Create slog logger for testing
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	// Get a context
	ctx := t.Context()

	// Create a schema cache manager
	schemaCacheManager := lib.NewSchemaCacheManager(env, logger, d)

	// Get the pull schema
	schemaPull, pullSchemaErr := schemaCacheManager.GetConnectionSchema(ctx, &connection, "pull", "en", true)
	if pullSchemaErr != nil {
		t.Fatalf("Failed to get connection pull schema: %v", pullSchemaErr)
	}
	assert.NotNil(t, schemaPull)

	// Get the push schema
	schemaPush, pushSchemaErr := schemaCacheManager.GetConnectionSchema(ctx, &connection, "push", "en", true)
	if pushSchemaErr != nil {
		t.Fatalf("Failed to get connection push schema: %v", pushSchemaErr)
	}
	assert.NotNil(t, schemaPush)

	// Get the pull schema not ignoring the cache
	schemaPullCached, pullCachedSchemaErr := schemaCacheManager.GetConnectionSchema(
		ctx,
		&connection,
		"pull",
		"en",
		false,
	)
	if pullCachedSchemaErr != nil {
		t.Fatalf("Failed to get connection pull schema: %v", pullCachedSchemaErr)
	}
	assert.NotNil(t, schemaPullCached)
	assert.DeepEqual(t, schemaPull, schemaPullCached)

	// Get the push schema not ignoring the cache
	schemaPushCached, pushCachedSchemaErr := schemaCacheManager.GetConnectionSchema(
		ctx,
		&connection,
		"push",
		"en",
		false,
	)
	if pushCachedSchemaErr != nil {
		t.Fatalf("Failed to get connection push schema: %v", pushCachedSchemaErr)
	}
	assert.NotNil(t, schemaPushCached)
	assert.DeepEqual(t, schemaPush, schemaPushCached)
}
