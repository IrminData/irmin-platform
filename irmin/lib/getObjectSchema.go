package lib

import (
	"context"
	"fmt"
	"time"

	"irmin-api/db"
	"irmin-api/engine"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

const (
	// ObjectSchemaCacheMaxAge is the maximum age of an object schema cache entry.
	ObjectSchemaCacheMaxAge = 30 * time.Minute
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

// updateObjectSchemaCache updates the schema cache asynchronously.
func (scm *SchemaCacheManager) updateObjectSchemaCache(
	ctx context.Context,
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

	if err := scm.db.Save(&schemaCache).Error; err != nil {
		scm.logger.ErrorContext(ctx, "error saving repository schema cache", "error", err)
	}
}

// GetObjectSchema returns the schema for an object.
// It first checks if the schema is cached, and if so, returns the cached schema.
// Otherwise, it fetches the schema from the Data Engine and caches it.
// The cache is updated in a goroutine to avoid blocking the main thread.
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
	dataEngine, err := engine.NewClient(ctx, locale, scm.logger, scm.env)
	if err != nil {
		scm.logger.ErrorContext(ctx, "error creating data engine client", "error", err)
		return nil, err
	}

	// Get the schema of the object in the repository at ref
	schema, err := dataEngine.GenerateObjectSchema(ctx, workspace.Slug, repository.Slug, object.Path, ref)
	if err != nil {
		scm.logger.ErrorContext(ctx, "error getting object schema", "error", err)
		return nil, fmt.Errorf("failed to get object schema: %w", err)
	}

	// Create a unique key for this cache entry
	cacheKey := fmt.Sprintf("%d:%s:%s", repository.ID, object.Path, ref)

	// Update cache asynchronously if we can acquire the mutex
	if acquired, release := scm.GetObjectMutex(cacheKey); acquired {
		defer release()
		schemaCache, _ := scm.db.FindRepositorySchemaCache(repository.ID, object.Path, ref)
		go scm.updateObjectSchemaCache(ctx, schemaCache, schema, repository, object.Path, ref)
	}

	return schema, nil
}
