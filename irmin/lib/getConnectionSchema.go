package lib

import (
	"context"
	"fmt"
	"irmin-api/db"
	"irmin-api/engine"
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

const (
	// ConnectionSchemaCacheMaxAge is the maximum age of a connection schema cache entry.
	ConnectionSchemaCacheMaxAge = 12 * time.Hour
)

// checkConnectionSchemaCache checks if there's a valid cached schema and returns it if found.
func (scm *SchemaCacheManager) checkConnectionSchemaCache(
	ctx context.Context,
	connection *db.Connection,
	operationMethod string,
) *irminmodels.ObjectSchema {
	schemaCache, err := scm.db.FindConnectionSchemaCache(connection.ID, operationMethod)
	if err != nil {
		scm.logger.ErrorContext(ctx, "warning: error finding schema cache", "error", err)
		return nil
	}

	if schemaCache != nil && time.Since(schemaCache.UpdatedAt) < ConnectionSchemaCacheMaxAge {
		return schemaCache.Schema
	}

	return nil
}

// updateConnectionSchemaCache updates the schema cache asynchronously.
func (scm *SchemaCacheManager) updateConnectionSchemaCache(
	ctx context.Context,
	schemaCache *db.ConnectionSchemaCache,
	schema *irminmodels.ObjectSchema,
	connection *db.Connection,
	operationMethod string,
) {
	if schemaCache != nil {
		schemaCache.Schema = schema
	} else {
		schemaCache = &db.ConnectionSchemaCache{
			Schema:       schema,
			OpMethod:     &operationMethod,
			ConnectionID: connection.ID,
		}
	}

	if err := scm.db.Save(&schemaCache).Error; err != nil {
		scm.logger.ErrorContext(ctx, "error saving connection schema cache", "error", err)
	}
}

// GetConnectionSchema returns the schema for a connection.
// It first checks if the schema is cached, and if so, returns the cached schema.
// Otherwise, it fetches the schema from the Data Engine and caches it.
// The cache is updated in a goroutine to avoid blocking the main thread.
func (scm *SchemaCacheManager) GetConnectionSchema(
	ctx context.Context,
	connection *db.Connection,
	operationMethod, locale string,
) (*irminmodels.ObjectSchema, error) {
	// Check cache first
	if cachedSchema := scm.checkConnectionSchemaCache(ctx, connection, operationMethod); cachedSchema != nil {
		return cachedSchema, nil
	}

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(ctx, locale, scm.logger, scm.env)
	if err != nil {
		scm.logger.ErrorContext(ctx, "error creating data engine client", "error", err)
		return nil, err
	}

	// Get the schema of the connection
	schema, err := dataEngine.DataMovementSchema(connection, operationMethod)
	if err != nil {
		scm.logger.ErrorContext(ctx, "error getting connection schema", "error", err)
		return nil, err
	}

	// Create a unique key for this cache entry
	cacheKey := fmt.Sprintf("%d-%s", connection.ID, operationMethod)

	// Update cache asynchronously if we can acquire the mutex
	if acquired, release := scm.GetConnectionMutex(cacheKey); acquired {
		defer release()
		schemaCache, _ := scm.db.FindConnectionSchemaCache(connection.ID, operationMethod)
		go scm.updateConnectionSchemaCache(ctx, schemaCache, schema, connection, operationMethod)
	}

	return schema, nil
}
