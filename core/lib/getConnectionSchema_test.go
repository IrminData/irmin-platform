package lib_test

import (
	"irmin-api/lib"
	"log/slog"
	"os"
	"testing"

	"github.com/zeebo/assert"
)

func TestGetConnectionSchema(t *testing.T) {
	ts := lib.GetTestSuite()

	// Skip if test data is not available
	_, workspace := lib.SkipIfNoTestData(t, ts.DB, ts.Env.TestUserEmail, ts.Env.TestWorkspace)

	// Find a list of connections
	connections, err := ts.DB.GetConnectionsByWorkspaceID(workspace.ID)
	if err != nil {
		t.Fatalf("Failed to get connections: %v", err)
	}

	// Skip if no connections available
	if len(connections) == 0 {
		t.Skip("Skipping test: no connections found in test workspace")
	}

	// Get the first connection
	connection := connections[0]

	// Create slog logger for testing
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	// Get a context
	ctx := t.Context()

	// Create a schema cache manager
	schemaCacheManager := lib.NewSchemaCacheManager(ts.Env, logger, ts.DB)

	// Get the pull schema
	schemaPull, pullSchemaErr := schemaCacheManager.GetConnectionSchema(ctx, &connection, "pull", "", "en", true)
	if pullSchemaErr != nil {
		t.Fatalf("Failed to get connection pull schema: %v", pullSchemaErr)
	}
	assert.NotNil(t, schemaPull)

	// Get the push schema
	schemaPush, pushSchemaErr := schemaCacheManager.GetConnectionSchema(ctx, &connection, "push", "", "en", true)
	if pushSchemaErr != nil {
		t.Fatalf("Failed to get connection push schema: %v", pushSchemaErr)
	}
	assert.NotNil(t, schemaPush)

	// Get the pull schema not ignoring the cache
	schemaPullCached, pullCachedSchemaErr := schemaCacheManager.GetConnectionSchema(
		ctx,
		&connection,
		"pull",
		"",
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
		"",
		"en",
		false,
	)
	if pushCachedSchemaErr != nil {
		t.Fatalf("Failed to get connection push schema: %v", pushCachedSchemaErr)
	}
	assert.NotNil(t, schemaPushCached)
	assert.DeepEqual(t, schemaPush, schemaPushCached)
}
