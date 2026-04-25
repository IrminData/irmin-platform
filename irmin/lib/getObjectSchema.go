package lib

import (
	"context"
	"errors"
	"fmt"
	"time"

	"irmin-api/db"
	"irmin-api/engine"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"gorm.io/gorm"
)

const (
	// ObjectSchemaCacheMaxAge is the maximum age of an object schema cache entry.
	ObjectSchemaCacheMaxAge = 30 * time.Minute
)

var (
	// ErrObjectSchemaCacheNotFound is returned when an object schema cache entry is not found.
	ErrObjectSchemaCacheNotFound = errors.New("object schema cache not found")
)

// checkObjectSchemaCache checks if there's a valid cached schema and returns it if found.
func (scm *SchemaCacheManager) checkObjectSchemaCache(
	ctx context.Context,
	repository *db.Repository,
	objectPath, ref string,
) *irminmodels.ObjectSchema {
	schemaCache, err := scm.db.FindRepositorySchemaCache(repository.ID, objectPath, ref)
	if err != nil {
		scm.logger.WarnContext(ctx, "failed to find schema cache", "error", err)
		return nil
	}

	if schemaCache != nil && time.Since(schemaCache.UpdatedAt) < ObjectSchemaCacheMaxAge {
		return schemaCache.Schema
	}

	return nil
}

// findRepositorySchemaCacheWithTx finds a repository schema cache using the provided transaction.
func (scm *SchemaCacheManager) findRepositorySchemaCacheWithTx(
	tx *gorm.DB,
	repositoryID uint,
	objectPath, ref string,
) (*db.RepositorySchemaCache, error) {
	var schemaCache db.RepositorySchemaCache
	err := tx.Where("repository_id = ? AND path = ? AND ref = ?", repositoryID, objectPath, ref).
		First(&schemaCache).
		Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrObjectSchemaCacheNotFound
		}
		return nil, err
	}
	return &schemaCache, nil
}

// updateObjectSchemaCacheWithTx updates the schema cache using the provided transaction.
func (scm *SchemaCacheManager) updateObjectSchemaCacheWithTx(
	ctx context.Context,
	tx *gorm.DB,
	schemaCache *db.RepositorySchemaCache,
	schema *irminmodels.ObjectSchema,
	repository *db.Repository,
	objectPath, ref string,
) {
	if schemaCache != nil {
		schemaCache.Schema = schema
	} else {
		schemaCache = &db.RepositorySchemaCache{
			Path:         objectPath,
			Ref:          ref,
			Schema:       schema,
			RepositoryID: repository.ID,
		}
	}

	if err := tx.Save(&schemaCache).Error; err != nil {
		scm.logger.ErrorContext(ctx, "error saving repository schema cache", "error", err)
	}
}

// GetObjectSchema returns the schema for an object.
// It first checks if the schema is cached, and if so, returns the cached schema.
// Otherwise, it fetches the schema from the Data Engine and caches it asynchronously.
func (scm *SchemaCacheManager) GetObjectSchema(
	ctx context.Context,
	workspace *db.Workspace,
	repository *db.Repository,
	object *db.RepositoryObject,
	ref, locale string,
	ignoreCache bool,
) (*irminmodels.ObjectSchema, error) {
	// Check cache first
	if !ignoreCache {
		if cachedSchema := scm.checkObjectSchemaCache(ctx, repository, object.Path, ref); cachedSchema != nil {
			return cachedSchema, nil
		}
	}

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(ctx, scm.logger, scm.env, scm.db)
	if err != nil {
		scm.logger.ErrorContext(ctx, "error creating data engine client", "error", err)
		return nil, err
	}

	// Get the schema of the object in the repository at ref
	// Note: We pass nil for user because this method assumes permissions have already been checked by the caller
	// or are not applicable (e.g. background process). If permissions need to be enforced during schema generation
	// (which uses DuckDB), the caller should ensure permissions are valid.
	// Since scm.GetObjectSchema does not take a user argument, we cannot pass it here.
	schema, err := dataEngine.GenerateObjectSchema(ctx, nil, workspace, repository.Slug, object.Path, ref)
	if err != nil {
		scm.logger.ErrorContext(ctx, "error getting object schema", "error", err)
		return nil, fmt.Errorf("failed to get object schema: %w", err)
	}

	// Update cache asynchronously with advisory lock to prevent race conditions
	go scm.updateObjectSchemaCacheAsync(ctx, repository, object.Path, ref, schema)

	return schema, nil
}

// updateObjectSchemaCacheAsync updates the object schema cache asynchronously with advisory lock.
func (scm *SchemaCacheManager) updateObjectSchemaCacheAsync(
	ctx context.Context,
	repository *db.Repository,
	objectPath, ref string,
	schema *irminmodels.ObjectSchema,
) {
	// Create a lock key based on repository, path, and ref to prevent race conditions
	lockKey := fmt.Sprintf("object_schema_cache_update:%d:%s:%s", repository.ID, objectPath, ref)

	// Execute the cache update within a database transaction with advisory lock
	transactionErr := scm.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Acquire advisory lock to prevent concurrent cache updates for the same object
		if lockErr := db.LockKeyTx(tx, lockKey); lockErr != nil {
			scm.logger.WarnContext(
				ctx,
				"failed to acquire advisory lock for object schema cache update",
				"error",
				lockErr,
			)
			return lockErr
		}

		// Find existing cache entry
		schemaCache, err := scm.findRepositorySchemaCacheWithTx(tx, repository.ID, objectPath, ref)
		if err != nil && !errors.Is(err, ErrObjectSchemaCacheNotFound) {
			scm.logger.WarnContext(ctx, "failed to find schema cache for update", "error", err)
		}

		// Only update cache if it doesn't exist or is stale
		shouldUpdate := schemaCache == nil || time.Since(schemaCache.UpdatedAt) >= ObjectSchemaCacheMaxAge

		if shouldUpdate {
			// Update cache
			scm.updateObjectSchemaCacheWithTx(ctx, tx, schemaCache, schema, repository, objectPath, ref)
		}
		return nil
	})

	if transactionErr != nil {
		scm.logger.ErrorContext(ctx, "error updating object schema cache", "error", transactionErr)
	}
}
