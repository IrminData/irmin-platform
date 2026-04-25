package lib

import (
	"context"
	"errors"
	"fmt"
	"irmin-api/db"
	"irmin-api/engine"
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"gorm.io/gorm"
)

const (
	// ConnectionSchemaCacheMaxAge is the maximum age of a connection schema cache entry.
	ConnectionSchemaCacheMaxAge = 12 * time.Hour
)

var (
	// ErrConnectionSchemaCacheNotFound is returned when a connection schema cache entry is not found.
	ErrConnectionSchemaCacheNotFound = errors.New("connection schema cache not found")
)

// checkConnectionSchemaCache checks if there's a valid cached schema and returns it if found.
func (scm *SchemaCacheManager) checkConnectionSchemaCache(
	ctx context.Context,
	connection *db.Connection,
	operationMethod string,
) *irminmodels.ObjectSchema {
	schemaCache, err := scm.db.FindConnectionSchemaCache(connection.ID, operationMethod)
	if err != nil {
		scm.logger.WarnContext(ctx, "failed to find schema cache", "error", err)
		return nil
	}

	if schemaCache != nil && time.Since(schemaCache.UpdatedAt) < ConnectionSchemaCacheMaxAge {
		return schemaCache.Schema
	}

	return nil
}

// findConnectionSchemaCacheWithTx finds a connection schema cache using the provided transaction.
func (scm *SchemaCacheManager) findConnectionSchemaCacheWithTx(
	tx *gorm.DB,
	connectionID uint,
	operationMethod string,
) (*db.ConnectionSchemaCache, error) {
	var schemaCache db.ConnectionSchemaCache
	err := tx.Where("connection_id = ? AND op_method = ?", connectionID, operationMethod).First(&schemaCache).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrConnectionSchemaCacheNotFound
		}
		return nil, err
	}
	return &schemaCache, nil
}

// updateConnectionSchemaCacheWithTx updates the schema cache using the provided transaction.
func (scm *SchemaCacheManager) updateConnectionSchemaCacheWithTx(
	ctx context.Context,
	tx *gorm.DB,
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

	if err := tx.Save(&schemaCache).Error; err != nil {
		scm.logger.ErrorContext(ctx, "error saving connection schema cache", "error", err)
	}
}

// GetConnectionSchema returns the schema for a connection.
// It first checks if the schema is cached, and if so, returns the cached schema.
// Otherwise, it fetches the schema from the Data Engine and caches it asynchronously.
func (scm *SchemaCacheManager) GetConnectionSchema(
	ctx context.Context,
	connection *db.Connection,
	operationMethod, path, locale string,
	ignoreCache bool,
) (*irminmodels.ObjectSchema, error) {
	// Check cache first if fetching root schema
	if !ignoreCache && (path == "" || path == "/") {
		if cachedSchema := scm.checkConnectionSchemaCache(ctx, connection, operationMethod); cachedSchema != nil {
			return cachedSchema, nil
		}
	}

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(ctx, scm.logger, scm.env, scm.db)
	if err != nil {
		scm.logger.ErrorContext(ctx, "error creating data engine client", "error", err)
		return nil, err
	}

	// Get the schema of the connection
	schema, err := dataEngine.DataMovementSchema(ctx, connection, operationMethod, path)
	if err != nil {
		scm.logger.ErrorContext(ctx, "error getting connection schema", "error", err)
		return nil, err
	}

	// Only update cache if path is not the root path
	if path == "" || path == "/" {
		// Update cache asynchronously with advisory lock to prevent race conditions
		go scm.updateConnectionSchemaCacheAsync(ctx, connection, operationMethod, schema)
	}

	return schema, nil
}

// updateConnectionSchemaCacheAsync updates the connection schema cache asynchronously with advisory lock.
func (scm *SchemaCacheManager) updateConnectionSchemaCacheAsync(
	ctx context.Context,
	connection *db.Connection,
	operationMethod string,
	schema *irminmodels.ObjectSchema,
) {
	// Create a lock key based on connection ID and operation method to prevent race conditions
	lockKey := fmt.Sprintf("connection_schema_cache_update:%d:%s", connection.ID, operationMethod)

	// Execute the cache update within a database transaction with advisory lock
	transactionErr := scm.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Acquire advisory lock to prevent concurrent cache updates for the same connection and operation
		if lockErr := db.LockKeyTx(tx, lockKey); lockErr != nil {
			scm.logger.WarnContext(
				ctx,
				"failed to acquire advisory lock for connection schema cache update",
				"error",
				lockErr,
			)
			return lockErr
		}

		// Find existing cache entry
		schemaCache, err := scm.findConnectionSchemaCacheWithTx(tx, connection.ID, operationMethod)
		if err != nil && !errors.Is(err, ErrConnectionSchemaCacheNotFound) {
			scm.logger.WarnContext(ctx, "failed to find schema cache for update", "error", err)
		}

		// Only update cache if it doesn't exist or is stale
		shouldUpdate := schemaCache == nil || time.Since(schemaCache.UpdatedAt) >= ConnectionSchemaCacheMaxAge

		if shouldUpdate {
			// Update cache
			scm.updateConnectionSchemaCacheWithTx(ctx, tx, schemaCache, schema, connection, operationMethod)
		}
		return nil
	})

	if transactionErr != nil {
		scm.logger.ErrorContext(ctx, "error updating connection schema cache", "error", transactionErr)
	}
}
